# Integration

> 8 个 AI agent 平台 + 单一 plugin manifest

## 平台清单

| 平台 | 入口 | Plugin 目录 |
|------|------|-------------|
| **Claude Code** | marketplace + project install | `.claude-plugin/` |
| **Cursor** | marketplace | `.cursor-plugin/` |
| **Codex CLI** | marketplace | `.codex-plugin/` (隐式) |
| **GitHub Copilot** | marketplace | `.copilot-plugin/` |
| **Gemini CLI** | GEMINI.md | `GEMINI.md` |
| **opencode** | 配置 | `.opencode/` (隐式) |
| **Mistral Vibe CLI** | 配置 | `VIBE.md` |
| **Trae** | 配置 | `TRAE.md` |

## Plugin Manifest 多端发布

```bash
understand-anything-plugin/
├── .claude-plugin/
│   ├── plugin.json
│   └── marketplace.json          # 元数据 for marketplace
├── .cursor-plugin/
│   └── plugin.json
├── .copilot-plugin/
│   └── plugin.json
└── understand-anything-plugin.json   # 通用
```

每个 manifest 内容：
```jsonc
{
  "name": "understand-anything",
  "version": "0.5.0",
  "description": "Multi-agent codebase understanding",
  "author": { "name": "Lum1104" },
  "license": "MIT",
  "agents": ["agents/*.md"],
  "skills": ["skills/*/SKILL.md"],
  "hooks": ["hooks/hooks.json"]
}
```

**Version 同步** (5 个文件)：
```bash
# 每次发布 bump 这 5 处
understand-anything-plugin/package.json               # version
understand-anything-plugin/.claude-plugin/plugin.json # version
.claude-plugin/plugin.json                            # version
.cursor-plugin/plugin.json                             # version
.copilot-plugin/plugin.json                            # version
```

**注意**: `.claude-plugin/marketplace.json` **不**含 `version` — `plugins[]` 只支持 `name` + `source`，加其他字段触发 schema validation 失败。

## 跨平台差异

### Claude Code
- 用 `description` 字段做 skill discovery（自然语言匹配）
- agent `model: inherit` 解析为 default model
- `/understand` 命令

### Cursor
- 读 `.cursor-plugin/plugin.json` 的 `agents` 字段
- skill 通过 `cursor:skills` 路径发现
- 命令通过 `cursor:commands` 路径发现

### Codex
- 类似 Cursor
- model 字段完全省略，让 Codex 自己的 default

### Copilot
- 读 `.copilot-plugin/plugin.json`
- skill 通过 `chat.persona` 触发

### Gemini CLI
- 读 `GEMINI.md`（项目级）
- 不支持 hooks，全部 agent 在 prompt 上下文运行

### opencode
- 配置文件驱动
- ⚠️ 不支持 `model: inherit` keyword（当字面量）— 我们的 agent 都省略此字段

### Mistral Vibe
- 读 `VIBE.md`
- agent 通过 `vibe:agents` 字段

### Trae
- 读 `TRAE.md`
- 简化 manifest

## 本地测试

Claude Code 把插件 cache 在 `~/.claude/plugins/cache/understand-anything/understand-anything/<version>/`。**Symlink 不行**（Search/Glob 工具不跟 symlink）。

```bash
# 1. Build packages
pnpm --filter @understand-anything/core build
pnpm --filter @understand-anything/skill build

# 2. 找已安装版本
ls ~/.claude/plugins/cache/understand-anything/understand-anything/

# 3. 替换
rm -rf ~/.claude/plugins/cache/understand-anything/understand-anything/<VERSION>
cp -R ./understand-anything-plugin ~/.claude/plugins/cache/understand-anything/understand-anything/<VERSION>

# 4. 启新 Claude Code session
# 5. 跑 /understand --full 测试
```

## 重新同步

```bash
pnpm --filter @understand-anything/core build && \
cp -R ./understand-anything-plugin/* ~/.claude/plugins/cache/understand-anything/understand-anything/<VERSION>/
```

## 安装器

```bash
# macOS / Linux
curl -fsSL https://raw.githubusercontent.com/YeLuo45/Understand-Anything/main/install.sh | sh

# Windows PowerShell
irm https://raw.githubusercontent.com/YeLuo45/Understand-Anything/main/install.ps1 | iex
```

自动：
1. 检测 OS
2. 下 binary
3. 注册到 Claude Code / Cursor / Codex

## Marketplace URL

- **Claude Code**: `https://github.com/YeLuo45/Understand-Anything/blob/main/.claude-plugin/marketplace.json`
- **Cursor**: 即将上线
- **Codex**: 即将上线
