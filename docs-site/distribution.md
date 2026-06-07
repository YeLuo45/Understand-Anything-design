# Distribution

> 8 平台分发策略

## 单一源码，多端发布

```
Understand-Anything (GitHub repo)
├── understand-anything-plugin/   # 1 份源码
│   ├── agents/
│   ├── skills/
│   ├── packages/
│   └── ...
├── .claude-plugin/               # Claude Code manifest
├── .cursor-plugin/               # Cursor manifest
└── .copilot-plugin/              # Copilot manifest
                │
                ▼
   [Build → Binary / Tarball / Marketplace]
                │
   ┌────────────┼────────────┐
   ▼            ▼            ▼
Claude Code   Cursor       Codex
Marketplace   Marketplace  Marketplace
```

## Claude Code

**Marketplace URL**: `https://github.com/YeLuo45/Understand-Anything/blob/main/.claude-plugin/marketplace.json`

**用户安装**:
```bash
# 在 Claude Code
/plugins marketplace add YeLuo45/Understand-Anything
/plugins install understand-anything
/understand  # 立即可用
```

**Cache 机制**: Claude Code 把插件 cache 在 `~/.claude/plugins/cache/understand-anything/understand-anything/<version>/`。版本不匹配时拉新。

## Cursor

**Marketplace**: 即将上线

**临时方案**:
```bash
# 用户 clone + 软链到 Cursor 插件目录
git clone https://github.com/YeLuo45/Understand-Anything
ln -s $(pwd)/Understand-Anything/understand-anything-plugin \
       ~/.cursor/plugins/understand-anything
```

## Codex

类似 Cursor。

## GitHub Copilot

通过 `.copilot-plugin/plugin.json`，用户在 Copilot Chat 输入 `/understand` 调用。

## Gemini CLI

读项目根 `GEMINI.md`（自动生成 by install script）。

## opencode

```json
// .opencode/agents.json (用户级)
{
  "agents": {
    "understand-anything": {
      "source": "YeLuo45/Understand-Anything/understand-anything-plugin"
    }
  }
}
```

## Mistral Vibe CLI

读 `VIBE.md`（自动生成 by install script）。

## Trae

读 `TRAE.md`（自动生成 by install script）。

## Release Checklist

- [ ] 5 个 version 文件同步
- [ ] `.claude-plugin/marketplace.json` 的 `plugins[].source` 路径正确
- [ ] Core + dashboard build 成功
- [ ] 至少 1 个 platform 的 marketplace 列出新版本
- [ ] Discord announcement
- [ ] Trendshift 提交（badge 自动更新）

## 用户增长指标

- npm / pnpm downloads（`@understand-anything/*`）
- GitHub stars
- Discord 活跃成员
- Marketplace install count
- 文档站访问（VitePress 集成 Plausible/Umami）
