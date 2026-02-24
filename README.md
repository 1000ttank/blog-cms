<div align="center">

# Blogo CMS

**基于 Next.js + GitHub API 的 Hexo 博客内容管理系统**  
**A serverless CMS for Hexo blogs powered by Next.js + GitHub API**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Hexo](https://img.shields.io/badge/Hexo-8-0E83CD)](https://hexo.io)

</div>

---

[中文](#中文) · [English](#english)

---

<a name="中文"></a>

## 简介

**Blogo CMS** 是一个无需服务器的博客内容管理系统，采用 **Jamstack + GitOps + Serverless** 架构：

- **无服务器运行**：CMS 静态导出，可部署到 GitHub Pages 等任意静态托管平台，零服务器费用
- **Git 即数据库**：所有文章变更通过 GitHub API 直接写入仓库，无需额外数据库
- **自动部署**：文章保存 → GitHub Actions 触发 → Hexo 重新生成 → GitHub Pages 更新
- **安全可靠**：GitHub Token 使用 Web Crypto API（AES-GCM）加密存储，不经过任何第三方服务器

## 工作原理

```
浏览器（Blogo CMS — Next.js 静态站点）
         │
         ▼  GitHub REST API
   GitHub 仓库（blog/）
         │
         ▼  push main → Actions 自动触发
   Hexo 生成静态页面
         │
         ▼
   GitHub Pages（公开博客）
```

## 功能特性

### 文章管理
- 文章列表（已发布 / 草稿，支持标题搜索与分类过滤）
- Markdown 编辑器（左右分栏实时预览），自动生成 Slug 与 Frontmatter
- 草稿 / 发布双向切换（自动在 `source/_posts` 与 `source/_drafts` 之间移动文件）
- 删除文章

### 仪表盘
- 统计卡片：已发布 / 草稿 / 仓库文章总数（可点击跳转文章列表）
- 最近文章列表（含草稿标识，点击直接进入编辑）
- GitHub Actions 构建状态实时显示（成功 / 失败 / 运行中）
- 跳转到博客按钮（自动读取 `_config.yml` 的 `url` + `root`）

### 配置管理
- 在线编辑 `_config.yml` 与主题配置文件（如 `_config.fluid.yml`）
- 自动快照：每次构建成功后保存配置快照到 localStorage
- 一键恢复：最新构建失败时显示"恢复配置"按钮，可回滚到上次正确配置

### 构建历史
- 全部 GitHub Actions 运行记录（分支、触发时间、耗时、状态）
- 失败记录可直接跳转到 GitHub Actions 查看详细日志

### 系统设置
- **Favicon**：上传 ZIP 图标包，自动解压并提交到博客仓库
- **自定义字体**：上传 TTF / WOFF 字体包，同步应用到博客和 CMS 界面
- **Footer HTML**：自定义博客页脚内容
- **透明度**：调整博客搜索框 / 正文区域透明度

### 入门指南

CMS 侧边栏内置分标签页的文档中心：

| 标签页 | 内容 |
|--------|------|
| 快速部署 Hexo | Token 创建、仓库配置、推送、Pages 开启全流程 |
| 更换 Hexo 主题 | npm / git clone 两种方式安装主题，主题配置说明 |
| 部署 CMS | 将 Blogo CMS 静态导出并部署到 GitHub Pages |
| Blog 常见问题 | Hexo 博客部署相关 Q&A |
| CMS 常见问题 | CMS 部署相关 Q&A |

### 版本更新通知
- 启动时自动检查 GitHub Releases 最新版本（结果缓存 24 小时）
- 有新版本时顶部显示 Banner，提供一键复制升级命令和更新日志链接

## 快速开始

### 前置条件

- Node.js 20+
- Git
- GitHub 账号

### 1. 获取代码

```bash
git clone https://github.com/1000ttank/Hexo-NX-CMS.git Blogo-CMS
cd Blogo-CMS
```

### 2. 创建 GitHub Personal Access Token

1. 访问 [GitHub Settings → Tokens (classic)](https://github.com/settings/tokens/new)
2. 勾选 `repo` 权限
3. 生成并保存 Token（格式：`ghp_xxxx...`）

### 3. 配置并推送 Hexo 博客仓库

在 GitHub 创建一个公开仓库（如 `blog`），然后：

```bash
cd blog

# 编辑 _config.yml，修改 title、url、root、deploy.repo
# 详细说明见 CMS 内置"入门指南 → 快速部署 Hexo"

npm install
git init && git add .
git commit -m "feat: initial hexo blog"
git branch -M main
git remote add origin https://github.com/<用户名>/blog.git
git push -u origin main
```

在仓库 **Settings → Secrets → Actions** 中添加 `GH_TOKEN` Secret（值为步骤 2 的 Token）。

### 4. 启动 CMS

```bash
cd blog-cms
npm install
npm run dev
```

访问 `http://localhost:3000`，填写 Token、用户名、仓库名登录即可。

### 5. 部署 CMS 到 GitHub Pages（可选）

详见 CMS 内置"入门指南 → 部署 CMS"，或查看 [`docs/deploy-cms-to-github-pages.md`](./docs/deploy-cms-to-github-pages.md)。

## 仓库结构

```
Blogo-CMS/
├── blog/                        # Hexo 静态博客
│   ├── source/
│   │   ├── _posts/              # 已发布文章
│   │   └── _drafts/             # 草稿
│   ├── _config.yml              # Hexo 核心配置
│   ├── _config.fluid.yml        # 主题配置示例（Fluid）
│   └── .github/workflows/
│       └── deploy.yml           # 自动部署 GitHub Actions
│
└── blog-cms/                    # Next.js CMS（Blogo CMS）
    ├── app/                     # App Router 页面
    │   ├── (auth)/login/        # GitHub Token 登录
    │   ├── dashboard/           # 仪表盘
    │   ├── posts/               # 文章管理
    │   ├── editor/              # Markdown 编辑器
    │   ├── config/              # 配置管理
    │   ├── builds/              # 构建历史
    │   ├── settings/            # 系统设置
    │   └── guide/               # 入门指南
    ├── components/
    │   ├── ui/                  # shadcn/ui 基础组件
    │   ├── layout/              # AppShell、Sidebar、Header
    │   ├── post/                # PostCard、PostEditor
    │   └── guide/               # GuideViewer（多标签页 Markdown 文档）
    ├── services/
    │   ├── githubClient.ts      # GitHub API 核心封装
    │   ├── postService.ts       # 文章 CRUD（含草稿 / 发布切换）
    │   └── versionService.ts    # 版本检查
    ├── store/
    │   ├── authStore.ts         # 认证状态（Zustand）
    │   └── postStore.ts         # 文章状态
    ├── config/
    │   └── constants.ts         # 全局常量
    └── docs/                    # 内置文档（Markdown，同步展示在 CMS 内）
```

## 技术栈

| 技术 | 版本 | 用途 |
|------|------|------|
| Next.js (App Router) | 15 | CMS 前端框架，支持静态导出 (`output: 'export'`) |
| TypeScript | 5 | 类型系统 |
| Zustand | 5 | 轻量客户端状态管理 |
| @octokit/rest | 20 | GitHub REST API 客户端 |
| @uiw/react-md-editor | 4 | Markdown 编辑器（实时预览） |
| @uiw/react-markdown-preview | 5 | Markdown 渲染（入门指南） |
| shadcn/ui + Tailwind CSS | — | UI 组件库与样式 |
| gray-matter | 4 | Frontmatter 解析 |
| jszip | 3 | 客户端 ZIP 解压（字体 / 图标包） |
| sonner | — | Toast 通知 |
| Hexo | 8 | 静态博客生成器 |

## 安全说明

- GitHub Token 使用 **Web Crypto API (AES-GCM)** 加密后存储在 `localStorage`
- 加密密钥随机生成，仅存在于用户浏览器本地，**不上传至任何服务器**
- 所有 API 调用均直接从浏览器发往 GitHub，无中间代理
- 建议 Token 仅开启 `repo` 权限范围

## 文档

| 文档 | 说明 |
|------|------|
| CMS 内置入门指南 | 侧边栏"入门指南"，含 5 个标签页 |
| [getting-started.md](./docs/getting-started.md) | 入门指南 Markdown 源文件 |
| [deploy-cms-to-github-pages.md](./docs/deploy-cms-to-github-pages.md) | CMS 静态部署详细步骤 |

## 贡献

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建 feature 分支：`git checkout -b feature/my-feature`
3. 提交变更：`git commit -m 'feat: add my feature'`
4. 推送分支：`git push origin feature/my-feature`
5. 创建 Pull Request

## License

[MIT](./LICENSE) © 2026 1000ttank

---

<a name="english"></a>

## English

### What is Blogo CMS?

**Blogo CMS** is a serverless content management system for [Hexo](https://hexo.io) blogs, built with Next.js and powered entirely by the GitHub API. No server, no database — just your browser, GitHub, and GitHub Actions.

### How It Works

1. Blogo CMS runs as a **static site** in your browser (deployable to GitHub Pages for free)
2. Every article change is **committed directly** to your GitHub repository via the GitHub API
3. GitHub Actions **automatically triggers** Hexo to rebuild and publish to GitHub Pages

### Key Features

| Feature | Description |
|---------|-------------|
| **Article Management** | Create, edit, delete posts with live Markdown preview; draft/publish toggle moves files between `_posts` and `_drafts` automatically |
| **Dashboard** | Stats cards (published / drafts / total), recent posts list, real-time GitHub Actions build status |
| **Config Management** | Online edit of `_config.yml` and theme configs; auto-snapshot after each successful build; one-click restore when the latest build fails |
| **Build History** | Full GitHub Actions run log with direct links to failed build details |
| **Settings** | Favicon ZIP upload, custom font packages (TTF/WOFF), footer HTML, transparency controls |
| **Getting Started Guide** | Built-in multi-tab documentation: Hexo deployment · Theme switching · CMS deployment · Blog FAQ · CMS FAQ |
| **Update Notifications** | Checks GitHub Releases for new versions on startup (24h cache); dismissible top banner with one-click upgrade command |

### Quick Start

**Prerequisites:** Node.js 20+, Git, GitHub account

```bash
# 1. Clone the repo
git clone https://github.com/1000ttank/Hexo-NX-CMS.git Blogo-CMS
cd Blogo-CMS

# 2. Start the CMS
cd blog-cms
npm install
npm run dev
```

Open `http://localhost:3000` and log in with your GitHub Personal Access Token (`repo` scope required).

For the full setup guide (creating a Hexo blog repo, configuring GitHub Actions, enabling GitHub Pages), see the **Getting Started** guide built into the CMS sidebar.

### Deploy CMS to GitHub Pages

Blogo CMS supports static export via `next build` (`output: 'export'`). Refer to [`docs/deploy-cms-to-github-pages.md`](./docs/deploy-cms-to-github-pages.md) for step-by-step instructions, or open the "Deploy CMS" tab in the built-in Getting Started guide.

### Repository Structure

```
Blogo-CMS/
├── blog/          # Hexo static blog (push to GitHub, auto-deploy via Actions)
└── blog-cms/      # Next.js CMS (Blogo CMS)
    ├── app/       # Pages: dashboard, posts, editor, config, builds, settings, guide
    ├── services/  # GitHub API wrappers (post CRUD, version check)
    ├── store/     # Zustand state (auth, posts)
    └── docs/      # Built-in documentation (rendered in the CMS guide page)
```

### Tech Stack

Next.js 15 · TypeScript 5 · Zustand · @octokit/rest · shadcn/ui · Tailwind CSS · gray-matter · jszip · Hexo 8

### Security

- GitHub Token is encrypted with **Web Crypto API (AES-GCM)** and stored in `localStorage`
- The encryption key is generated locally in your browser — it never leaves your device
- All API calls go **directly from your browser to GitHub** — no proxy, no third-party server
- Minimum required Token scope: `repo`

### Contributing

Issues and Pull Requests are welcome!  
Please follow the [Conventional Commits](https://www.conventionalcommits.org/) specification.

### License

[MIT](./LICENSE) © 2026 1000ttank
