'use client'

import { useState, useEffect } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info, Save, Download } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'
import { githubClient } from '@/services/githubClient'
import { DEFAULT_ROUTE_CONFIG, CDN_ROUTE_INFO, type DefaultRouteConfig } from '@/config/defaultCDNRoutes'
import type { CDNRoute } from '@/types/imageHosting'

export default function CDNConfigPage() {
  const { config: authConfig } = useAuthStore()
  const [primary, setPrimary] = useState<CDNRoute>('jsdelivr')
  const [fallback, setFallback] = useState<string[]>(['statically', 'github-raw'])
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadConfig()
  }, [authConfig])

  async function loadConfig() {
    if (!authConfig) return

    setIsLoading(true)
    try {
      const content = await githubClient.getFileContent(
        authConfig.owner,
        authConfig.repo,
        'source/_data/cdn-config.json'
      )
      const config: DefaultRouteConfig = JSON.parse(content)
      setPrimary(config.primary)
      setFallback(config.fallback)
      toast.success('已加载自定义 CDN 配置')
    } catch (error) {
      // 文件不存在，使用默认配置
      setPrimary(DEFAULT_ROUTE_CONFIG.primary)
      setFallback(DEFAULT_ROUTE_CONFIG.fallback)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!authConfig) return

    setIsSaving(true)
    try {
      const config: DefaultRouteConfig = {
        primary,
        fallback,
        description: `默认使用 ${CDN_ROUTE_INFO[primary].name}，失败时自动切换到备用线路`,
      }

      const content = JSON.stringify(config, null, 2)

      await githubClient.createOrUpdateFile(
        authConfig.owner,
        authConfig.repo,
        'source/_data/cdn-config.json',
        content,
        'Update CDN configuration'
      )

      toast.success('CDN 配置已保存到 GitHub！')
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误'
      toast.error(`保存失败: ${errorMessage}`)
    } finally {
      setIsSaving(false)
    }
  }

  function handleExport() {
    const config: DefaultRouteConfig = {
      primary,
      fallback,
      description: `默认使用 ${CDN_ROUTE_INFO[primary].name}，失败时自动切换到备用线路`,
    }

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cdn-config.json'
    a.click()
    URL.revokeObjectURL(url)
    toast.success('配置文件已导出')
  }

  const availableRoutes = Object.entries(CDN_ROUTE_INFO)
    .filter(([key]) => key !== 'default' && key !== 'cloudflare')
    .map(([key, info]) => ({ value: key, label: info.name, description: info.description }))

  if (isLoading) {
    return (
      <AppShell title="CDN 线路配置">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">加载配置中...</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title="CDN 线路配置">
      <div className="max-w-3xl space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            配置 CDN 线路后，访客可以选择最适合他们的线路访问图片。配置会保存到博客仓库的{' '}
            <code className="text-sm">source/_data/cdn-config.json</code>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle>主线路配置</CardTitle>
            <CardDescription>选择默认使用的 CDN 线路</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>主线路</Label>
              <Select value={primary} onValueChange={(v) => setPrimary(v as CDNRoute)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableRoutes.map((route) => (
                    <SelectItem key={route.value} value={route.value}>
                      <div>
                        <div className="font-medium">{route.label}</div>
                        <div className="text-xs text-muted-foreground">{route.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {CDN_ROUTE_INFO[primary]?.description}
              </p>
            </div>

            <div className="space-y-2">
              <Label>备用线路</Label>
              <div className="space-y-2">
                {availableRoutes
                  .filter((r) => r.value !== primary)
                  .map((route) => (
                    <label key={route.value} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={fallback.includes(route.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFallback([...fallback, route.value])
                          } else {
                            setFallback(fallback.filter((f) => f !== route.value))
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{route.label}</span>
                    </label>
                  ))}
              </div>
              <p className="text-sm text-muted-foreground">
                当主线路失败时，自动尝试备用线路
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>预览</CardTitle>
            <CardDescription>查看生成的 URL 格式</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">主线路 URL：</p>
              <code className="text-xs bg-muted p-2 rounded block">
                {CDN_ROUTE_INFO[primary]?.template}
              </code>
            </div>
            {fallback.map((route) => (
              <div key={route}>
                <p className="text-sm font-medium mb-1">
                  备用线路 ({CDN_ROUTE_INFO[route as CDNRoute]?.name})：
                </p>
                <code className="text-xs bg-muted p-2 rounded block">
                  {CDN_ROUTE_INFO[route as CDNRoute]?.template}
                </code>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving || !authConfig}>
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? '保存中...' : '保存到 GitHub'}
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            导出配置文件
          </Button>
        </div>
      </div>
    </AppShell>
  )
}
