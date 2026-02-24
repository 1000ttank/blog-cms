'use client'

import { useEffect, useState, useCallback } from 'react'
import { Palette, Save, RefreshCw, AlertTriangle, Info, RotateCcw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { getGitHubClient } from '@/services/githubClient'
import {
  saveConfigSnapshot,
  getLastGoodSnapshot,
  type ConfigSnapshot,
} from '@/services/configBackupService'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'

const HEXO_CONFIG = '_config.yml'

function extractThemeName(hexoConfig: string): string {
  const match = hexoConfig.match(/^theme:\s*(.+)$/m)
  return match?.[1]?.trim() ?? ''
}

export default function ConfigPage() {
  const [hexoYaml, setHexoYaml] = useState('')
  const [hexoSha, setHexoSha] = useState('')
  const [themeYaml, setThemeYaml] = useState('')
  const [themeSha, setThemeSha] = useState('')
  const [themeName, setThemeName] = useState('')
  const [themeConfigFile, setThemeConfigFile] = useState('')
  const [loadingHexo, setLoadingHexo] = useState(true)
  const [loadingTheme, setLoadingTheme] = useState(false)
  const [savingHexo, setSavingHexo] = useState(false)
  const [savingTheme, setSavingTheme] = useState(false)
  const [themeNotFound, setThemeNotFound] = useState(false)
  const [lastGood, setLastGood] = useState<ConfigSnapshot | null>(null)
  const [restoring, setRestoring] = useState(false)

  useEffect(() => {
    setLastGood(getLastGoodSnapshot())
  }, [])

  const loadThemeConfig = useCallback(async (name: string) => {
    const candidates = [`_config.${name}.yml`, `themes/${name}/_config.yml`]
    setLoadingTheme(true)
    setThemeNotFound(false)
    const client = getGitHubClient()
    for (const file of candidates) {
      try {
        const { content, sha } = await client.getFile(file)
        setThemeYaml(content)
        setThemeSha(sha)
        setThemeConfigFile(file)
        setLoadingTheme(false)
        return
      } catch { /* try next */ }
    }
    setThemeNotFound(true)
    setThemeYaml('')
    setThemeSha('')
    setThemeConfigFile('')
    setLoadingTheme(false)
  }, [])

  const loadHexoConfig = useCallback(async () => {
    setLoadingHexo(true)
    try {
      const client = getGitHubClient()
      const { content, sha } = await client.getFile(HEXO_CONFIG)
      setHexoYaml(content)
      setHexoSha(sha)
      const name = extractThemeName(content)
      setThemeName(name)
      if (name) await loadThemeConfig(name)
    } catch (e) {
      toast.error(`加载 _config.yml 失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setLoadingHexo(false)
    }
  }, [loadThemeConfig])

  useEffect(() => { loadHexoConfig() }, [loadHexoConfig])

  function takeSnapshot(label: string) {
    saveConfigSnapshot({
      hexoYaml,
      hexoSha,
      themeFile: themeConfigFile,
      themeYaml,
      themeSha,
      savedAt: new Date().toISOString(),
      label,
    })
  }

  async function saveHexoConfig() {
    setSavingHexo(true)
    try {
      const client = getGitHubClient()
      takeSnapshot('保存 _config.yml 前的版本')
      const { sha } = await client.updateFile(HEXO_CONFIG, hexoYaml, hexoSha, 'config: update _config.yml')
      setHexoSha(sha)
      const name = extractThemeName(hexoYaml)
      if (name !== themeName) {
        setThemeName(name)
        if (name) await loadThemeConfig(name)
      }
      toast.success('_config.yml 已保存并提交到 GitHub')
    } catch (e) {
      toast.error(`保存失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setSavingHexo(false)
    }
  }

  async function saveThemeConfig() {
    if (!themeConfigFile) return
    setSavingTheme(true)
    try {
      const client = getGitHubClient()
      takeSnapshot(`保存 ${themeConfigFile} 前的版本`)
      const { sha } = await client.updateFile(themeConfigFile, themeYaml, themeSha, `config: update ${themeConfigFile}`)
      setThemeSha(sha)
      toast.success(`${themeConfigFile} 已保存并提交到 GitHub`)
    } catch (e) {
      toast.error(`保存失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setSavingTheme(false)
    }
  }

  async function handleRestore(snapshot: ConfigSnapshot) {
    setRestoring(true)
    try {
      const client = getGitHubClient()
      let hexoRestoredSha = hexoSha
      let themeRestoredSha = themeSha

      if (snapshot.hexoYaml && snapshot.hexoSha) {
        const current = await client.getFile(HEXO_CONFIG)
        const { sha } = await client.updateFile(HEXO_CONFIG, snapshot.hexoYaml, current.sha, 'config: restore _config.yml to last good version')
        hexoRestoredSha = sha
        setHexoYaml(snapshot.hexoYaml)
        setHexoSha(sha)
      }
      if (snapshot.themeYaml && snapshot.themeFile) {
        const current = await client.getFile(snapshot.themeFile)
        const { sha } = await client.updateFile(snapshot.themeFile, snapshot.themeYaml, current.sha, `config: restore ${snapshot.themeFile} to last good version`)
        themeRestoredSha = sha
        setThemeYaml(snapshot.themeYaml)
        setThemeSha(sha)
        setThemeConfigFile(snapshot.themeFile)
      }
      void hexoRestoredSha; void themeRestoredSha
      toast.success('已恢复到上一个正确配置，构建已触发')
    } catch (e) {
      toast.error(`恢复失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setRestoring(false)
    }
  }

  return (
    <AppShell title="配置管理">
      <div className="space-y-5">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600 shrink-0" />
          <div className="text-amber-800 dark:text-amber-300">
            <p className="font-medium">直接编辑配置文件</p>
            <p className="text-xs mt-0.5 opacity-80">修改会立即提交到 GitHub 并触发博客重新构建。每次保存前会自动备份当前内容，可在构建失败时恢复。</p>
          </div>
        </div>

        {/* Last good snapshot restore banner */}
        {lastGood && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-green-200 bg-green-50/50 p-3 dark:border-green-900 dark:bg-green-950/20">
            <div className="flex items-center gap-2 text-sm text-green-800 dark:text-green-300">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>
                有可用的安全快照（{formatDistanceToNow(new Date(lastGood.savedAt), { locale: zhCN, addSuffix: true })}）
              </span>
              <Badge variant="outline" className="text-xs border-green-300 text-green-700">{lastGood.label}</Badge>
            </div>
            <Button
              variant="outline" size="sm" className="gap-1.5 border-green-400 text-green-700 hover:bg-green-100 shrink-0"
              onClick={() => handleRestore(lastGood)} disabled={restoring}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {restoring ? '恢复中…' : '恢复配置'}
            </Button>
          </div>
        )}

        <Tabs defaultValue="hexo">
          <TabsList className="w-full">
            <TabsTrigger value="hexo" className="flex-1">Hexo 主配置 (_config.yml)</TabsTrigger>
            <TabsTrigger value="theme" className="flex-1">
              主题配置 {themeName ? `(${themeName})` : ''}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="hexo" className="mt-4">
            <Card>
              <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" /> _config.yml
                  </CardTitle>
                  <CardDescription className="mt-1">站点信息、URL、主题名称、时区等</CardDescription>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={loadHexoConfig} disabled={loadingHexo}>
                  <RefreshCw className={`h-4 w-4 ${loadingHexo ? 'animate-spin' : ''}`} />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingHexo ? (
                  <div className="h-96 animate-pulse rounded-md bg-muted" />
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">YAML 编辑器</Label>
                      <Textarea value={hexoYaml} onChange={e => setHexoYaml(e.target.value)}
                        className="font-mono text-xs min-h-96 resize-y" spellCheck={false} />
                    </div>
                    <div className="flex items-center gap-3 rounded-md border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>时区配置：确认 <code>timezone: Asia/Shanghai</code> 已设置以修正文章时间。</span>
                    </div>
                    <Button onClick={saveHexoConfig} disabled={savingHexo || loadingHexo} className="gap-2">
                      <Save className="h-4 w-4" />
                      {savingHexo ? '保存中…' : '保存并触发构建'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="theme" className="mt-4">
            <Card>
              <CardHeader className="pb-3 flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">
                    主题配置文件 {themeConfigFile && <span className="text-muted-foreground font-normal text-sm">({themeConfigFile})</span>}
                  </CardTitle>
                  <CardDescription className="mt-1">外观、问候语、透明度、页脚 HTML 等</CardDescription>
                </div>
                {themeName && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => loadThemeConfig(themeName)} disabled={loadingTheme}>
                    <RefreshCw className={`h-4 w-4 ${loadingTheme ? 'animate-spin' : ''}`} />
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTheme ? (
                  <div className="h-96 animate-pulse rounded-md bg-muted" />
                ) : themeNotFound ? (
                  <div className="flex flex-col items-center py-12 text-center gap-3">
                    <Palette className="h-10 w-10 text-muted-foreground/30" />
                    <p className="font-medium text-muted-foreground">未找到主题配置</p>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      {themeName ? `未能在 "_config.${themeName}.yml" 或 "themes/${themeName}/_config.yml" 找到配置文件。` : '请先在 Hexo 主配置中设置 theme 字段。'}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">YAML 编辑器（问候语、透明度、页脚 HTML 等均在此处）</Label>
                      <Textarea value={themeYaml} onChange={e => setThemeYaml(e.target.value)}
                        className="font-mono text-xs min-h-96 resize-y" spellCheck={false} />
                    </div>
                    <div className="space-y-2 rounded-md border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p><strong>Fluid 主题常见配置：</strong></p>
                          <ul className="list-disc list-inside space-y-0.5 opacity-80">
                            <li>时间问候语：搜索 <code>greet_mode</code> 或 <code>slogan</code></li>
                            <li>正文/背景透明度：搜索 <code>alpha</code> 或 <code>opacity</code></li>
                            <li>搜索框：搜索 <code>search</code></li>
                            <li>页脚 HTML：搜索 <code>footer</code> → <code>content</code></li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <Button onClick={saveThemeConfig} disabled={savingTheme || loadingTheme || !themeConfigFile} className="gap-2">
                      <Save className="h-4 w-4" />
                      {savingTheme ? '保存中…' : '保存并触发构建'}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  )
}
