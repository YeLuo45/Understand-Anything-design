# Skills

> `understand-anything-plugin/skills/` — 7 个 skill 入口 + 10 个脚本

## 概览

```
skills/
├── understand/                  # 主入口: /understand
│   ├── build-fingerprints.mjs
│   ├── compute-batches.mjs
│   ├── extract-import-map.mjs
│   ├── extract-structure.mjs
│   ├── merge-batch-graphs.py
│   ├── merge-subdomain-graphs.py
│   └── scan-project.mjs
├── understand-chat/             # /understand-chat
├── understand-dashboard/        # /understand-dashboard
├── understand-diff/             # /understand-diff (变更分析)
├── understand-domain/           # /understand-domain
│   └── extract-domain-context.py
├── understand-explain/          # /understand-explain
├── understand-knowledge/        # /understand-knowledge
│   ├── merge-knowledge-graph.py
│   └── parse-knowledge-base.py
└── understand-onboard/          # /understand-onboard (新手引导)
```

## 1. `/understand` — 主入口

**触发**: 用户在项目根目录运行 `/understand --full` 或 `/understand`（增量）

**流程**:
```
1. understand skill entry → 调 project-scanner agent
2. project-scanner 输出 scan-manifest.json
3. understand skill → 调 file-analyzer agent ×N (parallel)
4. 调 architecture-analyzer agent
5. 调 merge-batch-graphs.py + merge-subdomain-graphs.py
6. 调 tour-builder + graph-reviewer
7. /understand-dashboard skill 自动启动 (auto-trigger)
```

**用户感知**: 一个 `/understand` 命令，背后 9 个 agent + 7 个脚本串行/并行协作。

## 2. `/understand-chat`

**任务**: 基于已构建的 knowledge graph 回答问题。

**能力**:
- 自然语言问题 → 检索相关节点
- 支持 follow-up（保留对话上下文）
- 引用节点 ID + 文件 path
- 可附加"显示在 graph 中"按钮

**实现**:
- 内部用 `embedding-search.ts` + `search.ts` 双路召回
- LLM 合成答案，每条断言引用节点 ID

## 3. `/understand-dashboard`

**任务**: 启动 React Flow 知识图谱 UI。

**流程**:
```
1. 读 .understand-anything/knowledge-graph.json
2. 启 Vite dev server (packages/dashboard/) 随机端口
3. 写 access token 到 .understand-anything/dashboard.json (chmod 600)
4. 输出 URL: http://localhost:<port>/?token=<token>
5. 用户点 URL → dashboard 拉 graph JSON + validate token + 渲染
```

**安全**:
- token 每次启动随机
- `/file-content.json` endpoint 校验 graph path allowlist
- token 24h 过期（写到 mtime 控制）

## 4. `/understand-diff`

**任务**: 对比两个 commit / branch 的 graph 差异。

**输出**:
- 新增/删除/修改的节点
- 边变化（import 关系重排）
- Layer 影响范围
- 受影响测试文件（`affected` edge from test → code）

**实现**:
- `git diff <ref1>..<ref2> --name-only` → 过滤 → 重新提取结构
- 与 base graph diff

## 5. `/understand-domain` (knowledge mode)

**任务**: 领域概念分析。

**入口**: `extract-domain-context.py`

**输入**: wiki 内容

**输出**: domain context JSON（entity/relationship/axiom 三元组）

## 6. `/understand-explain`

**任务**: 解释单文件 / 单函数 / 单概念。

**输入**: file path 或 symbol ID

**输出**:
- 自然语言解释（基于 graph 中相邻节点）
- 关联文件列表
- 相关 wiki 文章（如果存在）

## 7. `/understand-knowledge` (knowledge mode)

**任务**: 构建 wiki/markdown 知识图谱。

**入口**:
- `parse-knowledge-base.py` — 解析 wiki → article/entity/claim
- `merge-knowledge-graph.py` — 合并 + dedup + layer + tour

**输出**: `kind: "knowledge"` 的 graph

## 8. `/understand-onboard`

**任务**: 给新人一个循序渐进的项目导览。

**入口**: 调 `tour-builder` agent

**输出**:
- 5-10 步 tour
- 每步关联 1-3 个核心文件
- 链接到 `/understand-explain` 深入了解

## 脚本技术栈

| 脚本 | 语言 | 理由 |
|------|------|------|
| `*.mjs` | Node.js ESM | 复用 `@understand-anything/core` subpath imports |
| `*.py` | Python 3.10+ | 部分 agent prompt 适合 Python 表达（string ops, regex） |
| `*.md` | Markdown + YAML | agent description / frontmatter |

## 跨 Skill 数据流

```
.understand-anything/
├── intermediate/                 # Phase 1-4 中间产物
├── knowledge-graph.json          # 最终图（所有 skill 读它）
├── dashboard.json                # dashboard skill 写
├── ignore-cache.json             # understand skill 写
└── .gitignore                    # 自动生成
```

Skills 之间通过文件系统松耦合，不直接 import — 单一职责 + 可独立测试。
