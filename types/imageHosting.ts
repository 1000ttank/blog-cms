/**
 * 图床配置类型定义
 */

export type CDNRoute = 'jsdelivr' | 'statically' | 'cloudflare' | 'default'

export interface CloudflareConfig {
  domain: string
  useDefaultRoute: boolean
}

export interface ImageHostingConfig {
  // 基础配置
  enabled: boolean
  repoOwner: string
  repoName: string
  branch: string
  imagePath: string

  // CDN 配置
  cdnRoute: CDNRoute
  cloudflareConfig?: CloudflareConfig

  // 上传配置
  autoCompress: boolean
  maxSize: number
  allowedTypes: string[]
  namingPattern: 'timestamp' | 'hash' | 'original'
  useYearMonthFolder: boolean
}

export interface UploadResult {
  url: string
  filename: string
  size: number
  uploadedAt: Date
  path: string
}

export const DEFAULT_IMAGE_HOSTING_CONFIG: Partial<ImageHostingConfig> = {
  enabled: true,
  repoName: 'blog-images',
  branch: 'main',
  imagePath: 'images',
  cdnRoute: 'default',
  autoCompress: false,
  maxSize: 10,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
  namingPattern: 'timestamp',
  useYearMonthFolder: true,
}
