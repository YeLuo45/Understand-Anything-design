# Dashboard

> `@understand-anything/dashboard` — React + React Flow 知识图谱可视化

## 启动方式

```bash
# 在被分析项目目录
$ understand-dashboard
# 启动 Vite dev server，输出:
#   Dashboard running at http://localhost:5173/?token=<random>
#   Token written to .understand-anything/dashboard.json
```

- `understand-dashboard` skill 解析 `.understand-anything/knowledge-graph.json`
- 生成 Vite dev server 进程
- 写 access token 到 `.understand-anything/dashboard.json`（受文件权限 600 保护）
- 在 token URL 里访问

## 布局

```
┌─────────────────────────────────────────────────────────────────┐
│  75%                                                          360px
│ ┌──────────────────────────────────────────────────┐  ┌────────┐
│ │                                                    │  │ Info   │
│ │                                                    │  │ Files  │
│ │              React Flow 知识图谱                   │  │        │
│ │                                                    │  │ Tab 1  │
│ │   节点 (file/function/class/import)                 │  │        │
│ │   边 (imports/calls/extends)                         │  │        │
│ │                                                    │  │        │
│ └──────────────────────────────────────────────────┘  └────────┘
│ ▼ source viewer (slides up from bottom on file click)            │
└─────────────────────────────────────────────────────────────────┘
```

- **图区 75%** — 主视觉
- **侧栏 360px** — Info / Files tab
- **底部 source viewer** — 节点点击时从底部上滑展示代码

## 状态管理

```ts
// packages/dashboard/src/store.ts (Zustand)
interface DashboardStore {
  graph: KnowledgeGraph
  selectedNodeId: string | null
  sidebarTab: 'info' | 'files'
  persona: 'learn' | 'reference' | 'review'
  theme: 'dark-luxury' | 'light-minimal'   // 主题切换
  sourceViewer: {
    open: boolean
    filePath: string | null
    content: string | null
  }
  // ...actions
}
```

- **Atoms per feature** — chat / shell / share 分独立 atom
- **Persistence** — sidebar 偏好 + 主题选择写 localStorage

## 关键组件

```
packages/dashboard/src/
├── App.tsx                        # Root + ThemeProvider + RouterShell
├── main.tsx                       # Vite entry
├── store.ts                       # Zustand
├── index.css                      # Tailwind v4 + CSS vars for theme
├── vite-env.d.ts
├── components/
│   ├── DashboardContent.tsx       # 主图区
│   ├── ThemePicker.tsx            # Dark/Light 切换
│   ├── MobileDrawer.tsx           # 移动端 sidebar drawer
│   ├── ...
├── contexts/                      # Theme context + i18n context
├── hooks/                         # useGraph, useNodeInfo, useSearch
├── locales/                       # i18n bundles
├── themes/                        # 主题定义 (CSS vars)
└── utils/                         # access token 解析、URL 安全
```

## 主题

| 主题 | 配色 | 字体 | 适用 |
|------|------|------|------|
| **Dark Luxury** | `#0a0a0a` 背景 + `#d4a574` 金色点缀 | DM Serif Display | 默认 / 演示 |
| **Light Minimal** | `#ffffff` + `#1a1a1a` | Inter | 长阅读 / 截图 |

主题切换通过 CSS variables 实时生效，dashboard 自动重新渲染 graph 边色。

## 数据加载

```ts
// 1. fetch /file-content.json?path=X&token=Y
// 2. 后端 validate:
//    - token 存在 .understand-anything/dashboard.json
//    - X 属于 graph 节点的 path allowlist（防越权读源码）
// 3. 返回 source content 或 403
```

- 路径白名单由 graph 派生 — 任何不在图中的路径无法读取
- 静态文件 + access token 双保险

## 性能

- **图节点 > 3000** — 自动启用 WebGL rendering（`ReactFlow` 配 `nodeTypes` 切换 `webgl: WebGLNode`）
- **图节点 < 3000** — SVG rendering (default)
- `scripts/generate-large-graph.mjs [nodeCount=3000]` — 压力测试用

## 模式适配

Dashboard 检测 `graph.kind`：
- `"code"` — 渲染 file/function/class 节点，色板按语言分
- `"knowledge"` — 渲染 article/entity/claim 节点，侧栏显示 article content
- 切换无需重启，atomic swap components

## 构建

```bash
pnpm --filter @understand-anything/dashboard build
# → packages/dashboard/dist/
# 由 understand-dashboard skill 作为 static assets serve
```

## 测试

- `vitest` + `@testing-library/react`
- 重点测：access token 验证、path allowlist 边界、theme 切换、图节点选择状态机
