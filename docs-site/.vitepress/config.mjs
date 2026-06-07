import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Understand Anything Design",
  description:
    "Understand Anything — 将任意代码库转换为可探索的交互式知识图谱。Claude Code / Codex / Cursor / Copilot / Gemini 插件架构设计文档。",
  base: "/Understand-Anything-design/",
  head: [
    ["link", { rel: "icon", href: "/favicon.svg" }],
    [
      "meta",
      { name: "theme-color", content: "#0a0a0a" },
    ],
  ],
  themeConfig: {
    nav: [
      { text: "Home", link: "/" },
      { text: "Architecture", link: "/architecture" },
      { text: "Tech Stack", link: "/tech-stack" },
      { text: "Core", link: "/backend" },
      { text: "Dashboard", link: "/frontend" },
      { text: "Agents", link: "/agents" },
      { text: "Skills", link: "/skills" },
      { text: "Deployment", link: "/deployment" },
    ],
    sidebar: [
      {
        text: "Getting Started",
        items: [
          { text: "Home", link: "/" },
          { text: "Architecture", link: "/architecture" },
          { text: "Tech Stack", link: "/tech-stack" },
        ],
      },
      {
        text: "Core Packages",
        items: [
          { text: "Overview", link: "/backend" },
          { text: "Data Models", link: "/data-models" },
          { text: "Plugin System", link: "/plugins" },
          { text: "Languages", link: "/languages" },
          { text: "Frameworks", link: "/frameworks" },
        ],
      },
      {
        text: "Dashboard",
        items: [
          { text: "Overview", link: "/frontend" },
          { text: "Knowledge Graph UI", link: "/knowledge-graph" },
        ],
      },
      {
        text: "Agent Pipeline",
        items: [
          { text: "Agents", link: "/agents" },
          { text: "Skills", link: "/skills" },
          { text: "Pipeline Stages", link: "/pipeline" },
        ],
      },
      {
        text: "Integration",
        items: [
          { text: "Platforms", link: "/integration" },
          { text: "Hooks", link: "/hooks" },
        ],
      },
      {
        text: "Build & Ship",
        items: [
          { text: "Local Dev", link: "/deployment" },
          { text: "Distribution", link: "/distribution" },
        ],
      },
    ],
    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/YeLuo45/Understand-Anything",
      },
    ],
  },
  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
  lastUpdated: true,
});
