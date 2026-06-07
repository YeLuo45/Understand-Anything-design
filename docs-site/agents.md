# Agents

> `understand-anything-plugin/agents/` — 9 个专业 agent

## 概览

```
agents/
├── project-scanner.md           # Phase 1: 库存
├── file-analyzer.md             # Phase 2: 单文件结构 + 语义
├── architecture-analyzer.md     # Phase 3: 分层
├── tour-builder.md              # Phase 4: 引导路径
├── graph-reviewer.md            # Phase 4: 质量审查
├── assemble-reviewer.md         # Phase 4: 合并监督
├── domain-analyzer.md           # (knowledge mode) 领域分析
├── article-analyzer.md          # (knowledge mode) 单文章分析
└── knowledge-graph-guide.md     # (knowledge mode) 指南
```

## 1. project-scanner

**任务**: 扫描项目根目录，输出结构化清单。

**输入**: 项目路径 + language directive (可选)

**输出**: `.understand-anything/intermediate/scan-manifest.json`

**分工**:
- **Bundled scripts** (`scan-project.mjs`, `extract-import-map.mjs`)：文件枚举、语言检测、import map、`.understandignore` 过滤、复杂度估算
- **LLM**: 阅读 README + manifests 生成 narrative `name` / `description` / `frameworks` / `languages`

**多语言支持**: 接收 `language directive` 时，所有 LLM 输出文本字段（description、summary）翻译为指定语言。

## 2. file-analyzer

**任务**: 分析文件批次，输出 knowledge graph nodes + edges。

**输入**: Phase 1 输出的 batch (含 file paths + fileCategory)

**输出**: `analysis-batch-N.json` (per batch)

**两阶段**:

### Phase 1: 确定性提取（脚本）

`extract-structure.mjs` + `extract-import-map.mjs`：
- tree-sitter 解析 → StructuralAnalysis
- import 解析 → caller/callee 关系
- 输出不含 LLM 推理的纯结构数据

### Phase 2: LLM 语义增强

LLM 接收 Phase 1 输出，添加：
- `summary` (1-3 句自然语言)
- `tags` (3-5 个技术标签)
- `complexity` (trivial/simple/moderate/complex/epic)
- `languageNotes` (语言特性备忘)

**File categories** (差异化处理):
- `code` — function/class/method 提取
- `config` — keys + 引用关系
- `docs` — H1-H6 + wikilinks
- `infra` — Dockerfile / k8s manifests 解析
- `data` — schema inference
- `script` — 入口点检测
- `markup` — HTML/XML 元素

## 3. architecture-analyzer

**任务**: 把所有 file 节点分配到 3-10 个逻辑 layer。

**输入**: 所有 file nodes + import edges

**输出**: 每个 file 的 `belongs-to-layer` 边

**两阶段**:

### Phase 1: 结构性分析（脚本）

LLM 先写一个 Node.js / Python 脚本分析：
- import graph 的入度/出度分布
- 文件 path 模式（`controllers/`、`models/`、`utils/`）
- framework 边界（React 组件 vs Node 工具）

### Phase 2: 语义层命名

LLM 综合 Phase 1 输出来定义 3-10 layer：
- `name` (e.g. "API Layer", "Domain Model")
- `description` (Chinese 友好)
- `nodeIds` (每个 layer 包含哪些 file)

**避免**机械分到 `src/`、`tests/`、`docs/` — 应基于实际职责。

## 4. tour-builder

**任务**: 为新成员生成 5-10 步的 onboarding 路径。

**输入**: 完整 graph + layers

**输出**: `tour: TourStep[]` (写入 assembled graph)

**策略**:
- 从 architecture-analyzer 命名的"核心 layer"开始
- 每个 layer 选 1-3 个代表性节点（按 `complexity` + `contains(important-classes)` 排序）
- 估算每步阅读时间

## 5. graph-reviewer

**任务**: 审查最终 graph 质量。

**检查项**:
- 孤立节点（无 import 边）— 可能 file 真无依赖 或 提取失败
- 自循环边 — 通常是 bug
- 缺失 summary — file 太长被 truncate
- 矛盾 edges — A imports B 但 B doesn't export A's expected symbol
- Layer 大小分布 — 单 layer > 60% 总节点说明分层失败

**输出**: review report（可选自动 fix）

## 6. assemble-reviewer

**任务**: 监督 `merge-batch-graphs.py` + `merge-subdomain-graphs.py` 的合并结果。

**检查项**:
- Entity dedup 是否正确（normalize name 后应合并）
- 跨 batch edge 的 source/target 是否都存在
- Layer membership 是否完整（每个 file 在某 layer）
- Tour 节点的可达性

## 7. domain-analyzer (knowledge mode)

**任务**: 分析 markdown wiki 的领域结构。

**输入**: `wiki/` 或 `index.md` 内容

**输出**: category 划分 + topic 摘要

## 8. article-analyzer (knowledge mode)

**任务**: 单篇文章分析。

**输出**:
- article 节点（content + frontmatter）
- entity 节点（提及的领域概念）
- claim 节点（文章中的事实断言）
- wikilink 解析

## 9. knowledge-graph-guide

**任务**: (knowledge mode) 知识图谱构建指南。

不同 agents 协同产生 `kind: "knowledge"` 而非 `"code"` 的图。

## Agent Model 字段

```yaml
# agents/*.md
---
name: project-scanner
description: |
  Scans a codebase directory to produce a structured inventory...
# 注意：没有 model 字段
```

**没有 `model: inherit`** — 这是有意的修正。`inherit` 是 Claude Code 独有 keyword，opencode 等把它当字面量，触发 `ProviderModelNotFoundError` (#167)。省略让每个平台用配置的 default model。

## 调用方式

- **Claude Code**: Skill discovery 通过 description 匹配
- **Cursor / Codex / Copilot**: plugin.json 的 `agents` 字段
- **手动调用** (开发): 直接 `cat agents/<name>.md` + LLM chat
