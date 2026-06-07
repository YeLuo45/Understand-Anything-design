# Language Support

> `packages/core/src/languages/configs/` — 39+ 语言配置

## LanguageConfig 接口

```ts
// packages/core/src/languages/types.ts
interface LanguageConfig {
  id: string                  // canonical id, e.g. "python"
  aliases: string[]           // 识别名, e.g. ["py", "python3"]
  extensions: string[]        // 文件扩展名, e.g. [".py", ".pyi"]
  fileNames?: string[]        // 完整文件名, e.g. ["Dockerfile", "Makefile"]
  treeSitterWasm: string      // wasm 资源名
  extractorLanguages: string[] // 匹配 LanguageExtractor.languageIds
  defaultCategory: FileCategory // code | config | docs | infra | data | script | markup
  defaultComplexity: Complexity
  frameworkHints?: string[]   // 该语言常用的框架（用于 layer 启发式）
}
```

## 已支持语言（39+）

### 编程语言

| ID | 别名 | 扩展名 | 备注 |
|----|------|--------|------|
| `python` | py, python3 | .py, .pyi | decorators, async, type hints |
| `javascript` | js, node | .js, .mjs, .cjs | ESM + CJS 双解析 |
| `typescript` | ts | .ts, .tsx, .mts, .cts | JSX/TSX, decorators |
| `go` | golang | .go | generics since 1.18 |
| `rust` | rs | .rs | traits, lifetimes, macros |
| `java` | — | .java | records, sealed, pattern matching |
| `kotlin` | kt | .kt, .kts | null safety, coroutines |
| `swift` | — | .swift | ios/macos only |
| `cpp` | c++, cxx | .cpp, .cc, .cxx, .hpp, .h | templates |
| `c` | — | .c, .h | C 兼容层 |
| `csharp` | cs, c# | .cs | .NET, LINQ |
| `ruby` | rb | .rb | rails ecosystem |
| `php` | — | .php | typed properties |
| `lua` | — | .lua | game scripting |
| `sql` | — | .sql, .ddl | tables, views, procs |
| `shell` | bash, sh, zsh | .sh, .bash, .zsh | POSIX + bashisms |
| `powershell` | ps1, pwsh | .ps1, .psm1 | Windows automation |
| `markdown` | md | .md | wiki + docs |
| `restructuredtext` | rst | .rst | Python docs |
| `plaintext` | text, txt | .txt | fallback |
| `csv` | — | .csv | schema only |

### 配置 / 基础设施

| ID | 扩展名 | 解析器 |
|----|--------|--------|
| `json` | .json | 自家 parser |
| `json-config` | .json (特定路径) | 仅顶层 keys（避免深递归） |
| `yaml` | .yaml, .yml | 自家 parser |
| `toml` | .toml | 自家 parser |
| `env` | .env, .env.* | 变量名 only |
| `dockerfile` | Dockerfile, .dockerfile | FROM/RUN/COPY 依赖 |
| `docker-compose` | docker-compose.yml | services + depends_on |
| `makefile` | Makefile, makefile, .mk | targets + deps |
| `kubernetes` | *.k8s.yaml, deployment.yaml | resources |
| `terraform` | .tf, .tfvars | HCL |
| `github-actions` | .github/workflows/*.yml | jobs, steps |
| `jenkinsfile` | Jenkinsfile | stages, steps |
| `protobuf` | .proto | messages, services |
| `graphql` | .graphql, .gql | types, queries, mutations |
| `openapi` | openapi.yaml, swagger.yaml | endpoints |
| `html` | .html, .htm | tags + scripts |
| `css` | .css, .scss, .sass | selectors, vars |
| `xml` | .xml, .xsd, .xsl | elements |
| `batch` | .bat, .cmd | Windows scripts |
| `python` (config) | pyproject.toml, setup.py | — |

## 自动检测

```ts
// language-registry.ts
function detectLanguage(filePath: string, firstLine?: string): LanguageConfig | null {
  // 1. 扩展名匹配
  // 2. shebang 检查 (#!/usr/bin/env python)
  // 3. 文件名匹配 (Dockerfile, Makefile, ...)
  // 4. 内容首行 (for extensionless)
}
```

## 框架识别

详见 [frameworks.md](frameworks.md) — 12 个框架基于 `frameworkHints` + 文件 path 模式 + 内容头检测。

## 增量添加

```ts
// packages/core/src/languages/configs/elixir.ts
import type { LanguageConfig } from "../types.js"

export const elixir: LanguageConfig = {
  id: "elixir",
  aliases: ["ex", "elixir-lang"],
  extensions: [".ex", ".exs"],
  treeSitterWasm: "tree-sitter-elixir.wasm",
  extractorLanguages: ["elixir"],
  defaultCategory: "code",
  defaultComplexity: "moderate",
  frameworkHints: ["phoenix", "ecto"],
}
```

注册到 `configs/index.ts` 即可，registry 自动 pick up。
