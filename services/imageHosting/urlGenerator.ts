/**
 * 图片 URL 生成器（支持多级降级）
 */

import type { ImageHostingConfig } from '@/types/imageHosting'
import { getDefaultRouteUrl, getFallbackRouteUrls } from '@/config/defaultCDNRoutes'

/**
 * 生成图片 URL
 */
export function generateImageUrl(config: ImageHostingConfig, filePath: string): string {
  const { repoOwner, repoName, branch, cdnRoute, cloudflareConfig } = config

  switch (cdnRoute) {
    case 'default':
      return getDefaultRouteUrl(repoOwner, repoName, branch, filePath)

    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@${branch}/${filePath}`

    case 'statically':
      return `https://cdn.statically.io/gh/${repoOwner}/${repoName}/${branch}/${filePath}`

    case 'cloudflare':
      if (!cloudflareConfig?.domain) {
        // 如果没有配置域名，降级到默认线路
        if (cloudflareConfig?.useDefaultRoute) {
          return getDefaultRouteUrl(repoOwner, repoName, branch, filePath)
        }
        throw new Error('未配置 Cloudflare 域名')
      }
      return `https://${cloudflareConfig.domain}/${filePath}`

    default:
      return `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${filePath}`
  }
}

/**
 * 生成带降级的 URL 列表
 * 用于图片加载失败时自动切换
 */
export function generateImageUrlsWithFallback(
  config: ImageHostingConfig,
  filePath: string
): string[] {
  const { repoOwner, repoName, branch, cdnRoute, cloudflareConfig } = config

  const urls: string[] = []

  // 主 URL
  urls.push(generateImageUrl(config, filePath))

  // 如果是 Cloudflare 且启用了默认线路降级
  if (cdnRoute === 'cloudflare' && cloudflareConfig?.useDefaultRoute) {
    urls.push(getDefaultRouteUrl(repoOwner, repoName, branch, filePath))
  }

  // 添加所有备用线路
  urls.push(...getFallbackRouteUrls(repoOwner, repoName, branch, filePath))

  // 去重
  return [...new Set(urls)]
}

/**
 * 生成预览 URL（用于配置界面）
 */
export function generatePreviewUrl(
  cdnRoute: string,
  owner: string,
  repo: string,
  customDomain: string,
  imagePath: string
): string {
  const exampleFile = '2024/03/example-image.png'
  const fullPath = `${imagePath}/${exampleFile}`

  switch (cdnRoute) {
    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@main/${fullPath}`
    case 'statically':
      return `https://cdn.statically.io/gh/${owner}/${repo}/main/${fullPath}`
    case 'cloudflare':
      return customDomain
        ? `https://${customDomain}/${fullPath}`
        : `https://your-domain.com/${fullPath}`
    case 'default':
      return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@main/${fullPath} (推荐线路)`
    default:
      return ''
  }
}
