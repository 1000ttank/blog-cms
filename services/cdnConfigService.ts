import { githubClient } from './githubClient'
import yaml from 'js-yaml'

export interface CDNRoute {
  name: string
  base_url: string
  format: string
}

export interface CDNConfig {
  default_route: 'jsdelivr' | 'statically'
  routes: {
    jsdelivr: CDNRoute
    statically: CDNRoute
  }
  image_hosting?: {
    repository: string
    branch: string
    path: string
    route: 'jsdelivr' | 'statically'
  }
}

const CDN_CONFIG_PATH = 'source/_data/cdn-config.yml'

const DEFAULT_CDN_CONFIG: CDNConfig = {
  default_route: 'jsdelivr',
  routes: {
    jsdelivr: {
      name: 'jsDelivr',
      base_url: 'https://cdn.jsdelivr.net/gh',
      format: '{base_url}/{owner}/{repo}@{branch}/{path}',
    },
    statically: {
      name: 'Statically',
      base_url: 'https://cdn.statically.io/gh',
      format: '{base_url}/{owner}/{repo}/{branch}/{path}',
    },
  },
}

export const cdnConfigService = {
  /**
   * 读取 CDN 配置
   */
  async getCDNConfig(owner: string, repo: string): Promise<CDNConfig> {
    try {
      const content = await githubClient.getFileContent(owner, repo, CDN_CONFIG_PATH)
      const config = yaml.load(content) as CDNConfig
      return { ...DEFAULT_CDN_CONFIG, ...config }
    } catch (error) {
      console.log('CDN config not found, using defaults')
      return DEFAULT_CDN_CONFIG
    }
  },

  /**
   * 保存 CDN 配置
   */
  async saveCDNConfig(
    owner: string,
    repo: string,
    config: CDNConfig,
    message = 'Update CDN configuration'
  ): Promise<void> {
    const content = yaml.dump(config, {
      indent: 2,
      lineWidth: -1,
    })

    await githubClient.createOrUpdateFile(owner, repo, CDN_CONFIG_PATH, content, message)
  },

  /**
   * 生成 CDN URL
   */
  generateCDNUrl(
    route: 'jsdelivr' | 'statically',
    owner: string,
    repo: string,
    branch: string,
    path: string,
    config?: CDNConfig
  ): string {
    const routeConfig = config?.routes[route] || DEFAULT_CDN_CONFIG.routes[route]

    return routeConfig.format
      .replace('{base_url}', routeConfig.base_url)
      .replace('{owner}', owner)
      .replace('{repo}', repo)
      .replace('{branch}', branch)
      .replace('{path}', path)
  },

  /**
   * 获取所有可用的 CDN 线路
   */
  getAvailableRoutes(config?: CDNConfig): Array<{ value: string; label: string }> {
    const routes = config?.routes || DEFAULT_CDN_CONFIG.routes
    return Object.entries(routes).map(([key, value]) => ({
      value: key,
      label: value.name,
    }))
  },
}
