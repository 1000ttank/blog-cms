# 图床配置方案 - 更新版

## 配置界面设计

### 1. CDN 线路选择

```typescript
// config/imageHostingConfig.ts
export type CDNRoute =
  | 'jsdelivr'      // jsDelivr CDN
  | 'statically'    // Statically CDN
  | 'cloudflare'    // Cloudflare 自定义域名
  | 'default'       // 默认线路（博客推荐）

export interface CloudflareConfig {
  domain: string           // 自定义域名，例如: img.yourdomain.com
  useDefaultRoute: boolean // 是否使用默认线路
}

export interface ImageHostingConfig {
  // 基础配置
  enabled: boolean
  repoOwner: string
  repoName: string          // 默认: blog-images，可自定义
  branch: string            // 默认: main
  imagePath: string         // 默认: images

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

// 默认推荐线路配置
export const DEFAULT_CDN_ROUTES = {
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
    template: '', // 由博客配置提供
  },
}
```

### 2. 配置界面组件

```tsx
// app/settings/ImageHostingSettings.tsx
'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, CheckCircle, Info, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { setupImageRepository } from '@/services/imageHosting/setupImageRepo'

export function ImageHostingSettings() {
  const { config, token } = useAuthStore()

  // 仓库状态
  const [repoStatus, setRepoStatus] = useState<'checking' | 'exists' | 'not-exists'>('checking')
  const [repoName, setRepoName] = useState('blog-images')
  const [isCreating, setIsCreating] = useState(false)

  // CDN 配置
  const [cdnRoute, setCdnRoute] = useState<CDNRoute>('default')
  const [customDomain, setCustomDomain] = useState('')
  const [useDefaultRoute, setUseDefaultRoute] = useState(true)

  // 高级配置
  const [imagePath, setImagePath] = useState('images')
  const [useYearMonthFolder, setUseYearMonthFolder] = useState(true)

  useEffect(() => {
    checkImageRepo()
    loadSavedConfig()
  }, [])

  async function checkImageRepo() {
    if (!config) return

    try {
      const octokit = getGitHubClient()
      await octokit.repos.get({
        owner: config.owner,
        repo: repoName,
      })
      setRepoStatus('exists')
    } catch {
      setRepoStatus('not-exists')
    }
  }

  function loadSavedConfig() {
    const saved = localStorage.getItem('image_hosting_config')
    if (saved) {
      const config = JSON.parse(saved)
      setRepoName(config.repoName || 'blog-images')
      setCdnRoute(config.cdnRoute || 'default')
      setCustomDomain(config.cloudflareConfig?.domain || '')
      setUseDefaultRoute(config.cloudflareConfig?.useDefaultRoute ?? true)
      setImagePath(config.imagePath || 'images')
      setUseYearMonthFolder(config.useYearMonthFolder ?? true)
    }
  }

  async function handleCreateRepo() {
    if (!config || !token) return

    setIsCreating(true)
    try {
      await setupImageRepository(token, config.owner, repoName)
      toast.success(`图床仓库 ${repoName} 创建成功！`)
      setRepoStatus('exists')
    } catch (error) {
      toast.error(`创建失败: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  function handleSaveConfig() {
    const imageConfig: ImageHostingConfig = {
      enabled: true,
      repoOwner: config!.owner,
      repoName,
      branch: 'main',
      imagePath,
      cdnRoute,
      cloudflareConfig: cdnRoute === 'cloudflare' ? {
        domain: customDomain,
        useDefaultRoute,
      } : undefined,
      autoCompress: false,
      maxSize: 10,
      allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      namingPattern: 'timestamp',
      useYearMonthFolder,
    }

    localStorage.setItem('image_hosting_config', JSON.stringify(imageConfig))
    toast.success('图床配置已保存！')
  }

  return (
    <div className="space-y-6">
      {/* 仓库配置 */}
      <Card>
        <CardHeader>
          <CardTitle>图床仓库</CardTitle>
          <CardDescription>配置用于存储图片的 GitHub 仓库</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {repoStatus === 'checking' && (
            <div className="text-sm text-muted-foreground">检查仓库状态...</div>
          )}

          {repoStatus === 'not-exists' && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>未检测到图床仓库</AlertTitle>
                <AlertDescription>
                  将自动创建一个公开仓库用于存储图片
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="repoName">仓库名称</Label>
                <Input
                  id="repoName"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="blog-images"
                />
                <p className="text-xs text-muted-foreground">
                  仓库将创建为: {config?.owner}/{repoName}
                </p>
              </div>

              <Button
                onClick={handleCreateRepo}
                disabled={isCreating || !repoName.trim()}
              >
                {isCreating ? '创建中...' : '创建图床仓库'}
              </Button>
            </>
          )}

          {repoStatus === 'exists' && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                图床仓库已就绪
              </div>

              <a
                href={`https://github.com/${config?.owner}/${repoName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                查看仓库
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CDN 线路配置 */}
      {repoStatus === 'exists' && (
        <Card>
          <CardHeader>
            <CardTitle>CDN 线路</CardTitle>
            <CardDescription>选择图片访问的 CDN 加速线路</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cdnRoute">CDN 线路</Label>
              <Select value={cdnRoute} onValueChange={(v) => setCdnRoute(v as CDNRoute)}>
                <SelectTrigger id="cdnRoute">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">默认线路（推荐）</span>
                      <span className="text-xs text-muted-foreground">
                        由博客作者推荐，国内访问优化
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="jsdelivr">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">jsDelivr</span>
                      <span className="text-xs text-muted-foreground">
                        全球 CDN，速度快
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="statically">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Statically</span>
                      <span className="text-xs text-muted-foreground">
                        全球 CDN，备用方案
                      </span>
                    </div>
                  </SelectItem>
                  <SelectItem value="cloudflare">
                    <div className="flex flex-col items-start">
                      <span className="font-medium">Cloudflare 自定义域名</span>
                      <span className="text-xs text-muted-foreground">
                        使用你的域名 + Cloudflare CDN
                      </span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 默认线路说明 */}
            {cdnRoute === 'default' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>关于默认线路</AlertTitle>
                <AlertDescription>
                  默认线路由 Hexo-NX-CMS 博客作者推荐，针对国内访问进行了优化。
                  当前推荐线路：<code className="text-xs">cdn.jsdelivr.net</code>
                </AlertDescription>
              </Alert>
            )}

            {/* Cloudflare 自定义域名配置 */}
            {cdnRoute === 'cloudflare' && (
              <div className="space-y-4 rounded-lg border p-4">
                <div className="space-y-2">
                  <Label htmlFor="customDomain">自定义域名</Label>
                  <Input
                    id="customDomain"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="img.yourdomain.com"
                  />
                  <p className="text-xs text-muted-foreground">
                    需要在 Cloudflare 中配置 Workers 代理到 GitHub
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="useDefaultRoute">使用默认线路作为备用</Label>
                    <p className="text-xs text-muted-foreground">
                      当自定义域名不可用时，自动降级到默认线路
                    </p>
                  </div>
                  <Switch
                    id="useDefaultRoute"
                    checked={useDefaultRoute}
                    onCheckedChange={setUseDefaultRoute}
                  />
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>配置指南</AlertTitle>
                  <AlertDescription className="text-xs space-y-2">
                    <p>1. 在 Cloudflare 中添加你的域名</p>
                    <p>2. 创建 Workers，代理到 GitHub Raw</p>
                    <p>3. 绑定自定义域名到 Workers</p>
                    <a
                      href="https://github.com/your-org/hexo-nx-cms/wiki/cloudflare-cdn"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      查看详细教程
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* 预览 URL */}
            <div className="space-y-2">
              <Label>图片 URL 预览</Label>
              <code className="block rounded-md bg-muted p-3 text-xs break-all">
                {generatePreviewUrl(cdnRoute, config?.owner || 'owner', repoName, customDomain, imagePath)}
              </code>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 高级配置 */}
      {repoStatus === 'exists' && (
        <Card>
          <CardHeader>
            <CardTitle>高级配置</CardTitle>
            <CardDescription>自定义图片存储和命名规则</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="imagePath">图片存储路径</Label>
              <Input
                id="imagePath"
                value={imagePath}
                onChange={(e) => setImagePath(e.target.value)}
                placeholder="images"
              />
              <p className="text-xs text-muted-foreground">
                图片将存储在仓库的此路径下
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="useYearMonthFolder">按年月分文件夹</Label>
                <p className="text-xs text-muted-foreground">
                  例如: images/2024/03/xxx.png
                </p>
              </div>
              <Switch
                id="useYearMonthFolder"
                checked={useYearMonthFolder}
                onCheckedChange={setUseYearMonthFolder}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* 保存按钮 */}
      {repoStatus === 'exists' && (
        <div className="flex justify-end">
          <Button onClick={handleSaveConfig}>
            保存配置
          </Button>
        </div>
      )}
    </div>
  )
}

// 生成预览 URL
function generatePreviewUrl(
  route: CDNRoute,
  owner: string,
  repo: string,
  customDomain: string,
  imagePath: string
): string {
  const exampleFile = '2024/03/example-image.png'
  const fullPath = `${imagePath}/${exampleFile}`

  switch (route) {
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
```

### 3. 默认线路配置文件

```typescript
// config/defaultCDNRoutes.ts

/**
 * 默认 CDN 线路配置
 *
 * 这里定义了博客推荐的默认 CDN 线路
 * 可以根据实际情况调整
 */

export interface DefaultRouteConfig {
  primary: string      // 主线路
  fallback: string[]   // 备用线路
  description: string  // 说明
}

export const DEFAULT_ROUTE_CONFIG: DefaultRouteConfig = {
  primary: 'jsdelivr',
  fallback: ['statically', 'github-raw'],
  description: '默认使用 jsDelivr，失败时自动切换到 Statically 或 GitHub Raw',
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
    case 'github-raw':
      return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
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

  return fallback.map(route => {
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
  }).filter(Boolean)
}
```

### 4. URL 生成器（支持降级）

```typescript
// services/imageHosting/urlGenerator.ts

export function generateImageUrl(
  config: ImageHostingConfig,
  filename: string,
  yearMonth?: string
): string {
  const { repoOwner, repoName, branch, imagePath, cdnRoute, cloudflareConfig } = config

  const fullPath = yearMonth
    ? `${imagePath}/${yearMonth}/${filename}`
    : `${imagePath}/${filename}`

  switch (cdnRoute) {
    case 'default':
      return getDefaultRouteUrl(repoOwner, repoName, branch, fullPath)

    case 'jsdelivr':
      return `https://cdn.jsdelivr.net/gh/${repoOwner}/${repoName}@${branch}/${fullPath}`

    case 'statically':
      return `https://cdn.statically.io/gh/${repoOwner}/${repoName}/${branch}/${fullPath}`

    case 'cloudflare':
      if (!cloudflareConfig?.domain) {
        // 如果没有配置域名，降级到默认线路
        if (cloudflareConfig?.useDefaultRoute) {
          return getDefaultRouteUrl(repoOwner, repoName, branch, fullPath)
        }
        throw new Error('未配置 Cloudflare 域名')
      }
      return `https://${cloudflareConfig.domain}/${fullPath}`

    default:
      return `https://raw.githubusercontent.com/${repoOwner}/${repoName}/${branch}/${fullPath}`
  }
}

