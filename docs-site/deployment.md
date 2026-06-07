# Deployment

> 本地开发 + 部署到 GitHub Pages 文档站

## 文档站（本站）

基于 VitePress 1.3.4，自动 deploy 到 GitHub Pages。

```bash
cd docs-site
pnpm install
pnpm run build
# → .vitepress/dist/
```

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push:
    branches: [master]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: "pages"
  cancel-in-progress: false
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: https://yeluo45.github.io/Understand-Anything-design/
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v4
      - uses: pnpm/action-setup@v4
        with: { version: 10 }
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm install -g pnpm
      - run: pnpm install
        working-directory: ./docs-site
      - run: pnpm run build
        working-directory: ./docs-site
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./docs-site/.vitepress/dist }
      - uses: actions/deploy-pages@v4
```

## 本地调试

```bash
# 文档站
cd docs-site
pnpm run docs:dev    # http://localhost:5173/

# Understand Anything 主项目
cd ../
pnpm install
pnpm --filter @understand-anything/core build
pnpm --filter @understand-anything/dashboard dev:dashboard
```

## 发布新版本

```bash
# 1. 改源码

# 2. 同步 5 个 version 文件
NEW_VERSION=0.5.0
sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" \
  understand-anything-plugin/package.json \
  understand-anything-plugin/.claude-plugin/plugin.json \
  .claude-plugin/plugin.json \
  .cursor-plugin/plugin.json \
  .copilot-plugin/plugin.json

# 3. Build
pnpm install
pnpm --filter @understand-anything/core build
pnpm --filter @understand-anything/skill build
pnpm --filter @understand-anything/dashboard build

# 4. Test
pnpm test

# 5. Tag + push
git add .
git commit -m "release: v$NEW_VERSION"
git tag v$NEW_VERSION
git push origin master --tags
```

## 平台分发

发布到 Claude Code marketplace：

1. 推 tag → CI 触发 marketplace sync
2. 用户 `claude plugins install understand-anything` 即可

详见 [distribution.md](distribution.md)。
