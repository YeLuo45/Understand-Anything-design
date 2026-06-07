# Pipeline Stages

> 完整 `/understand` 命令背后的流水线

## 阶段 0 — Pre-flight

**触发**: `/understand [flags]`

**解析 flags**:
- `--full` — 强制重建，忽略 fingerprint 缓存
- `--only <phase>` — 只跑某一阶段
- `--since <commit>` — 增量从 commit 开始
- `--language <code>` — 输出语言 directive (e.g. `zh-CN`)

**创建目录**:
```bash
mkdir -p .understand-anything/intermediate
```

**检查 prerequisites**:
- Node.js >= 22
- pnpm >= 10
- @understand-anything/core 已 build

## 阶段 1 — Scan (project-scanner)

**Bundled scripts**:
1. `scan-project.mjs` — 列出所有 files，过滤 `.understandignore`
2. `extract-import-map.mjs` — 提取 import edges

**LLM**: 读 README + manifests → narrative fields

**Output**: `intermediate/scan-manifest.json`

```jsonc
{
  "version": "1.0.0",
  "phase": "scan",
  "project": {
    "name": "Understand Anything",
    "description": "...",
    "languages": ["typescript", "javascript", "python"],
    "frameworks": ["react", "fastapi"]
  },
  "files": [
    { "path": "src/index.ts", "language": "typescript", "lines": 234, "complexity": "moderate" }
  ],
  "stats": { "totalFiles": 247, "totalLines": 38921 }
}
```

**确定性** — 文件枚举、import 解析 100% 脚本，LLM 只补 narrative。

## 阶段 2 — File Analysis (file-analyzer)

**Bundled scripts**:
1. `extract-structure.mjs` — tree-sitter 解析 → StructuralAnalysis
2. `extract-import-map.mjs` — Phase 1 已生成，重读
3. `build-fingerprints.mjs` — AST signature hash
4. `compute-batches.mjs` — 按 size + complexity 分批

**LLM**: 每批并发调用 file-analyzer agent

**Output**: `intermediate/analysis-batch-{N}.json` (N 个文件 / 批)

```jsonc
// analysis-batch-0.json
{
  "version": "1.0.0",
  "phase": "analyze",
  "batchId": 0,
  "files": [...],
  "nodes": [
    {
      "id": "file:src/index.ts",
      "type": "file",
      "name": "index.ts",
      "summary": "Plugin entry point. Registers skills, agents, hooks.",
      "tags": ["entry", "plugin-manifest"],
      "complexity": "moderate"
    }
  ],
  "edges": [
    { "source": "file:src/index.ts", "target": "import:react", "type": "imports" }
  ]
}
```

**并行度**: 5-10 batches 同时跑，受 LLM rate limit 约束。

**Fingerprint 优化**:
```ts
if (file.fingerprint === manifest.fingerprints[file.path]) {
  // skip LLM — 重用上轮结果
}
```
未变化文件直接 skip，省 60%+ token。

## 阶段 3 — Architecture (architecture-analyzer)

**Bundled script**: LLM 写一个 Node.js 脚本（不需提交），分析 import graph

**LLM**: 读脚本输出 + 命名 layers

**Output**: 更新每个 file node 的 `belongs-to-layer` 边，写入 batch JSONs

```jsonc
{
  "id": "layer:api",
  "name": "API Layer",
  "description": "REST endpoints, request handlers, response formatters",
  "nodeIds": ["file:src/api/...", "file:src/server.ts"]
}
```

## 阶段 4 — Assembly (assemble-reviewer + graph-reviewer)

**Bundled scripts**:
1. `merge-batch-graphs.py` — 合并所有 batch JSONs
2. `merge-subdomain-graphs.py` — 按 subdomain 二次合并（可选）

**LLM (assemble-reviewer)**: 监督合并质量

**LLM (graph-reviewer)**: 最终质量审查

**LLM (tour-builder)**: 生成 onboarding 路径

**Output**: `knowledge-graph.json` (final, user-facing)

```jsonc
{
  "version": "1.0.0",
  "kind": "code",
  "project": { ... },
  "nodes": [...],      // 全部 dedup
  "edges": [...],      // dedup + 修复 dangling
  "layers": [...],     // 3-10 layer
  "tour": [...]        // 5-10 step
}
```

## 阶段 5 — Visualize (auto /understand-dashboard)

**触发**: `/understand` skill 完成后自动调 `/understand-dashboard`

**动作**:
- 启 Vite dev server
- 输出 URL + token
- 用户点 URL → 看图

## 中间产物生命周期

```
Phase 1 → scan-manifest.json
              ↓
Phase 2 → analysis-batch-*.json (×N, parallel write)
              ↓
Phase 3 → analysis-batch-*.json (UPDATE, 加 layer)
              ↓
Phase 4 → subdomain-graphs/*.json (parallel)
              ↓
       → assembled-graph.json
              ↓
       → knowledge-graph.json (final, user-facing)
              ↓
       → [delete intermediate]  ← Phase 4 完成后清理
```

`assembled-graph.json` 是只读 final；`intermediate/` 在 Phase 4 完成后删除（节省磁盘）。

## 错误恢复

任何 phase 失败：
1. 保留所有已写 intermediate 文件
2. 下次 `/understand` 自动从失败 phase 重启
3. fingerprint 缓存保证未受影响文件 skip

## 性能预算

| 项目规模 | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Total |
|----------|---------|---------|---------|---------|-------|
| 100 files | 5s | 30s | 10s | 15s | ~1min |
| 1k files | 20s | 5min | 30s | 1min | ~7min |
| 10k files | 2min | 30min | 3min | 5min | ~40min |

(LLM rate limit + tree-sitter WASM 性能)
