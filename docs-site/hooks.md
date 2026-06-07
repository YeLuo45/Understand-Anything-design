# Hooks

> `understand-anything-plugin/hooks/` — Claude Code 钩子

## hooks.json

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "node hooks/auto-update-prompt.mjs",
            "timeout": 30
          }
        ]
      }
    ]
  }
}
```

## auto-update-prompt

**触发**: 任何 Write/Edit/MultiEdit 后

**行为**:
- 检测改动的文件是否在 `.understand-anything/` 监控列表
- 如果是 graph 节点对应的源码 → 提示 "建议运行 `/understand` 更新图谱"
- 如果是 `knowledge-graph.json` → 不提示（避免循环）
- 输出到 stderr（Claude Code 看到 → 转给用户）

```ts
// hooks/auto-update-prompt.mjs (简化)
const changedFiles = process.env.CLAUDE_TOOL_INPUT.split('\n')
                   .map(l => extractPath(l))
                   .filter(Boolean)

const watchList = loadWatchList()  // graph node paths
const intersection = changedFiles.filter(f => watchList.has(f))

if (intersection.length > 0) {
  console.error(`[understand-anything] ${intersection.length} file(s) changed. ` +
                `Run \`/understand\` to refresh the knowledge graph.`)
}
```

## 其他平台

- **Cursor**: 暂不支持 hooks，agent 在 prompt 上下文运行
- **Codex**: 同 Cursor
- **Gemini**: 读 `GEMINI.md` 触发行为，无 hooks
- **opencode**: 部分支持 `pre-commit` 风格钩子
