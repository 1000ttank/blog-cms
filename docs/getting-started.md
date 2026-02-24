# 新手入门指南：GitHub 配置全流程

本文档面向第一次使用 Blogo CMS 的用户，带你从零完成所有 GitHub 配置。

---

## 前置要求

- 已有 [GitHub](https://github.com) 账号
- 本地已安装 Node.js 20+（运行 `node -v` 确认版本）
- 本地已安装 Git（运行 `git --version` 确认安装）

---

## 整体流程概览

```
第一步  创建 GitHub Personal Access Token
第二步  在 GitHub 创建 blog 仓库
第三步  修改 blog/_config.yml 配置
第四步  在仓库设置 GH_TOKEN Secret
第五步  将 blog/ 推送到 GitHub（Actions 自动创建 gh-pages 分支）
第六步  开启 GitHub Pages（选择 gh-pages 分支）
第七步  启动 CMS，填写登录信息
```

---

## 第一步：创建 GitHub Personal Access Token

Token 是 CMS 与 GitHub 通信的凭证，用于读写博客文章。

1. 登录 GitHub，点击右上角头像 → **Settings**

2. 左侧菜单滚动到最底部，点击 **Developer settings**

3. 点击 **Personal access tokens** → **Tokens (classic)**

4. 点击右上角 **Generate new token** → **Generate new token (classic)**

5. 填写表单：
   - **Note（备注）**：填写 `blogo-cms`（用于区分用途，随意填写）
   - **Expiration（有效期）**：建议选 `No expiration` 或 `1 year`
   - **Select scopes（权限）**：勾选 `repo`（展开后会自动勾选所有 repo 子项）

   > 建议只勾选 `repo`，无需勾选其他权限

6. 点击底部 **Generate token**

7. **立即复制生成的 Token**（页面刷新或关闭后将无法再次查看）
   - Token 格式为：`ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - 请将其保存到安全的地方（如密码管理器）

---

## 第二步：在 GitHub 创建 blog 仓库

1. 点击 GitHub 右上角 **+** → **New repository**

2. 填写仓库信息：
   - **Repository name**：填写 `blog`（或你喜欢的名称，后续配置中需要用到）
   - **Visibility**：选 **Public**（GitHub Pages 免费版要求公开仓库）
   - **Initialize this repository with**：**三项全部不勾选**（README、.gitignore、License 均不选）

3. 点击 **Create repository**，得到一个空仓库

4. 记录仓库地址，格式为：
   ```
   https://github.com/你的用户名/blog
   ```

---

## 第三步：修改 blog/_config.yml 配置

打开本地 `blog/_config.yml` 文件，修改以下三处：

```yaml
# 第 1 处：网站信息
title: 我的博客          # 改成你的博客名称
author: 你的名字         # 改成你的名字

# 第 2 处：网站地址（格式：https://用户名.github.io/仓库名）
url: https://你的用户名.github.io/blog
root: /blog/             # 斜杠 + 仓库名 + 斜杠

# 第 3 处：部署配置
deploy:
  type: git
  repo: https://github.com/你的用户名/blog.git
  branch: gh-pages
```

**示例**（假设 GitHub 用户名为 `zhangsan`，仓库名为 `blog`）：

```yaml
title: 张三的技术博客
author: 张三
url: https://zhangsan.github.io/blog
root: /blog/
deploy:
  type: git
  repo: https://github.com/zhangsan/blog.git
  branch: gh-pages
```

> **特殊情况：** 如果仓库名是 `用户名.github.io`（个人主页仓库），则 `url` 填 `https://用户名.github.io`，`root` 填 `/`。

---

## 第四步：在仓库设置 GH_TOKEN Secret

GitHub Actions 需要此 Secret 才能将博客自动部署到 GitHub Pages。

部署流程中，工作流会在运行前动态替换 `_config.yml` 里的 deploy 地址，将 Token 直接嵌入 URL，以完成推送认证：

```bash
sed -i "s|https://github.com/|https://x-access-token:${GH_TOKEN}@github.com/|" _config.yml
```

例如，`https://github.com/用户名/blog.git` 会被替换为 `https://x-access-token:TOKEN@github.com/用户名/blog.git`。**因此必须正确设置 GH_TOKEN Secret，否则部署会报 `Authentication failed` 错误。**

1. 打开 `blog` 仓库页面，点击顶部 **Settings** 标签

2. 左侧菜单找到 **Secrets and variables** → **Actions**

3. 点击 **New repository secret**

4. 填写：
   - **Name**：`GH_TOKEN`（必须完全一致，区分大小写，全大写）
   - **Secret**：粘贴第一步复制的 Token（不要添加多余空格）

5. 点击 **Add secret**

---

## 第五步：将 blog/ 推送到 GitHub

打开终端，进入 `blog/` 目录，依次执行以下命令：

```bash
cd /path/to/Blogo-CMS/blog

# 安装依赖，生成 package-lock.json（GitHub Actions 的 npm ci 命令需要此文件）
npm install

# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 创建首次提交
git commit -m "feat: initial hexo blog setup"

# 设置主分支名为 main
git branch -M main

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/blog.git

# 推送到 GitHub
git push -u origin main
```

推送成功后，打开仓库的 **Actions** 标签页，等待自动构建完成（约 1–2 分钟，显示绿色 ✅）。

> **构建失败时的排查步骤：**
> 1. 进入仓库 **Settings → Secrets and variables → Actions**，确认 `GH_TOKEN` 存在且名称完全正确
> 2. 若 Secret 存在但仍报错，可能是 Token 已过期或权限不足，前往 **GitHub → Settings → Developer settings → Personal access tokens** 重新生成，删除旧 Secret 后重新添加

Actions 成功运行后，`gh-pages` 分支会被自动创建。

---

## 第六步：开启 GitHub Pages

> ⚠️ 请务必在第五步 Actions 运行成功、`gh-pages` 分支创建后，再操作此步骤。

1. 在 `blog` 仓库页面，点击顶部 **Settings** 标签

2. 左侧菜单找到 **Pages**

3. **Source** 选择 **Deploy from a branch**

4. **Branch** 下拉框选择 `gh-pages`，路径选 `/ (root)`

5. 点击 **Save**

6. 设置成功后，博客地址为：`https://你的用户名.github.io/blog/`

   > 首次配置后稍等约 1 分钟，GitHub 完成发布后即可访问。

---

## 第七步：启动 CMS 并登录

```bash
cd /path/to/Blogo-CMS/blog-cms

# 首次使用时安装依赖（已安装可跳过）
npm install

# 启动开发服务器
npm run dev
```

浏览器访问 `http://localhost:3000`，在登录页填写以下信息：

| 字段 | 填写内容 | 示例 |
|------|----------|------|
| GitHub Token | 第一步创建的 Token | `ghp_xxx...` |
| GitHub 用户名 | 你的 GitHub 登录名 | `zhangsan` |
| 仓库名称 | blog 仓库的名字 | `blog` |
| 分支 | 留空默认 `main` | `main` |

点击**使用 GitHub Token 登录**，验证成功后跳转至仪表盘。

---

## 验证整个流程是否正常

按以下步骤依次确认：

1. **CMS 登录成功** → 仪表盘显示"已发布文章：0，草稿：0"
2. **新建一篇文章** → 点击"新建文章"，填写标题，点击"保存"
3. **查看 GitHub 仓库** → `source/_posts/` 目录出现新的 `.md` 文件
4. **查看 Actions** → 自动触发构建，约 1–2 分钟后显示绿色 ✅
5. **访问博客** → `https://你的用户名.github.io/blog/` 出现新文章

---

## 附：更换 Hexo 主题

默认主题 `landscape` 较为简单，推荐更换为更现代的主题。

### 推荐主题

| 主题 | 风格 | npm 安装支持 | 官方文档 |
|------|------|------|------|
| [Fluid](https://github.com/fluid-dev/hexo-theme-fluid) | 现代简洁 | ✅ | [文档](https://hexo.fluid-dev.com/docs/) |
| [NexT](https://github.com/next-theme/hexo-theme-next) | 经典简约 | ✅ | [文档](https://theme-next.js.org/) |
| [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) | 丰富美观 | ✅ | [文档](https://butterfly.js.org/) |

---

### 方式一：npm 安装（推荐，Hexo 8 支持）

以 **Fluid** 主题为例：

**1. 在 `blog/` 目录安装主题包：**

```bash
cd /path/to/blog
npm install --save hexo-theme-fluid
```

**2. 将主题的默认配置复制到 `blog/` 根目录：**

```bash
cp node_modules/hexo-theme-fluid/_config.yml _config.fluid.yml
```

> 文件名格式为 `_config.主题名.yml`，Hexo 会自动读取此文件作为主题配置，无需修改 `themes/` 目录。

**3. 修改 `_config.yml` 启用主题：**

```yaml
theme: fluid
```

**4. 提交并推送：**

```bash
git add .
git commit -m "feat: add fluid theme"
git push
```

等待 Actions 完成后，博客样式即刻更新。

---

### 方式二：git clone 安装（通用方式）

以 **NexT** 主题为例：

**1. 将主题克隆到 `themes/` 目录：**

```bash
cd /path/to/blog
git clone https://github.com/next-theme/hexo-theme-next themes/next
```

**2. 修改 `_config.yml` 启用主题：**

```yaml
theme: next
```

**3. 提交并推送：**

```bash
# 删除主题目录内的 .git 文件夹，避免被识别为 submodule
rm -rf themes/next/.git

git add themes/next
git commit -m "feat: add next theme"
git push
```

> ⚠️ 使用 git clone 方式时，如果不删除主题内的 `.git` 目录，`git add` 会将其作为 **git submodule** 处理，导致 Actions 构建时拉取不到主题文件。请务必先执行 `rm -rf themes/next/.git`。

---

### 主题配置说明

- **npm 方式**：主题配置在根目录的 `_config.主题名.yml`（如 `_config.fluid.yml`）
- **clone 方式**：主题配置在 `themes/主题名/_config.yml`（如 `themes/next/_config.yml`）

修改主题配置后，同样需要 `git commit` + `git push` 触发自动部署。

也可以直接在 CMS 的 **配置管理** 页面在线编辑这两个配置文件，保存后自动提交并触发构建。

---

## 部署 CMS 到 GitHub Pages

将 blog-cms（Next.js CMS）静态导出并托管在 GitHub Pages 上，使其可以通过公网访问。

> **说明**：CMS 本身不含敏感数据，所有操作通过浏览器 + GitHub API 完成，静态托管完全安全。

---

### 第一步：在 GitHub 创建仓库

1. 登录 [github.com](https://github.com)，点击右上角 **+** → **New repository**
2. 填写仓库信息：
   - **Repository name**：填写仓库名
     - 若想用根路径访问（`https://<username>.github.io/`），填写 `<username>.github.io`
     - 若用子路径访问（`https://<username>.github.io/blog-cms/`），填写 `blog-cms` 或任意名称
   - **Visibility**：**Public**（GitHub Pages 免费版需公开仓库）
   - **不要**勾选 "Add a README file"、".gitignore"、"license"（本地已有）
3. 点击 **Create repository**，记下仓库地址，形如：
   ```
   https://github.com/<username>/<repo>.git
   ```

---

### 第二步：将本地代码推送到 GitHub

在终端进入 `blog-cms/` 目录执行：

```bash
cd blog-cms

# 安装依赖，生成 package-lock.json（Actions 需要此文件）
npm install

# 初始化 Git 仓库（如果尚未初始化）
git init

# 将所有文件加入暂存区
git add .

# 首次提交
git commit -m "feat: initial commit"

# 关联远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/<username>/<repo>.git

# 推送到 main 分支
git branch -M main
git push -u origin main
```

> **提示**：如果推送时要求输入密码，请使用 GitHub **Personal Access Token**（PAT）而非账号密码。  
> 在 GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic) 创建一个具有 `repo` 权限的 Token，将其作为密码粘贴。

> **注意**：`package-lock.json` **必须提交**到仓库，否则 GitHub Actions 的 `npm ci` 步骤会报错。请确认 `.gitignore` 中**没有** `package-lock.json` 这一行。

---

### 第三步：修改 next.config.ts

根据仓库名选择配置：

**情况 A：仓库名为 `<username>.github.io`（根路径部署）**

```ts
import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
```

**情况 B：仓库名为其他（如 `blog-cms`）**

```ts
import path from 'path'
import type { NextConfig } from 'next'

const REPO_NAME = 'blog-cms'   // 改为你的仓库名

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: `/${REPO_NAME}`,
  assetPrefix: `/${REPO_NAME}/`,
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '**.githubusercontent.com' },
    ],
  },
  outputFileTracingRoot: path.join(__dirname),
}

export default nextConfig
```

---

### 第四步：添加 .nojekyll 文件

GitHub Pages 默认启用 Jekyll，会忽略所有以 `_` 开头的目录（包括 `_next/`），导致页面资源加载失败。

```bash
# 在 blog-cms/ 目录下执行
touch public/.nojekyll
```

---

### 第五步：创建 GitHub Actions 工作流

创建文件 `.github/workflows/deploy-cms.yml`：

```yaml
name: Deploy CMS to GitHub Pages

on:
  push:
    branches:
      - main

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build (Static Export)
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

---

### 第六步：在 GitHub 启用 Pages

> ⚠️ **必须先完成此步骤，再推送代码触发 Actions**。如果 Pages 未启用就触发部署，Actions 会报错：  
> `创建部署失败（状态：404）…请确保已启用 GitHub Pages`

1. 打开 `https://github.com/<username>/<repo>/settings/pages`
2. 在 **Source** 下拉菜单中选择 **GitHub Actions**
3. 点击 **Save** 保存

---

### 第七步：提交并推送所有改动

```bash
cd blog-cms
git add .
git commit -m "feat: add static export config and GitHub Actions for Pages"
git push
```

---

### 第八步：验证部署

等待 Actions 运行完成（约 1~3 分钟），访问你的 CMS 地址：

- 根路径部署：`https://<username>.github.io/`
- 子路径部署：`https://<username>.github.io/blog-cms/`

打开后应看到登录页面，输入 GitHub Token 即可正常使用。

---

### 后续更新 CMS

每次修改代码后，将改动推送到 `main` 分支，GitHub Actions 会自动重新构建并部署，通常 2 分钟内生效：

```bash
git add .
git commit -m "your commit message"
git push
```

---

## 常见问题

**Q：GitHub Actions 报错 `remote: Permission to ... denied` 或 `Process completed with exit code 2`**

这两种错误都是 `hexo deploy` 推送 `gh-pages` 分支时认证失败导致的。依次检查：

1. Secret 名称是否完全为 `GH_TOKEN`（全大写，无多余空格）
2. Token 是否具有 `repo` 权限
3. Token 是否已过期（前往 GitHub → Settings → Developer settings → Tokens 确认）

---

**Q：博客地址打开是 404**

确认第六步 GitHub Pages 已设置为 `gh-pages` 分支。`gh-pages` 分支在第五步 Actions 首次运行成功后才会创建，之后回来设置即可。

---

**Q：CMS 登录提示"验证失败"**

检查 Token 是否已过期，或仓库名称、用户名是否填写有误（区分大小写）。

---

**Q：保存文章后博客没有立即更新**

每次通过 CMS 保存文章，会自动提交到 GitHub 并触发 Actions 重新部署，等待约 1–2 分钟后刷新博客即可看到新内容。可在 CMS 的 **构建历史** 页面实时查看构建状态。

---

**Q：`git push` 报错 `rejected ... non-fast-forward`**

远程分支存在本地没有的新提交，需要先拉取再推送：

```bash
git pull --rebase origin main
git push
```

若拉取时提示输入密码，请填写 **GitHub Token**（不是 GitHub 账号密码）。

`--rebase` 会把本地的新提交整齐地接在远程提交之后，避免产生多余的 merge commit。

---

**Q：打开博客页面后没有显示内容**

可能是缺少主题配置，详见上方 **更换 Hexo 主题** 标签页。

---

## CMS 常见问题

### Q：页面空白或 JS/CSS 资源 404

- 检查 `next.config.ts` 中 `basePath` 是否与仓库名完全一致
- 确认 `public/.nojekyll` 文件已创建并提交
- 确认 Actions 工作流中 `path: ./out` 正确

---

### Q：Actions 失败，提示 npm ci 错误

确保 `package-lock.json` 已提交到仓库（`.gitignore` 中不能有此文件名）。

---

### Q：Actions deploy 步骤报错"创建部署失败（状态：404）"

错误完整内容类似：

```
创建部署失败（状态：404）。请确保已启用 GitHub Pages
HttpError: Not Found
```

原因是 GitHub Pages 尚未启用。解决方法：

1. 打开 `https://github.com/<username>/<repo>/settings/pages`
2. **Source** 选择 **GitHub Actions** 并保存
3. 重新触发 Actions：
   ```bash
   git commit --allow-empty -m "chore: trigger pages deployment"
   git push
   ```

---

### Q：git push 被拒绝，提示 non-fast-forward

```bash
git pull --rebase origin main
git push
```

---

### Q：登录后刷新页面 Token 丢失

正常行为，Token 存储在浏览器 `localStorage`，清除缓存后需重新登录。

---

### Q：如何使用自定义域名？

在仓库 **Settings → Pages → Custom domain** 填写域名，同时在 `public/` 目录下创建 `CNAME` 文件，内容为你的域名：

```
cms.yourdomain.com
```

此时 `next.config.ts` 中的 `basePath` 应置为空（按情况 A 配置）。
