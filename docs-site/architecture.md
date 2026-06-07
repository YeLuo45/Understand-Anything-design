# Architecture

> Understand Anything 系统架构

## 1. 概览

Understand Anything 是 **monorepo + Claude Code 插件**，由两层组成：

| 层 | 路径 | 角色 |
|----|------|------|
| **Plugin Manifest** | `understand-anything-plugin/` | Claude Code / Cursor / Codex 插件清单 + skills + agents + hooks |
| **Plugin Packages** | `understand-anything-plugin/packages/{core, dashboard}` | 实际可执行代码 |

```
Understand-Anything/
├── understand-anything-plugin/        # Plugin manifest root
│   ├── .claude-plugin/                # Claude Code plugin.json
│   ├── .cursor-plugin/                # Cursor plugin.json
│   ├── .copilot-plugin/               # Copilot plugin.json
│   ├── agents/                        # 9 个 agent 描述（Markdown + YAML frontmatter）
│   ├── skills/                        # 7 个 skill (入口) + 10 个 mjs/py 脚本
│   ├── hooks/                         # auto-update-prompt hook
│   ├── src/                           # Skill TypeScript 入口
│   └── packages/
│       ├── core/                      # 共享分析引擎（135 TS 文件）
│       └── dashboard/                 # React + React Flow 知识图谱 UI
├── homepage/                          # 官方网站（Astro 6）
├── docs/                              # 用户文档源
├── install.sh / install.ps1           # 跨平台安装脚本
└── package.json                       # pnpm workspaces 根
```

## 2. 数据流

```
┌────────────────────────────────────────────────────────────────────┐
│                    User runs /understand                            │
└─────────────────┬──────────────────────────────────────────────────┘
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  Phase 1 — project-scanner (LLM + scan-project.mjs)                 │
│  Output: .understand-anything/intermediate/scan-manifest.json      │
└─────────────────┬──────────────────────────────────────────────────┘
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  Phase 2 — file-analyzer (parallel batches)                         │
│  - extract-import-map.mjs                                           │
│  - extract-structure.mjs (tree-sitter WASM)                         │
│  - build-fingerprints.mjs                                           │
│  - compute-batches.mjs                                              │
│  - LLM per batch: write .understand-anything/intermediate/          │
│                   analysis-batch-N.json                             │
└─────────────────┬──────────────────────────────────────────────────┘
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  Phase 3 — architecture-analyzer (LLM + script)                     │
│  Output: layer assignments in batch JSONs                           │
└─────────────────┬──────────────────────────────────────────────────┘
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  Phase 4 — assemble-reviewer + tour-builder                         │
│  - merge-batch-graphs.py                                            │
│  - merge-subdomain-graphs.py                                        │
│  - tour-builder (LLM): onboarding path                              │
│  - graph-reviewer: quality check                                    │
└─────────────────┬──────────────────────────────────────────────────┘
                  ▼
┌────────────────────────────────────────────────────────────────────┐
│  Output: .understand-anything/knowledge-graph.json                  │
│  /understand-dashboard skill launches the React UI to visualize     │
└────────────────────────────────────────────────────────────────────┘
```

## 3. 模块依赖

```
agents/* ─────► skills/understand-* ─► mjs/py scripts ─► packages/core
   │                   │                                          │
   │                   └─► LLM via platform's chat API            │
   │                                                              │
   └─► skills/understand-dashboard ─► packages/dashboard (Vite)   │
                                  ─► fetch /file-content.json     │
                                  ─► validates against graph path │
```

## 4. 关键设计原则

| 原则 | 实现 |
|------|------|
| **Deterministic > LLM** | tree-sitter WASM 解析、import map 解析、配置 parser 全脚本化；LLM 只做语义摘要 |
| **Fingerprint 缓存** | AST signature + file path hash；未变则 skip LLM 调用 |
| **Intermediate on disk** | 所有 phase 输出写到 `.understand-anything/intermediate/`，不返回 context |
| **平台无关 core** | `@understand-anything/core` 用 subpath exports (`./search`, `./types`, `./schema`) 隔离 Node.js 模块；dashboard 只引浏览器安全子路径 |
| **Single manifest, multi-platform** | 一份 `plugin.json` 多端发布（Claude Code / Cursor / Codex / Copilot） |
| **Knowledge-base + Codebase 统一** | 同一 pipeline 可处理 `*.md` wiki（`parse-knowledge-base.py` + `merge-knowledge-graph.py`）和源码 |

## 5. 中间产物目录

```
.understand-anything/
├── intermediate/
│   ├── scan-manifest.json          # Phase 1 output
│   ├── import-map.json             # Phase 2.1
│   ├── fingerprints.json           # Phase 2.3
│   ├── batches.json                # Phase 2.4
│   ├── analysis-batch-*.json      # Phase 2 LLM outputs (并行)
│   ├── subdomain-graphs/*.json     # Phase 4.2 (并行)
│   └── assembled-graph.json        # Phase 4 final
├── knowledge-graph.json            # Final user-facing artifact
├── ignore-cache.json               # .understandignore fingerprint cache
└── .gitignore                      # exclude this entire dir from VCS
```

## 6. Knowledge-Base 模式

除代码外，还支持 **markdown wiki** 作为输入：

- `parse-knowledge-base.py` — 扫描 `wiki/` 或 `index.md`，提取 article / entity / claim
- `merge-knowledge-graph.py` — 合并 + dedup entity + 构建 article→layer 映射 + 生成 tour
- 输出 `kind: "knowledge"` 而非 `kind: "code"` 的图，dashboard 自动适配
