/**
 * 默认 CDN 线路配置
 */

import type { CDNRoute } from '@/types/imageHosting'

export interface DefaultRouteConfig {
  primary: CDNRoute
  fallback: string[]
  description: string
}

export const DEFAULT_ROUTE_CONFIG: DefaultRouteConfig = {
  primary: 'jsdelivr',
  fallback: ['statically', 'github-raw'],
  description: '默认使用 jsDelivr，失败时自动切换到 Statically 或 GitHub Raw',
}

export const CDN_ROUTE_INFO = {
  jsdelivr: {
    name: 'jsDelivr',
    description: '全球 CDN，速度快，但国内可能不稳定',
    template: 'https://cdn.jsdelivr.net/gh/{owner}/{repo}@{branch}/{path}',
  },
  statically: {
    name: 'Statically',
    description: '全球 CDN，备用方案',
    template: 'https://cdn.statically.io/gh/{owner}/{repo}/{branch}/{path}',
  },
  cloudflare: {
    name: 'Cloudflare 自定义域名',
    description: '使用你的域名 + Cloudflare CDN，国内访问友好',
    template: 'https://{domain}/{path}',
  },
  default: {
    name: '默认线路（推荐）',
    description: '由博客作者推荐的最佳线路，国内访问优化',
    template: '',
  },
}

/**
 * 获取默认线路的 URL
 */
export function getDefaultRouteUrl(
  owner: string,
  repo: string,
  branch: string,
  path: string
): string {
  const { primary } = DEFAULT_ROUTE_CONFIG

  switch (primary) {
    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`
    case 'statically':
      return `https://cdn.statically.io/gh/${owner}/${repo}/${branch}/${path}`
    default:
      return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`
  }
}

/**
 * 获取备用线路的 URL 列表
 */
export function getFallbackRouteUrls(
  owner: string,
  repo: string,
  branch: string,
  path: string
): string[] {
  const { fallback } = DEFAULT_ROUTE_CONFIG

  return fallback
    .map((route) => {
      switch (route) {
        case 'jsdelivr':
          return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`
        case 'statically':
          return `https://cdn.statically.io/gh/${owner}/${repo}/${branch}/${path}`
        case 'github-raw':
          return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
        default:
          return ''
      }
    })
    .filter(Boolean)
}
