# Tech Stack

> Understand Anything 技术栈详解

## 核心

| 类别 | 技术 | 版本 |
|------|------|------|
| 语言 | TypeScript | 5.x strict mode |
| 模块系统 | ESM | `"type": "module"` |
| 包管理 | pnpm | 10.x (workspaces) |
| Node | Node.js | >= 22（开发用 24） |
| 测试 | Vitest | root + per-package config |
| Lint | ESLint | flat config (`eslint.config.mjs`) |

## Core 包（分析引擎）

| 组件 | 技术 | 用途 |
|------|------|------|
| AST 解析 | `web-tree-sitter` (WASM) | 多语言语法树（避免 native binding 在 darwin/arm64 + Node 24 失败） |
| 持久化 | 文件系统 JSON | `.understand-anything/intermediate/*.json` |
| 搜索 | 自家 BM25 + Embedding | `search.ts` + `embedding-search.ts` |
| Schema | Zod | `schema.ts` 校验所有图节点/边 |
| 框架识别 | 自家 registry | `languages/frameworks/{django, fastapi, react, vue, ...}.ts` |
| 语言识别 | 自家 registry | `languages/configs/{python, typescript, go, rust, ...}.ts`（39+） |

## Dashboard 包（UI）

| 组件 | 技术 | 用途 |
|------|------|------|
| 框架 | React | 18+ |
| 语言 | TypeScript | strict |
| 图渲染 | `@xyflow/react` (React Flow) | 75% 占比的主图区 |
| 状态 | Zustand | 节点选择、侧栏状态、主题 |
| 样式 | TailwindCSS | v4 |
| 字体 | DM Serif Display | 标题，Serif 奢华感 |
| 代码高亮 | `prism-react-renderer` | 节点点击时拉源码 |
| 构建 | Vite | dev server + 生产构建 |
| 主题 | 自家深黑 + 金色 | `#0a0a0a` 背景，`#d4a574` 金色点缀 |

## Agent 入口

| 平台 | 入口文件 | 调用方式 |
|------|----------|----------|
| Claude Code | `agents/*.md` (YAML frontmatter) | Skill discovery by description |
| Cursor | `.cursor-plugin/plugin.json` | Cursor reads `agents` field |
| Codex | `.codex-plugin/plugin.json` | 同样格式 |
| Copilot | `.copilot-plugin/plugin.json` | 同样格式 |

## Skill 运行时

| 组件 | 技术 |
|------|------|
| 脚本语言 | Node.js (.mjs) + Python (.py) |
| 节点模块 | `@understand-anything/core`（subpath exports） |
| 进程间通信 | 子进程 spawn + JSON stdin/stdout |
| LLM 提示 | Markdown prompts，frontmatter 携带 `model: inherit` 字段 |

## Dashboard 部署

| 模式 | 技术 |
|------|------|
| 本地开发 | `pnpm dev:dashboard` → Vite dev server on 随机端口 |
| 集成运行 | Skill `understand-dashboard` spawn 端口 + 写 access token 到 `.understand-anything/dashboard.json` |
| 公网演示 | `homepage/` (Astro 6) + `understand-anything.com` |

## Homepage（官网）

| 组件 | 技术 |
|------|------|
| 框架 | Astro | 6.x |
| 风格 | Static site generation |
| 部署 | understand-anything.com（独立部署） |

## 安装器

| 平台 | 脚本 |
|------|------|
| macOS / Linux | `install.sh`（curl \| sh） |
| Windows | `install.ps1`（irm \| iex） |

## 第三方依赖关键点

- `web-tree-sitter` 而非 `web-tree-sitter` 原生 binding — 后者在 darwin/arm64 + Node 24 失败
- `tree-sitter-wasms` 提供 39+ 语言 WASM 资源
- `@xyflow/react` (React Flow) — 已 fork 出社区版（之前叫 `reactflow`）
- `prism-react-renderer` — 比 Monaco/CodeMirror 轻 10×，适合侧拉式代码查看
