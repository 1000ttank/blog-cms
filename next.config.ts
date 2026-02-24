import path from 'path'
import type { NextConfig } from 'next'

const REPO_NAME = 'blog-cms'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath: `/${REPO_NAME}`,   // 子路径部署必须设置
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
