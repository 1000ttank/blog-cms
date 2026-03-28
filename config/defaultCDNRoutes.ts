/**
 * 默认 CDN 线路配置
 */

import type { CDNRoute } from '@/types/imageHosting'

export interface DefaultRouteConfig {
  primary: CDNRoute | 'custom'
  custom_domain?: string  // 自定义 CDN 域名
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
  'github-raw': {
    name: 'GitHub Raw',
    description: '直接从 GitHub 获取，速度较慢',
    template: 'https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}',
  },
  custom: {
    name: '自定义 CDN 域名',
    description: '使用 Cloudflare Workers 智能路由到 jsDelivr/Statically',
    template: 'https://{custom_domain}/gh/{owner}/{repo}@{branch}/{path}',
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
 * 从博客仓库读取 CDN 配置
 */
export async function loadCDNConfigFromRepo(
  owner: string,
  repo: string
): Promise<DefaultRouteConfig | null> {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/${owner}/${repo}/main/source/_data/cdn-config.json`
    )
    if (response.ok) {
      return await response.json()
    }
  } catch {
    console.log('No custom CDN config found, using defaults')
  }
  return null
}

/**
 * 获取默认线路的 URL
 */
export function getDefaultRouteUrl(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  customConfig?: DefaultRouteConfig
): string {
  const config = customConfig || DEFAULT_ROUTE_CONFIG
  const { primary, custom_domain } = config

  return generateRouteUrl(primary, owner, repo, branch, path, custom_domain)
}

/**
 * 获取备用线路的 URL 列表
 */
export function getFallbackRouteUrls(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  customConfig?: DefaultRouteConfig
): string[] {
  const config = customConfig || DEFAULT_ROUTE_CONFIG
  const { fallback, custom_domain } = config

  return fallback
    .map((route) => generateRouteUrl(route as CDNRoute | 'custom', owner, repo, branch, path, custom_domain))
    .filter(Boolean)
}

/**
 * 生成指定线路的 URL
 */
function generateRouteUrl(
  route: CDNRoute | 'custom',
  owner: string,
  repo: string,
  branch: string,
  path: string,
  customDomain?: string
): string {
  switch (route) {
    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/gh/${owner}/${repo}@${branch}/${path}`
    case 'statically':
      return `https://cdn.statically.io/gh/${owner}/${repo}/${branch}/${path}`
    case 'github-raw':
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
    case 'custom':
      if (!customDomain) return ''
      // 移除协议前缀
      const domain = customDomain.replace(/^https?:\/\//, '')
      return `https://${domain}/gh/${owner}/${repo}@${branch}/${path}`
    default:
      return ''
  }
}

