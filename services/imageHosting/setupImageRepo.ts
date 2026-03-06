/**
 * 图床仓库自动创建服务
 */

import { Octokit } from '@octokit/rest'

export interface SetupResult {
  success: boolean
  repoUrl: string
  message?: string
}

/**
 * 创建图床仓库
 */
export async function setupImageRepository(
  token: string,
  owner: string,
  repoName: string = 'blog-images'
): Promise<SetupResult> {
  const octokit = new Octokit({ auth: token })

  try {
    // 1. 检查仓库是否已存在
    try {
      const { data: existingRepo } = await octokit.repos.get({
        owner,
        repo: repoName,
      })
      return {
        success: true,
        repoUrl: existingRepo.html_url,
        message: '仓库已存在',
      }
    } catch (error) {
      // 检查是否是 404 错误
      if (error && typeof error === 'object' && 'status' in error && error.status !== 404) {
        throw error
      }
      // 仓库不存在，继续创建
    }

    // 2. 创建新仓库
    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: '博客图床 - 由 Hexo-NX-CMS 自动创建',
      private: false, // 公开仓库才能使用 CDN
      auto_init: true, // 自动初始化 README
    })

    // 等待仓库初始化完成
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // 3. 创建 images 目录（通过创建 .gitkeep 文件）
    try {
      await octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path: 'images/.gitkeep',
        message: 'Initialize images directory',
        content: Buffer.from('').toString('base64'),
      })
    } catch (error) {
      console.warn('Failed to create images directory:', error)
    }

    // 4. 更新 README
    const readmeContent = `# Blog Images

这是由 [Hexo-NX-CMS](https://github.com/your-org/hexo-nx-cms) 自动创建的图床仓库。

## 目录结构

\`\`\`
images/
  ├── 2024/
  │   ├── 01/
  │   └── 02/
  └── ...
\`\`\`

## CDN 加速

- **jsDelivr**: \`https://cdn.jsdelivr.net/gh/${owner}/${repoName}@main/images/xxx.png\`
- **Statically**: \`https://cdn.statically.io/gh/${owner}/${repoName}/main/images/xxx.png\`
- **自定义域名**: \`https://img.yourdomain.com/images/xxx.png\`

## 使用说明

此仓库用于存储博客文章中的图片，通过 CDN 加速访问。

图片按年月分文件夹存储，例如：
- \`images/2024/03/example.png\`
- \`images/2024/04/screenshot.jpg\`

## 管理

- 可以在 Hexo-NX-CMS 中直接上传和管理图片
- 支持拖拽上传、粘贴上传
- 自动生成 Markdown 图片语法
`

    try {
      // 获取现有 README 的 SHA
      const { data: readmeFile } = await octokit.repos.getContent({
        owner,
        repo: repoName,
        path: 'README.md',
      })

      if ('sha' in readmeFile) {
        await octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path: 'README.md',
          message: 'Update README with image hosting info',
          content: Buffer.from(readmeContent).toString('base64'),
          sha: readmeFile.sha,
        })
      }
    } catch (error) {
      console.warn('Failed to update README:', error)
    }

    return {
      success: true,
      repoUrl: repo.html_url,
      message: '仓库创建成功',
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    throw new Error(`创建图床仓库失败: ${errorMessage}`)
  }
}

/**
 * 检查图床仓库是否存在
 */
export async function checkImageRepository(
  token: string,
  owner: string,
  repoName: string
): Promise<boolean> {
  const octokit = new Octokit({ auth: token })

  try {
    await octokit.repos.get({ owner, repo: repoName })
    return true
  } catch {
    return false
  }
}
