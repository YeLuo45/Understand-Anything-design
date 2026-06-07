# Plugin System

> `@understand-anything/core` 的 extractor/parser 插件架构

## 设计目标

新语言、新框架、新配置文件格式 → **无需修改 core 主体**，加一个文件即可。

## Extractor（语言 AST 提取）

每个语言一个 extractor，映射 tree-sitter AST → `StructuralAnalysis`：

```ts
// packages/core/src/plugins/extractors/types.ts
export interface LanguageExtractor {
  languageIds: string[]                                          // e.g. ["python", "py"]
  extractStructure(rootNode: TreeSitterNode): StructuralAnalysis  // functions/classes/imports/exports
  extractCallGraph(rootNode: TreeSitterNode): CallGraphEntry[]     // caller → callee
}
```

### 已支持（9 个）

| Extractor | 语言 | 关键特性检测 |
|-----------|------|-------------|
| `python-extractor.ts` | Python | decorators, async, generators, type hints |
| `typescript-extractor.ts` | TypeScript | generics, decorators, enums, JSX |
| `javascript-extractor.ts` | JavaScript | ESM/CJS dual, classes, arrow funcs |
| `go-extractor.ts` | Go | goroutines, channels, defer, interfaces |
| `rust-extractor.ts` | Rust | traits, lifetimes, macros, async/await |
| `java-extractor.ts` | Java | annotations, generics, sealed classes |
| `cpp-extractor.ts` | C++ | templates, namespaces, operator overloading |
| `csharp-extractor.ts` | C# | LINQ, async/await, records, nullable |
| `php-extractor.ts` | PHP | namespaces, traits, typed properties |
| `ruby-extractor.ts` | Ruby | mixins, blocks, metaprogramming |

每个 extractor 都有对应 `__tests__/<lang>-extractor.test.ts` (9 symbols/测试) — 防止 AST 解析回归。

## Parser（非代码配置文件解析）

13 个 parser 处理非源码文件：

| Parser | 输入格式 | 提取内容 |
|--------|----------|----------|
| `dockerfile-parser.ts` | Dockerfile | FROM, RUN, COPY, ENV, EXPOSE → dependency graph |
| `env-parser.ts` | .env | 变量名 + 默认值（避免泄露 secret value） |
| `graphql-parser.ts` | .graphql / .gql | types, queries, mutations |
| `json-parser.ts` | .json (config only) | 顶层 keys（不深递归内容） |
| `makefile-parser.ts` | Makefile | targets, dependencies |
| `markdown-parser.ts` | .md | H1-H6, code blocks, wikilinks |
| `protobuf-parser.ts` | .proto | messages, services, rpcs |
| `shell-parser.ts` | .sh | functions, variables, sourced files |
| `sql-parser.ts` | .sql | tables, views, stored procs |
| `terraform-parser.ts` | .tf | resources, modules, variables |
| `toml-parser.ts` | .toml | sections, keys |
| `yaml-parser.ts` | .yaml / .yml | documents, anchors |

每个 parser 输出标准 `StructuralAnalysis`（即使没有 `function` 概念，也提供 `sections` / `keys` 字段）。

## 注册机制

```ts
// packages/core/src/plugins/registry.ts
class PluginRegistry {
  registerExtractor(extractor: LanguageExtractor): void
  registerParser(lang: string, parser: ParserFn): void
  getExtractor(languageId: string): LanguageExtractor | undefined
  getParser(filePath: string): ParserFn | undefined
}
```

### Auto-discovery

```ts
// discovery.ts
async function discoverPlugins(): Promise<Plugin[]> {
  // 1. 扫 core 内置 plugins/extractors/*.ts 和 parsers/*.ts
  // 2. 读 packages/core/plugins/ (用户自定义)
  // 3. 读 ~/.understand-anything/plugins/ (全局)
  // 4. 通过 ESM dynamic import 加载
}
```

## 添加新语言

```bash
# 1. 创建 extractor
touch packages/core/src/plugins/extractors/kotlin-extractor.ts

# 2. 实现 LanguageExtractor interface
cat > packages/core/src/plugins/extractors/kotlin-extractor.ts <<'EOF'
import type { LanguageExtractor, TreeSitterNode } from "./types.js"
import type { StructuralAnalysis, CallGraphEntry } from "../../types.js"

export const kotlinExtractor: LanguageExtractor = {
  languageIds: ["kotlin", "kt"],
  extractStructure(root) { /* ... */ },
  extractCallGraph(root) { /* ... */ },
}
EOF

# 3. 注册
echo "export { kotlinExtractor } from './kotlin-extractor.js'" >> packages/core/src/plugins/extractors/index.ts

# 4. 加 language config
touch packages/core/src/languages/configs/kotlin.ts
# 实现 LanguageConfig interface

# 5. 测试
cp -r packages/core/src/plugins/extractors/__tests__/rust-extractor.test.ts \
      packages/core/src/plugins/extractors/__tests__/kotlin-extractor.test.ts

# 6. 构建
pnpm --filter @understand-anything/core build
```

## tree-sitter 集成

```ts
// packages/core/src/plugins/tree-sitter-plugin.ts
import { Parser, Language } from "web-tree-sitter"

async function loadLanguage(langId: string): Promise<Language> {
  const wasmPath = `tree-sitter-${langId}.wasm`
  return Language.load(wasmPath)
}

export async function parse(code: string, langId: string): Promise<Tree> {
  await init()  // 一次，懒加载 wasm
  const lang = await loadLanguage(langId)
  const parser = new Parser()
  parser.setLanguage(lang)
  return parser.parse(code)
}
```

**为什么用 WASM 而非 native binding？** 原生 tree-sitter 在 darwin/arm64 + Node 24 会 segfault。WASM 跨平台稳定。

## 配置文件忽略

`.understandignore` 模式（与 `.gitignore` 语法相同）：

```gitignore
# 依赖
node_modules/
.venv/
vendor/
__pycache__/

# 构建产物
dist/
build/
.next/

# 数据
*.csv
*.parquet

# 媒体
*.png
*.jpg
*.mp4
```

- `ignore-filter.ts` 解析 + 应用
- `ignore-generator.ts` 自动检测项目类型生成初始 ignore
- 解析后的 ignore 规则 fingerprint 化，文件不变就 skip 解析
