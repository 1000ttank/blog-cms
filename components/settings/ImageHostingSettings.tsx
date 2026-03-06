'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { AlertCircle, CheckCircle, Info, ExternalLink, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { useImageStore } from '@/store/imageStore'
import { setupImageRepository, checkImageRepository } from '@/services/imageHosting/setupImageRepo'
import { generatePreviewUrl } from '@/services/imageHosting/urlGenerator'
import { CDN_ROUTE_INFO } from '@/config/defaultCDNRoutes'
import type { CDNRoute, ImageHostingConfig } from '@/types/imageHosting'
import { DEFAULT_IMAGE_HOSTING_CONFIG } from '@/types/imageHosting'

export function ImageHostingSettings() {
  const { config: authConfig, token } = useAuthStore()
  const { config: imageConfig, saveConfig } = useImageStore()

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
    loadSavedConfig()
    checkImageRepo()
  }, [])

  function loadSavedConfig() {
    if (imageConfig) {
      setRepoName(imageConfig.repoName || 'blog-images')
      setCdnRoute(imageConfig.cdnRoute || 'default')
      setCustomDomain(imageConfig.cloudflareConfig?.domain || '')
      setUseDefaultRoute(imageConfig.cloudflareConfig?.useDefaultRoute ?? true)
      setImagePath(imageConfig.imagePath || 'images')
      setUseYearMonthFolder(imageConfig.useYearMonthFolder ?? true)
    }
  }

  async function checkImageRepo() {
    if (!authConfig || !token) return

    setRepoStatus('checking')
    try {
      const exists = await checkImageRepository(token, authConfig.owner, repoName)
      setRepoStatus(exists ? 'exists' : 'not-exists')
    } catch {
      setRepoStatus('not-exists')
    }
  }

  async function handleCreateRepo() {
    if (!authConfig || !token) return

    setIsCreating(true)
    try {
      await setupImageRepository(token, authConfig.owner, repoName)
      toast.success(`图床仓库 ${repoName} 创建成功！`)
      setRepoStatus('exists')
    } catch (error: any) {
      toast.error(`创建失败: ${error.message}`)
    } finally {
      setIsCreating(false)
    }
  }

  function handleSaveConfig() {
    if (!authConfig) return

    const newConfig: ImageHostingConfig = {
      ...DEFAULT_IMAGE_HOSTING_CONFIG,
      enabled: true,
      repoOwner: authConfig.owner,
      repoName,
      branch: 'main',
      imagePath,
      cdnRoute,
      cloudflareConfig:
        cdnRoute === 'cloudflare'
          ? {
              domain: customDomain,
              useDefaultRoute,
            }
          : undefined,
      useYearMonthFolder,
    } as ImageHostingConfig

    saveConfig(newConfig)
    toast.success('图床配置已保存！')
  }

  if (!authConfig) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>未登录</AlertTitle>
        <AlertDescription>请先登录后再配置图床</AlertDescription>
      </Alert>
    )
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
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              检查仓库状态...
            </div>
          )}

          {repoStatus === 'not-exists' && (
            <>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>未检测到图床仓库</AlertTitle>
                <AlertDescription>将自动创建一个公开仓库用于存储图片</AlertDescription>
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
                  仓库将创建为: {authConfig.owner}/{repoName}
                </p>
              </div>

              <Button onClick={handleCreateRepo} disabled={isCreating || !repoName.trim()}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    创建中...
                  </>
                ) : (
                  '创建图床仓库'
                )}
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
                href={`https://github.com/${authConfig.owner}/${repoName}`}
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
                  {Object.entries(CDN_ROUTE_INFO).map(([key, info]) => (
                    <SelectItem key={key} value={key}>
                      <div className="flex flex-col items-start">
                        <span className="font-medium">{info.name}</span>
                        <span className="text-xs text-muted-foreground">{info.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 默认线路说明 */}
            {cdnRoute === 'default' && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>关于默认线路</AlertTitle>
                <AlertDescription>
                  默认线路由 Hexo-NX-CMS 推荐，针对国内访问进行了优化。当前推荐线路：
                  <code className="ml-1 text-xs">cdn.jsdelivr.net</code>
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
                  <AlertDescription className="space-y-2 text-xs">
                    <p>1. 在 Cloudflare 中添加你的域名</p>
                    <p>2. 创建 Workers，代理到 GitHub Raw</p>
                    <p>3. 绑定自定义域名到 Workers</p>
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* 预览 URL */}
            <div className="space-y-2">
              <Label>图片 URL 预览</Label>
              <code className="block rounded-md bg-muted p-3 text-xs break-all">
                {generatePreviewUrl(cdnRoute, authConfig.owner, repoName, customDomain, imagePath)}
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
              <p className="text-xs text-muted-foreground">图片将存储在仓库的此路径下</p>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="useYearMonthFolder">按年月分文件夹</Label>
                <p className="text-xs text-muted-foreground">例如: images/2024/03/xxx.png</p>
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
          <Button onClick={handleSaveConfig}>保存配置</Button>
        </div>
      )}
    </div>
  )
}
