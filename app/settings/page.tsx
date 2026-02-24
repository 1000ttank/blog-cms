'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  GitBranch,
  Key,
  LogOut,
  AlertCircle,
  CheckCircle,
  ImageIcon,
  Upload,
  Link as LinkIcon,
  Code2,
  Save,
  Info,
  PackageOpen,
} from 'lucide-react'
import { toast } from 'sonner'
import JSZip from 'jszip'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/store/authStore'
import { getGitHubClient } from '@/services/githubClient'
import { ROUTES } from '@/config/constants'

export default function SettingsPage() {
  const router = useRouter()
  const { user, config, logout, validateToken } = useAuthStore()

  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [validating, setValidating] = useState(false)

  // Favicon state
  const [faviconUrl, setFaviconUrl] = useState('')
  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef = useRef<HTMLInputElement>(null)

  // Favicon zip upload state
  const [zipProgress, setZipProgress] = useState<{ done: number; total: number } | null>(null)

  // Custom CSS/JS state
  const [customCss, setCustomCss] = useState('')
  const [customCssSha, setCustomCssSha] = useState('')
  const [customJs, setCustomJs] = useState('')
  const [customJsSha, setCustomJsSha] = useState('')
  const [loadingCustom, setLoadingCustom] = useState(false)
  const [savingCss, setSavingCss] = useState(false)
  const [savingJs, setSavingJs] = useState(false)
  const [customLoaded, setCustomLoaded] = useState(false)

  async function handleValidate() {
    setValidating(true)
    setTokenValid(null)
    try {
      const valid = await validateToken()
      setTokenValid(valid)
      if (valid) {
        toast.success('Token 有效')
      } else {
        toast.error('Token 已失效，请重新登录')
      }
    } catch {
      toast.error('验证失败')
    } finally {
      setValidating(false)
    }
  }

  function handleLogout() {
    logout()
    toast.success('已退出登录')
    router.push(ROUTES.LOGIN)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFaviconFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setFaviconPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function syncFaviconToTheme(faviconPath: string) {
    const client = getGitHubClient()
    try {
      const { content: hexoYaml } = await client.getFile('_config.yml')
      const themeMatch = hexoYaml.match(/^theme:\s*(.+)$/m)
      const theme = themeMatch?.[1]?.trim()
      if (!theme) return
      const candidates = [`_config.${theme}.yml`, `themes/${theme}/_config.yml`]
      for (const configPath of candidates) {
        try {
          const { content, sha } = await client.getFile(configPath)
          const updated = content
            .replace(/^(favicon:\s*)(.+)$/m, `$1${faviconPath}`)
            .replace(/^(apple_touch_icon:\s*)(.+)$/m, `$1${faviconPath}`)
          if (updated !== content) {
            await client.updateFile(configPath, updated, sha, `chore: update favicon to ${faviconPath}`)
            toast.info(`已同步更新 ${configPath} 中的 favicon 配置`)
          }
          return
        } catch { /* try next */ }
      }
    } catch { /* silent */ }
  }

  async function handleUploadFile() {
    if (!faviconFile) return
    setUploadingFavicon(true)
    try {
      const client = getGitHubClient()
      const buffer = await faviconFile.arrayBuffer()
      const ext = faviconFile.name.split('.').pop()?.toLowerCase() ?? 'ico'
      const repoPath = `source/favicon.${ext}`
      await client.uploadBinaryFile(buffer, repoPath, `chore: update favicon`)
      toast.success(`favicon 已上传至仓库 ${repoPath}，正在同步主题配置…`)
      await syncFaviconToTheme(`/favicon.${ext}`)
    } catch (err) {
      toast.error('上传失败：' + (err instanceof Error ? err.message : '未知错误'))
    } finally {
      setUploadingFavicon(false)
    }
  }

  async function loadCustomCode() {
    setLoadingCustom(true)
    setCustomLoaded(true)
    const client = getGitHubClient()
    try {
      const { content, sha } = await client.getFile('source/custom.css')
      setCustomCss(content)
      setCustomCssSha(sha)
    } catch {
      setCustomCss('')
      setCustomCssSha('')
    }
    try {
      const { content, sha } = await client.getFile('source/custom.js')
      setCustomJs(content)
      setCustomJsSha(sha)
    } catch {
      setCustomJs('')
      setCustomJsSha('')
    }
    setLoadingCustom(false)
  }

  async function saveCustomCss() {
    setSavingCss(true)
    try {
      const client = getGitHubClient()
      if (customCssSha) {
        const { sha } = await client.updateFile('source/custom.css', customCss, customCssSha, 'style: update custom CSS')
        setCustomCssSha(sha)
      } else {
        const { sha } = await client.createFile('source/custom.css', customCss, 'style: add custom CSS')
        setCustomCssSha(sha)
      }
      toast.success('custom.css 已保存并提交')
    } catch (e) {
      toast.error(`保存失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setSavingCss(false)
    }
  }

  async function saveCustomJs() {
    setSavingJs(true)
    try {
      const client = getGitHubClient()
      if (customJsSha) {
        const { sha } = await client.updateFile('source/custom.js', customJs, customJsSha, 'feat: update custom JS')
        setCustomJsSha(sha)
      } else {
        const { sha } = await client.createFile('source/custom.js', customJs, 'feat: add custom JS')
        setCustomJsSha(sha)
      }
      toast.success('custom.js 已保存并提交')
    } catch (e) {
      toast.error(`保存失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setSavingJs(false)
    }
  }

  async function handleSaveUrl() {
    if (!faviconUrl.trim()) {
      toast.error('请输入图标 URL')
      return
    }
    setUploadingFavicon(true)
    try {
      // Fetch the image and upload to repo
      const res = await fetch(faviconUrl)
      if (!res.ok) throw new Error('无法获取该 URL 的图片')
      const buffer = await res.arrayBuffer()
      const ext = faviconUrl.split('.').pop()?.split('?')[0] ?? 'ico'
      const path = `source/favicon.${ext}`
      const client = getGitHubClient()
      await client.uploadBinaryFile(buffer, path, `chore: update favicon from url`)
      toast.success(`favicon 已上传至仓库 ${path}，构建后生效`)
    } catch (err) {
      toast.error('上传失败：' + (err instanceof Error ? err.message : '请确认 URL 可访问'))
    } finally {
      setUploadingFavicon(false)
    }
  }

  async function handleZipUpload(file: File) {
    setZipProgress({ done: 0, total: 0 })
    try {
      const zip = await JSZip.loadAsync(await file.arrayBuffer())
      const client = getGitHubClient()

      // Collect supported files (skip directories and __MACOSX artifacts)
      const imageExts = ['.ico', '.png', '.svg', '.webp', '.jpg', '.jpeg']
      const entries: { name: string; file: JSZip.JSZipObject }[] = []
      zip.forEach((relativePath, zipFile) => {
        if (zipFile.dir) return
        if (relativePath.startsWith('__MACOSX')) return
        const lname = relativePath.toLowerCase()
        if (imageExts.some(ext => lname.endsWith(ext)) || lname.endsWith('.webmanifest')) {
          entries.push({ name: relativePath.split('/').pop()!, file: zipFile })
        }
      })

      if (entries.length === 0) {
        toast.error('压缩包中未找到图标文件（.ico/.png/.svg/.webmanifest）')
        setZipProgress(null)
        return
      }

      setZipProgress({ done: 0, total: entries.length })
      let done = 0
      for (const { name, file: zipFile } of entries) {
        const buffer = await zipFile.async('arraybuffer')
        await client.uploadBinaryFile(buffer, `source/${name}`, `chore: upload icon ${name}`)
        done++
        setZipProgress({ done, total: entries.length })
      }

      toast.success(`图标包上传完成：共 ${entries.length} 个文件已提交到仓库 source/ 目录`)
      // Try to sync the favicon to theme config
      const icoEntry = entries.find(e => e.name.toLowerCase().endsWith('.ico'))
      const pngEntry = entries.find(e => e.name.toLowerCase().endsWith('.png') && e.name.toLowerCase().includes('favicon'))
      const target = icoEntry ?? pngEntry
      if (target) await syncFaviconToTheme(`/${target.name}`)
    } catch (e) {
      toast.error(`上传失败：${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setZipProgress(null)
      if (zipInputRef.current) zipInputRef.current.value = ''
    }
  }

  return (
    <AppShell title="设置">
      <div className="max-w-2xl space-y-5">
        {/* Account */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              账号信息
            </CardTitle>
            <CardDescription>当前登录的 GitHub 账号和 Token 状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.avatar_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={user.avatar_url}
                    alt={user.login}
                    className="h-10 w-10 rounded-full border"
                  />
                )}
                <div>
                  <p className="font-medium">{user.name ?? user.login}</p>
                  <p className="text-sm text-muted-foreground">@{user.login}</p>
                </div>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">GitHub Token</p>
                <p className="text-xs text-muted-foreground">
                  {tokenValid === true && (
                    <span className="flex items-center gap-1 text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Token 有效
                    </span>
                  )}
                  {tokenValid === false && (
                    <span className="flex items-center gap-1 text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      Token 已失效
                    </span>
                  )}
                  {tokenValid === null && '点击右侧按钮验证 Token'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleValidate}
                disabled={validating}
              >
                {validating ? '验证中...' : '验证 Token'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Repository */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              仓库配置
            </CardTitle>
            <CardDescription>当前连接的 Hexo 博客仓库信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label>仓库地址</Label>
                <Input
                  value={config ? `${config.owner}/${config.repo}` : ''}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-1.5">
                <Label>分支</Label>
                <Input value={config?.branch ?? 'main'} readOnly className="bg-muted" />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              如需修改仓库配置，请退出登录后重新填写。
            </p>
          </CardContent>
        </Card>

        {/* Favicon */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4" />
              博客图标（Favicon）
            </CardTitle>
            <CardDescription>
              上传后图标文件将提交到仓库 <code className="bg-muted px-1 rounded text-xs">source/favicon.*</code>，
              触发自动构建后生效。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="upload">
              <TabsList className="mb-4">
                <TabsTrigger value="upload" className="gap-1.5">
                  <Upload className="h-3.5 w-3.5" />
                  上传文件
                </TabsTrigger>
                <TabsTrigger value="zip" className="gap-1.5">
                  <PackageOpen className="h-3.5 w-3.5" />
                  图标包（.zip）
                </TabsTrigger>
                <TabsTrigger value="url" className="gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  从 URL 导入
                </TabsTrigger>
              </TabsList>

              {/* Upload File */}
              <TabsContent value="upload" className="space-y-4">
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {faviconPreview ? (
                    <>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={faviconPreview}
                        alt="favicon preview"
                        className="h-12 w-12 object-contain"
                      />
                      <p className="text-xs text-muted-foreground">{faviconFile?.name}</p>
                    </>
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm text-muted-foreground">
                        点击选择 .ico 或 .png 图标文件
                      </p>
                      <p className="text-xs text-muted-foreground">推荐尺寸：32×32 或 64×64 像素</p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ico,.png,.svg"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <Button
                  onClick={handleUploadFile}
                  disabled={!faviconFile || uploadingFavicon}
                  className="w-full gap-2"
                >
                  {uploadingFavicon ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      上传中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      上传到仓库
                    </>
                  )}
                </Button>
              </TabsContent>

              {/* Zip Package Upload */}
              <TabsContent value="zip" className="space-y-4">
                <div
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-center hover:border-primary/50 hover:bg-accent/30 transition-colors"
                  onClick={() => zipInputRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleZipUpload(f) }}
                >
                  <PackageOpen className="h-8 w-8 text-muted-foreground/50" />
                  <p className="text-sm text-muted-foreground">点击选择或拖入图标包 .zip 文件</p>
                  <p className="text-xs text-muted-foreground">
                    支持 <a href="https://realfavicongenerator.net" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground" onClick={e => e.stopPropagation()}>RealFaviconGenerator</a> 等工具生成的图标包
                  </p>
                </div>
                <input
                  ref={zipInputRef}
                  type="file"
                  accept=".zip"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleZipUpload(f) }}
                />
                {zipProgress && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>正在上传…</span>
                      <span>{zipProgress.done} / {zipProgress.total}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: zipProgress.total > 0 ? `${(zipProgress.done / zipProgress.total) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  zip 包中的 .ico、.png、.svg、.webp、.webmanifest 文件将上传至博客仓库 <code className="bg-muted px-1 rounded">source/</code> 目录，构建后生效。
                </p>
              </TabsContent>

              {/* URL Import */}
              <TabsContent value="url" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="favicon-url">图标 URL</Label>
                  <Input
                    id="favicon-url"
                    placeholder="https://example.com/favicon.ico"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    CMS 将从该 URL 下载图标并上传到仓库，需确保 URL 可公开访问。
                  </p>
                </div>
                <Button
                  onClick={handleSaveUrl}
                  disabled={!faviconUrl.trim() || uploadingFavicon}
                  className="w-full gap-2"
                >
                  {uploadingFavicon ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      导入中...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      从 URL 导入
                    </>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Custom CSS/JS */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code2 className="h-4 w-4" />
              自定义代码注入
            </CardTitle>
            <CardDescription>
              向博客注入自定义 CSS 样式和 JavaScript 脚本。文件保存到仓库 <code className="bg-muted px-1 rounded text-xs">source/custom.css</code> 和 <code className="bg-muted px-1 rounded text-xs">source/custom.js</code>，需主题支持加载这两个文件。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {!customLoaded ? (
              <Button variant="outline" onClick={loadCustomCode} disabled={loadingCustom} className="gap-2">
                {loadingCustom ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Code2 className="h-4 w-4" />}
                {loadingCustom ? '加载中…' : '加载自定义代码'}
              </Button>
            ) : (
              <>
                {/* Greeting Fix Tip */}
                <div className="flex gap-3 rounded-md border border-blue-200 bg-blue-50/50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/20 dark:text-blue-300">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p><strong>修复时间问候语时区问题：</strong>如果博客显示"早上好"但实际是下午，可在下方 JS 框中粘贴以下代码（适用于 Fluid 等主题）：</p>
                    <pre className="mt-1.5 rounded bg-blue-100/60 dark:bg-blue-900/40 p-2 text-xs overflow-x-auto whitespace-pre-wrap">{`// 修复问候语时区（Fluid 主题）
document.addEventListener('DOMContentLoaded', function () {
  var h = new Date().getHours();
  var greet = h < 6 ? '夜深了' : h < 9 ? '早上好' : h < 12 ? '上午好' : h < 14 ? '中午好' : h < 17 ? '下午好' : h < 19 ? '傍晚好' : h < 22 ? '晚上好' : '夜深了';
  var el = document.querySelector('.subtitle') || document.querySelector('[id*="greet"]');
  if (el) el.textContent = greet + '，欢迎来到我的博客';
});`}</pre>
                  </div>
                </div>

                {/* Custom CSS */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">自定义 CSS</Label>
                  <p className="text-xs text-muted-foreground">控制正文透明度、搜索框样式等外观（需主题在 &lt;head&gt; 中引入 /custom.css）</p>
                  <Textarea
                    value={customCss}
                    onChange={e => setCustomCss(e.target.value)}
                    className="font-mono text-xs min-h-40 resize-y"
                    placeholder={`/* 示例：正文透明度 */\n.post-content { opacity: 0.9; }\n\n/* 示例：搜索框透明度 */\n.search-input { background: rgba(255,255,255,0.7); }`}
                    spellCheck={false}
                  />
                  <Button size="sm" onClick={saveCustomCss} disabled={savingCss} className="gap-2">
                    <Save className="h-3.5 w-3.5" />
                    {savingCss ? '保存中…' : '保存 CSS'}
                  </Button>
                </div>

                <Separator />

                {/* Custom JS */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">自定义 JavaScript</Label>
                  <p className="text-xs text-muted-foreground">在博客页面执行自定义逻辑（需主题在 &lt;body&gt; 末尾引入 /custom.js）</p>
                  <Textarea
                    value={customJs}
                    onChange={e => setCustomJs(e.target.value)}
                    className="font-mono text-xs min-h-40 resize-y"
                    placeholder={`// 示例：修复时间问候语\n// 示例：统计代码、评论系统初始化等`}
                    spellCheck={false}
                  />
                  <Button size="sm" onClick={saveCustomJs} disabled={savingJs} className="gap-2">
                    <Save className="h-3.5 w-3.5" />
                    {savingJs ? '保存中…' : '保存 JS'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="h-4 w-4" />
              退出登录
            </CardTitle>
            <CardDescription>
              退出后将清除本地存储的 Token 和所有配置信息。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" size="sm" onClick={handleLogout}>
              退出登录
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
