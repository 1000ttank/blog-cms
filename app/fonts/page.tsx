'use client'

import { useEffect, useState, useRef } from 'react'
import { Upload, Trash2, Type, Copy, Check, RefreshCw, Info, Globe, Monitor } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getGitHubClient } from '@/services/githubClient'
import { useAuthStore } from '@/store/authStore'
import {
  FONT_CSS_KEY,
  FONT_NAME_KEY,
  injectFontCss,
  clearFontCss,
} from '@/components/layout/GlobalFontProvider'
import type { GitHubFile } from '@/types'

const FONTS_DIR = 'source/fonts'
const ALLOWED_EXTS = ['.ttf', '.woff', '.woff2', '.otf']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

function fontFormat(ext: string) {
  const map: Record<string, string> = {
    '.woff2': 'woff2', '.woff': 'woff', '.ttf': 'truetype', '.otf': 'opentype',
  }
  return map[ext] ?? ext.replace('.', '')
}

function getFamilyName(filename: string) {
  return filename.replace(/\.[^.]+$/, '')
}

function getRawUrl(owner: string, repo: string, branch: string, path: string) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`
}

function buildFontCss(family: string, url: string, ext: string, applyToBody = false) {
  const face = `@font-face {\n  font-family: '${family}';\n  src: url('${url}') format('${fontFormat(ext)}');\n  font-display: swap;\n}`
  if (!applyToBody) return face
  return `${face}\nbody, .prose, .editor-root { font-family: '${family}', sans-serif !important; }`
}

export default function FontsPage() {
  const { config } = useAuthStore()
  const [fonts, setFonts] = useState<GitHubFile[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const [appliedFont, setAppliedFont] = useState<string | null>(null)
  const [applyingBlog, setApplyingBlog] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const saved = localStorage.getItem(FONT_NAME_KEY)
    if (saved) setAppliedFont(saved)
    loadFonts()
  }, [])  

  async function loadFonts() {
    setLoading(true)
    try {
      const client = getGitHubClient()
      const files = await client.getTree(FONTS_DIR)
      setFonts(files.filter(f => ALLOWED_EXTS.some(ext => f.name.toLowerCase().endsWith(ext))))
    } finally {
      setLoading(false)
    }
  }

  function handleApplyCms(font: GitHubFile) {
    if (!config) return
    const family = getFamilyName(font.name)
    const ext = font.name.match(/\.[^.]+$/)?.[0] ?? '.ttf'
    const url = getRawUrl(config.owner, config.repo, config.branch, font.path)
    const css = buildFontCss(family, url, ext, true)

    localStorage.setItem(FONT_NAME_KEY, family)
    localStorage.setItem(FONT_CSS_KEY, css)
    injectFontCss(css)
    setAppliedFont(family)
    toast.success(`已将 "${family}" 应用到 CMS 界面`)
  }

  function handleResetCms() {
    clearFontCss()
    setAppliedFont(null)
    toast.success('已重置为默认字体')
  }

  async function handleApplyBlog(font: GitHubFile) {
    if (!config) return
    const family = getFamilyName(font.name)
    const ext = font.name.match(/\.[^.]+$/)?.[0] ?? '.ttf'
    // Point to the font served by Hexo from source/fonts/
    const blogUrl = `/fonts/${font.name}`
    const snippet = buildFontCss(family, blogUrl, ext, false)

    setApplyingBlog(font.path)
    try {
      const client = getGitHubClient()
      const CUSTOM_CSS = 'source/custom.css'
      let existing = ''
      let sha = ''
      try {
        const res = await client.getFile(CUSTOM_CSS)
        existing = res.content
        sha = res.sha
      } catch {
        // file doesn't exist yet
      }

      // Remove previous @font-face rule for this family (if any) and append new one
      const marker = `/* font-family: '${family}' */`
      const cleaned = existing
        .replace(new RegExp(`/\\* font-family: '${family}' \\*/[\\s\\S]*?\\}\\s*`, 'g'), '')
        .trimEnd()

      const newContent = (cleaned ? cleaned + '\n\n' : '') + `${marker}\n${snippet}\n`

      if (sha) {
        await client.updateFile(CUSTOM_CSS, newContent, sha, `style: apply font ${family} to blog`)
      } else {
        await client.createFile(CUSTOM_CSS, newContent, `style: add custom font ${family}`)
      }

      toast.success(`"${family}" 的 CSS 已写入 source/custom.css，构建后博客生效`, {
        description: '请确认主题已加载 /custom.css（见页面提示）',
        duration: 6000,
      })
    } catch (e) {
      toast.error(`写入失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setApplyingBlog(null)
    }
  }

  async function handleUpload(files: FileList) {
    setUploading(true)
    const client = getGitHubClient()
    let successCount = 0
    for (const file of Array.from(files)) {
      const ext = '.' + file.name.split('.').pop()!.toLowerCase()
      if (!ALLOWED_EXTS.includes(ext)) {
        toast.error(`不支持的格式: ${file.name}`)
        continue
      }
      try {
        const buffer = await file.arrayBuffer()
        await client.uploadBinaryFile(buffer, `${FONTS_DIR}/${file.name}`, `feat: upload font ${file.name}`)
        successCount++
      } catch (e) {
        toast.error(`上传失败: ${file.name} — ${e instanceof Error ? e.message : '未知错误'}`)
      }
    }
    if (successCount > 0) {
      toast.success(`成功上传 ${successCount} 个字体文件`)
      await loadFonts()
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleDelete(font: GitHubFile) {
    if (!confirm(`确定删除 "${font.name}" 字体吗？`)) return
    setDeleting(font.path)
    try {
      const client = getGitHubClient()
      await client.deleteFile(font.path, font.sha, `chore: remove font ${font.name}`)
      toast.success(`已删除 ${font.name}`)
      setFonts(prev => prev.filter(f => f.path !== font.path))
      if (appliedFont === getFamilyName(font.name)) handleResetCms()
    } catch (e) {
      toast.error(`删除失败: ${e instanceof Error ? e.message : '未知错误'}`)
    } finally {
      setDeleting(null)
    }
  }

  async function handleCopyCss(font: GitHubFile) {
    if (!config) return
    const ext = font.name.match(/\.[^.]+$/)?.[0] ?? '.ttf'
    const family = getFamilyName(font.name)
    const url = getRawUrl(config.owner, config.repo, config.branch, font.path)
    await navigator.clipboard.writeText(buildFontCss(family, url, ext, false))
    setCopiedPath(font.path)
    toast.success('CSS 代码已复制（GitHub CDN 地址）')
    setTimeout(() => setCopiedPath(null), 2000)
  }

  return (
    <AppShell title="字体管理">
      <div className="space-y-6">
        {/* Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">上传字体文件</CardTitle>
            <CardDescription>
              支持 TTF、WOFF、WOFF2、OTF 格式，文件保存到博客仓库 <code className="bg-muted px-1 rounded text-xs">source/fonts/</code> 目录
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              className="flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-border p-10 hover:border-primary/40 cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files) }}
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">点击选择或拖拽字体文件到此处</p>
                <p className="text-xs text-muted-foreground mt-1">.ttf / .woff / .woff2 / .otf</p>
              </div>
              {uploading && <p className="text-xs text-primary animate-pulse">上传中，请稍候…</p>}
            </div>
            <input ref={fileInputRef} type="file" accept=".ttf,.woff,.woff2,.otf" multiple className="hidden"
              onChange={e => e.target.files && handleUpload(e.target.files)} />
          </CardContent>
        </Card>

        {/* Font List */}
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle className="text-base">已上传字体</CardTitle>
              <CardDescription className="mt-1">
                <span className="inline-flex items-center gap-1"><Monitor className="h-3 w-3" /> 应用到CMS</span>
                {' '}— 立即改变 CMS 界面字体（本地生效，刷新后保持）
                <br />
                <span className="inline-flex items-center gap-1"><Globe className="h-3 w-3" /> 应用到博客</span>
                {' '}— 写入 source/custom.css，构建后博客字体生效
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={loadFonts} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 animate-pulse rounded-md bg-muted" />)}</div>
            ) : fonts.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center text-sm text-muted-foreground gap-2">
                <Type className="h-8 w-8 opacity-30" />
                <p>暂无已上传的字体，请先上传字体文件</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {fonts.map(font => {
                  const family = getFamilyName(font.name)
                  const isCmsApplied = appliedFont === family
                  return (
                    <li key={font.path} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-muted">
                        <Type className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-tight truncate">{font.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{formatBytes(font.size)}</span>
                          {isCmsApplied && (
                            <Badge className="text-xs h-4 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                              CMS 已应用
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                        {/* Apply to CMS */}
                        <Button
                          variant={isCmsApplied ? 'default' : 'outline'}
                          size="sm" className="text-xs h-8 gap-1"
                          onClick={() => isCmsApplied ? handleResetCms() : handleApplyCms(font)}
                          title={isCmsApplied ? '取消 CMS 字体' : '应用到 CMS 界面'}
                        >
                          <Monitor className="h-3 w-3" />
                          {isCmsApplied ? '取消CMS' : 'CMS'}
                        </Button>
                        {/* Apply to Blog */}
                        <Button
                          variant="outline" size="sm" className="text-xs h-8 gap-1"
                          onClick={() => handleApplyBlog(font)}
                          disabled={applyingBlog === font.path}
                          title="写入 source/custom.css，博客构建后生效"
                        >
                          <Globe className="h-3 w-3" />
                          {applyingBlog === font.path ? '写入…' : '博客'}
                        </Button>
                        {/* Copy CSS */}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyCss(font)} title="复制 @font-face CSS">
                          {copiedPath === font.path ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                        {/* Delete */}
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDelete(font)} disabled={deleting === font.path}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Tip */}
        <Card className="border-amber-200 bg-amber-50/40 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="pt-5">
            <div className="flex gap-3 text-sm text-amber-900 dark:text-amber-200">
              <Info className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
              <div className="space-y-1.5">
                <p className="font-medium">博客字体生效前提</p>
                <p className="text-xs opacity-80">
                  点击"博客"按钮后，会将 <code>@font-face</code> CSS 写入仓库 <code>source/custom.css</code>。
                  博客主题需要在 <code>&lt;head&gt;</code> 中引入此文件才能生效。
                </p>
                <p className="text-xs opacity-80">
                  <strong>Fluid 主题配置方法：</strong>在 <code>_config.fluid.yml</code> 中找到 <code>custom_css</code> 字段，添加 <code>/custom.css</code>：
                </p>
                <pre className="text-xs bg-amber-100/60 dark:bg-amber-900/40 rounded p-2 overflow-x-auto">{`custom_css:
  - /custom.css`}</pre>
                <p className="text-xs opacity-80">
                  修改后进入 <strong>主题管理</strong> 页面保存配置，或 <code>git commit &amp;&amp; git push</code> 触发构建。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}
