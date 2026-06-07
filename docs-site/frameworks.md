# Framework Detection

> `packages/core/src/languages/frameworks/` — 12 个主流框架自动识别

## FrameworkConfig 接口

```ts
// packages/core/src/languages/types.ts
interface FrameworkConfig {
  id: string                   // "react"
  displayName: string          // "React"
  languageIds: string[]        // 适用语言, e.g. ["typescript", "javascript"]
  detectors: FrameworkDetector[]
  defaultLayer: string         // 启发式 layer 名, e.g. "UI Layer"
  hints: string[]
}

interface FrameworkDetector {
  type: "file-exists" | "file-content-matches" | "package-dependency"
  pattern: string | RegExp | { name: string; version?: string }
  weight: number               // 0..1
}
```

## 已支持（12 个）

| Framework | 语言 | 检测信号 | 默认 Layer |
|-----------|------|----------|-----------|
| `react` | TS/JS | `package.json` 含 `react`, `.jsx`/`.tsx` 文件 | UI Layer |
| `vue` | TS/JS | `package.json` 含 `vue`, `.vue` 单文件 | UI Layer |
| `nextjs` | TS/JS | `next.config.js`, `app/` 或 `pages/` | Full-Stack |
| `express` | JS/TS | `package.json` 含 `express` | API Layer |
| `django` | Python | `manage.py`, `settings.py`, `requirements.txt` 含 `django` | Full-Stack |
| `flask` | Python | `requirements.txt` 含 `flask` 或 `app.py` 含 `Flask` | API Layer |
| `fastapi` | Python | `requirements.txt` 含 `fastapi` 或 `app = FastAPI()` | API Layer |
| `spring` | Java | `pom.xml` 含 `spring-boot` 或 `build.gradle` | Full-Stack |
| `rails` | Ruby | `Gemfile` 含 `rails`, `config/application.rb` | Full-Stack |
| `gin` | Go | `go.mod` 含 `gin-gonic/gin` | API Layer |
| `react` (already listed) | — | — | — |

## 检测算法

```ts
// framework-registry.ts
function detectFrameworks(project: ProjectContext): FrameworkConfig[] {
  const detected: { fw: FrameworkConfig; score: number }[] = []
  for (const fw of allFrameworks) {
    let score = 0
    for (const detector of fw.detectors) {
      switch (detector.type) {
        case "file-exists":
          if (project.files.includes(detector.pattern)) {
            score += detector.weight
          }
          break
        case "file-content-matches":
          if (someFileMatches(project, detector.pattern)) {
            score += detector.weight
          }
          break
        case "package-dependency":
          if (project.dependencies[detector.pattern.name] matches) {
            score += detector.weight
          }
          break
      }
    }
    if (score > 0.5) detected.push({ fw, score })
  }
  return detected.sort((a, b) => b.score - a.score)
}
```

## Layer 启发式

检测到框架后，`defaultLayer` 给 architecture-analyzer agent 一个起点。LLM 仍可调整，但有 anchor 防止完全乱猜。

## 添加新框架

```ts
// packages/core/src/languages/frameworks/svelte.ts
import type { FrameworkConfig } from "../types.js"

export const svelte: FrameworkConfig = {
  id: "svelte",
  displayName: "Svelte",
  languageIds: ["javascript", "typescript"],
  defaultLayer: "UI Layer",
  hints: ["compiled framework", "no virtual DOM"],
  detectors: [
    { type: "package-dependency", pattern: { name: "svelte" }, weight: 0.9 },
    { type: "file-exists", pattern: "svelte.config.js", weight: 0.5 },
    { type: "file-content-matches", pattern: /\.svelte$/, weight: 0.3 },
  ],
}
```

注册到 `frameworks/index.ts`。

## 与 agent pipeline 集成

```
project-scanner:
  - run language-registry.detect()
  - run framework-registry.detect()
  - emit scan-manifest.json { languages, frameworks, ... }

file-analyzer:
  - 仅分析扫描器标为"code"类别的文件
  - language hints 来自 framework detection（"this is a React project"）

architecture-analyzer:
  - 用 framework.defaultLayer 作为 layer 命名起点
  - 跨 framework 边界生成 cross-layer edges
```