/**
 * 生成带降级的 URL 列表
 * 用于图片加载失败时自动切换
 */
export function generateImageUrlsWithFallback(
  config: ImageHostingConfig,
  filename: string,
  yearMonth?: string
): string[] {
  const { repoOwner, repoName, branch, imagePath, cdnRoute, cloudflareConfig } = config

  const fullPath = yearMonth
    ? `${imagePath}/${yearMonth}/${filename}`
    : `${imagePath}/${filename}`

  const urls: string[] = []

  // 主 URL
  urls.push(generateImageUrl(config, filename, yearMonth))

  // 如果是 Cloudflare 且启用了默认线路降级
  if (cdnRoute === 'cloudflare' && cloudflareConfig?.useDefaultRoute) {
    urls.push(getDefaultRouteUrl(repoOwner, repoName, branch, fullPath))
  }

  // 添加所有备用线路
  urls.push(...getFallbackRouteUrls(repoOwner, repoName, branch, fullPath))

  // 去重
  return [...new Set(urls)]
}
```

## 配置示例

### 示例 1: 使用默认线路（推荐）

```json
{
  "enabled": true,
  "repoOwner": "username",
  "repoName": "blog-images",
  "branch": "main",
  "imagePath": "images",
  "cdnRoute": "default",
  "useYearMonthFolder": true
}
```

生成的 URL:
```
https://cdn.jsdelivr.net/gh/username/blog-images@main/images/2024/03/xxx.png
```

### 示例 2: 使用 Cloudflare 自定义域名 + 默认线路降级

```json
{
  "enabled": true,
  "repoOwner": "username",
  "repoName": "my-blog-images",
  "branch": "main",
  "imagePath": "images",
  "cdnRoute": "cloudflare",
  "cloudflareConfig": {
    "domain": "img.yourdomain.com",
    "useDefaultRoute": true
  },
  "useYearMonthFolder": true
}
```

生成的 URL（主）:
```
https://img.yourdomain.com/images/2024/03/xxx.png
```

降级 URL（备用）:
```
https://cdn.jsdelivr.net/gh/username/my-blog-images@main/images/2024/03/xxx.png
```

## 总结

更新后的方案特点：

1. ✅ **仓库名称可自定义**：默认 `blog-images`，用户可以修改
2. ✅ **默认线路选项**：提供博客推荐的最佳线路
3. ✅ **Cloudflare 降级**：自定义域名失败时自动切换到默认线路
4. ✅ **多级降级机制**：主线路 → 默认线路 → 备用线路
5. ✅ **URL 预览**：实时显示生成的图片 URL
6. ✅ **配置持久化**：保存到 localStorage

这样用户体验更好，配置更灵活！
