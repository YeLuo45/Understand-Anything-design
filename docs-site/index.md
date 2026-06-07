---
layout: home

hero:
  name: "Understand Anything"
  text: "Codebase → Interactive Knowledge Graph"
  tagline: "Understand Anything — 多 agent 流水线 + 知识图谱，把任意代码库变成可探索、可搜索、可问答的可视化资产"
  actions:
    - theme: brand
      text: Architecture
      link: /architecture
    - theme: alt
      text: GitHub
      link: https://github.com/YeLuo45/Understand-Anything

features:
  - icon: 🧠
    title: Multi-Agent Pipeline
    details: 9 个专业 agent（project-scanner / file-analyzer / architecture-analyzer / tour-builder / graph-reviewer / ...）协同扫描代码库
  - icon: 🕸️
    title: Knowledge Graph
    details: 每个文件、函数、类、依赖都成为图节点，React Flow 渲染 75% 占比的图 + 360px 信息侧栏
  - icon: 🌐
    title: 39+ Languages & 12 Frameworks
    details: tree-sitter WASM 解析 + 9 个语言 extractor + 12 框架 detection + 13 个配置文件 parser
  - icon: 🎨
    title: Dark Luxury Dashboard
    details: React + TypeScript + Zustand + React Flow + TailwindCSS v4，深黑 + 金色点缀，DM Serif Display
  - icon: 🔌
    title: 8 Platform Integrations
    details: Claude Code / Codex / Cursor / Copilot / Gemini CLI / opencode / Mistral Vibe / Trae — 同一个插件 manifest 多端发布
  - icon: 📚
    title: Knowledge-Base Mode
    details: 除代码库外，还支持 wiki / markdown 知识库 — 同样的 pipeline 产出可问答的图谱
  - icon: 🎯
    title: Guided Tours
    details: 自动从 import graph + layer 切分生成新手 onboarding 路径，理解项目结构
  - icon: ⚡
    title: Deterministic + LLM Hybrid
    details: 结构提取全脚本化（tree-sitter / 配置 parser），LLM 只做 semantic enrichment，省 token
---

## 项目定位

> **"The goal isn't a graph that wows you with how complex your codebase is — it's a graph that quietly teaches you how every piece fits together."**

Understand Anything 是一个 **Claude Code 插件 + 跨平台 CLI 工具**，解决「加入新团队后面对 200,000 行代码不知从哪开始」的痛点。

## 核心创新

- **多 agent 流水线** — 不靠单个 LLM 一次性输出图谱，而是把 scan/extract/analyze/merge/review 拆成独立 agent，并行 + 可恢复
- **Deterministic + LLM Hybrid** — 文件结构、import map、call graph 全部用 tree-sitter WASM + 自家 parser 脚本化提取，LLM 只负责语义摘要、layer 命名、tour 选择
- **图节点指纹（fingerprint）** — 节点 hash 包含 file path + AST signature，文件未变就 skip LLM 调用，省 60%+ token
- **8 平台单一 manifest** — 一份 plugin manifest 同时在 Claude Code / Cursor / Codex / Copilot 等市场分发
