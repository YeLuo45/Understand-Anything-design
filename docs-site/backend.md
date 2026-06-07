# Core Package

> `@understand-anything/core` — 共享分析引擎

## 模块结构

```
packages/core/src/
├── analyzer/
│   ├── graph-builder.ts          # 29 symbols — 主图组装器
│   ├── language-lesson.ts        # 11 — 给 LLM 的语言特性备忘
│   ├── layer-detector.ts         # 10 — 启发式 layer 切分
│   ├── llm-analyzer.ts           # 9 — LLM 调用封装
│   ├── normalize-graph.ts        # 14 — 节点/边归一化
│   └── tour-generator.ts         # 5 — onboarding tour 生成
├── languages/
│   ├── configs/                  # 39+ 语言配置（python, ts, go, rust, ...）
│   ├── frameworks/               # 12 框架 detection（react, vue, fastapi, ...）
│   ├── framework-registry.ts     # 13 — 框架注册中心
│   ├── language-registry.ts      # 14 — 语言注册中心
│   ├── types.ts                  # 11 — LanguageConfig / FrameworkConfig
│   └── index.ts                  # barrel
├── persistence/
│   ├── index.ts                  # 25 — JSON 文件 IO + 锁 + 缓存
│   └── persistence.test.ts
├── plugins/
│   ├── extractors/               # 9 个语言 extractor
│   │   ├── base-extractor.ts     # 7 — LanguageExtractor interface 共享
│   │   ├── cpp/csharp/go/java/php/python/ruby/rust/typescript
│   │   └── types.ts              # 4 — LanguageExtractor interface 定义
│   ├── parsers/                  # 13 个配置/数据文件 parser
│   │   ├── dockerfile/env/graphql/json/makefile/markdown/protobuf/shell/sql/terraform/toml/yaml
│   │   └── index.ts              # 15
│   ├── discovery.ts              # 7 — plugin discovery
│   ├── registry.ts               # 18 — extractor/parser registry
│   └── tree-sitter-plugin.ts     # 28 — tree-sitter 集成入口
├── change-classifier.ts          # 8 — fingerprint 变化分类
├── embedding-search.ts           # 13 — 语义搜索
├── fingerprint.ts                # 19 — AST signature 哈希
├── ignore-filter.ts              # 7 — .understandignore 解析
├── ignore-generator.ts           # 10 — 默认 ignore 模板生成
├── schema.ts                     # 23 — Zod schemas
├── search.ts                     # 12 — BM25 / exact / fuzzy 搜索
├── staleness.ts                  # 7 — 增量更新检测
├── types.ts                      # 25 — StructuralAnalysis / CallGraphEntry / Node / Edge
└── index.ts                      # 1 — barrel（仅服务端 subpath 入口）
```

## Subpath Exports

```jsonc
// packages/core/package.json
{
  "exports": {
    ".":            "./dist/index.js",          // Node-only（pulls in fs, path）
    "./search":     "./dist/search.js",         // 浏览器安全
    "./types":      "./dist/types.js",          // 纯类型
    "./schema":     "./dist/schema.js"          // Zod schemas
  }
}
```

Dashboard 包**只能**从 `./search` / `./types` / `./schema` import，否则 Vite 构建会失败（pull in Node.js `fs`/`path`）。

## 核心数据流（Analyzer）

```
1. read .understand-anything/intermediate/scan-manifest.json
2. for each file:
     - if file changed (fingerprint differ) → run extract
     - tree-sitter parse → LanguageExtractor
     - produce StructuralAnalysis { functions, classes, imports, exports, calls }
3. build fingerprint → staleness check
4. dedup nodes by ID + dedup edges by (source, target, type)
5. emit normalized graph
```

## 持久化策略

`persistence/index.ts` 提供：

```ts
readJson<T>(path: string): Promise<T>
writeJsonAtomic(path: string, data: unknown): Promise<void>
acquireLock(path: string): Promise<Lock>
batchRead<T>(paths: string[]): Promise<Record<string, T>>
```

- **Atomic write** — temp file + rename 避免崩溃时半成品
- **Lock** — flock 防止多 agent 并行写同一文件
- **Batch read** — 减少 LLM 阶段反复 fs.open

## 关键算法

### Fingerprint（增量更新核心）

```ts
// fingerprint.ts
hash = sha256(filePath + astSignature + summaryHash + tagsHash)
```

- `astSignature` = tree-sitter node type 序列（如 `function_declaration → identifier → block`）
- 文件未变 → fingerprint 一致 → skip LLM 调用
- 文件改名 / 移动 → path 部分变化 → 自动 invalidate

### Search

```ts
// search.ts
class GraphSearch {
  exact(query): Node[]
  fuzzy(query, threshold=0.8): Node[]
  bm25(query, k=10): Node[]
  semantic(query, embedding): Node[]  // delegates to embedding-search.ts
}
```

### Staleness Detection

```ts
// staleness.ts
interface StalenessReport {
  added:    Node[]   // 新文件
  modified: Node[]   // fingerprint 变
  removed:  string[] // 已删除文件 ID
  unchanged: Node[]  // 可跳过
}
```

Dashboard 启动时只 load stale 节点对应源码，节省 60%+ 网络。

## 测试

```
packages/core/src/__tests__/
├── change-classifier.test.ts          5
├── domain-normalize.test.ts           3
├── domain-persistence.test.ts         9
├── domain-types.test.ts               5
├── embedding-search.test.ts           6
├── fingerprint.test.ts                7
├── framework-registry.test.ts         5
├── ignore-filter.test.ts              6
├── ignore-generator.test.ts           6
├── language-lesson.test.ts            7
├── language-registry.test.ts          6
├── layer-detector.test.ts             6
├── normalize-graph.test.ts            4
├── parsers.test.ts                   16
├── plugin-discovery.test.ts           3
├── plugin-registry.test.ts            7
├── schema.test.ts                     5
├── search.test.ts                     6
├── staleness.test.ts                  9
└── tour-generator.test.ts             5

packages/core/src/plugins/extractors/__tests__/
├── cpp/csharp/go/java/php/python/ruby/rust-extractor.test.ts   8×9
```

## 已知约束

| 限制 | 原因 |
|------|------|
| 不支持 binary files | tree-sitter 无 grammar |
| 单文件最大 1 MB | 防止 LLM 阶段 OOM |
| Import map 不解析 dynamic import 的变量名 | 静态分析无法 100% 准确 |
| Framework detection 只看文件 path + 内容前 100 行 | 平衡精度和性能 |
