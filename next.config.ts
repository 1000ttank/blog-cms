import path from 'path'
import type { NextConfig } from 'next'

const REPO_NAME = process.env.DOCKER ? '' : 'blog-cms'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  ...(REPO_NAME && { basePath: `/${REPO_NAME}`, assetPrefix: `/${REPO_NAME}/` }),
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
