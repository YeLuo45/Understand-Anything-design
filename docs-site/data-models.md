# Data Models

> 知识图谱节点、边、项目的核心数据模型

## 顶层结构

```ts
interface KnowledgeGraph {
  version: "1.0.0"
  kind: "code" | "knowledge"
  project: ProjectMeta
  nodes: GraphNode[]
  edges: GraphEdge[]
  layers: Layer[]         // 架构层（仅 code mode）
  tour: TourStep[]        // 引导路径
}

interface ProjectMeta {
  name: string
  description: string
  languages: string[]     // ISO codes or framework names
  frameworks: string[]
  analyzedAt: string      // ISO timestamp
  gitCommitHash: string
}
```

## 节点（GraphNode）

```ts
type NodeType =
  // code mode
  | "file" | "function" | "class" | "interface" | "method" | "variable"
  | "import" | "export" | "module" | "directory" | "external-package"
  // knowledge mode
  | "article" | "entity" | "claim" | "topic" | "category"

interface GraphNode {
  id: string              // e.g. "file:src/index.ts", "function:handleRequest"
  type: NodeType
  name: string
  path?: string           // file path (code mode) or wiki path (knowledge mode)
  summary: string         // LLM-generated (or first line fallback)
  tags: string[]
  complexity: "trivial" | "simple" | "moderate" | "complex" | "epic"
  fingerprint: string     // sha256 hash for staleness
  languageNotes?: string  // e.g. "uses async/await"
  knowledgeMeta?: {       // only for knowledge mode
    content: string       // article body markdown
    frontmatter: Record<string, unknown>
  }
  metadata?: Record<string, unknown>
}
```

## 边（GraphEdge）

```ts
type EdgeType =
  // structure
  | "imports" | "exports" | "extends" | "implements" | "contains"
  // call graph
  | "calls" | "called-by"
  // architecture
  | "belongs-to-layer" | "categorized-under"
  // knowledge
  | "references" | "supports" | "contradicts" | "related"
  // agent-emitted
  | "depends-on" | "owns" | "documents"

interface GraphEdge {
  id: string
  type: EdgeType
  source: string          // node id
  target: string          // node id
  weight: number          // 0..1
  direction: "forward" | "bidirectional"
  label?: string
  metadata?: Record<string, unknown>
}
```

## 层（Layer）

```ts
interface Layer {
  id: string              // "layer:api"
  name: string            // "API Layer"
  description: string
  nodeIds: string[]
  color?: string          // for graph visualization
  parentLayerId?: string
}
```

## Tour（引导路径）

```ts
interface TourStep {
  order: number
  title: string
  description: string
  nodeIds: string[]       // up to 3 representative nodes
  estimatedReadMinutes: number
}
```

## Schema 校验

`packages/core/src/schema.ts` 用 Zod 严格校验：

```ts
export const KnowledgeGraphSchema = z.object({
  version: z.literal("1.0.0"),
  kind: z.enum(["code", "knowledge"]),
  project: ProjectMetaSchema,
  nodes: z.array(GraphNodeSchema).min(1),
  edges: z.array(GraphEdgeSchema),
  layers: z.array(LayerSchema).default([]),
  tour: z.array(TourStepSchema).default([]),
})
```

**任何反序列化失败 → 红色 banner + 不加载图**（避免坏数据污染 UI）。

## 节点 ID 命名约定

| 类型 | 格式 | 示例 |
|------|------|------|
| file | `file:<relative-path>` | `file:src/index.ts` |
| function | `function:<file>:<name>` | `function:src/utils.ts:formatDate` |
| class | `class:<file>:<name>` | `class:src/models.ts:User` |
| import | `import:<file>:<module-specifier>` | `import:src/index.ts:react` |
| article | `article:<wiki-path>` | `article:concepts/caching.md` |
| entity | `entity:<name>` | `entity:user` |
| claim | `claim:<article-stem>:<slug>` | `claim:concepts/caching:cache-invalidation` |
| topic | `topic:<category-slug>` | `topic:concepts` |
| category | `category:<name>` | `category:Concepts` |
| directory | `directory:<relative-path>` | `directory:src` |
| external-package | `package:<name>@<version>` | `package:react@18.2.0` |

## 中间产物模式

`.understand-anything/intermediate/` 内每个 phase 输出自描述 JSON：

```jsonc
// scan-manifest.json
{
  "phase": "scan",
  "version": "1.0.0",
  "files": [...],
  "languages": ["typescript", "python"],
  "frameworks": ["react", "fastapi"],
  "stats": { "totalFiles": 247, "totalLines": 38921 }
}
```

Phase 间通过文件 path 而非进程参数传递 — 可恢复、可重放。
