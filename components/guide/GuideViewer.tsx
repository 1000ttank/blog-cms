'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { AlignLeft, X } from 'lucide-react'
import { useResolvedTheme } from '@/hooks/useResolvedTheme'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

const MarkdownPreview = dynamic(() => import('@uiw/react-markdown-preview'), {
  ssr: false,
  loading: () => <div className="flex h-40 items-center justify-center text-muted-foreground text-sm">加载中...</div>,
})

// ─── Heading types ───────────────────────────────────────────────────────────

interface Heading {
  level: number
  text: string
  id: string
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[（(]/g, '')
    .replace(/[）)]/g, '')
    .replace(/[：:]/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w\u4e00-\u9fff-]/g, '')
    .replace(/^-+|-+$/g, '')
}

function parseHeadings(md: string): Heading[] {
  const lines = md.split('\n')
  const result: Heading[] = []
  let inCode = false
  for (const line of lines) {
    if (line.startsWith('```')) { inCode = !inCode; continue }
    if (inCode) continue
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (match) {
      result.push({ level: match[1].length, text: match[2].trim(), id: slugify(match[2].trim()) })
    }
  }
  return result
}

// ─── Split markdown into tabs ────────────────────────────────────────────────

interface SplitContent {
  main: string
  theme: string
  cms: string
  blogQa: string
  cmsQa: string
}

function splitContent(md: string): SplitContent {
  const THEME_MARKER  = '\n## 附：更换 Hexo 主题'
  const CMS_MARKER    = '\n## 部署 CMS 到 GitHub Pages'
  const BLOG_QA_MARKER = '\n## 常见问题'
  const CMS_QA_MARKER  = '\n## CMS 常见问题'

  const themeIdx  = md.indexOf(THEME_MARKER)
  const cmsIdx    = md.indexOf(CMS_MARKER)
  const blogQaIdx = md.indexOf(BLOG_QA_MARKER)
  const cmsQaIdx  = md.indexOf(CMS_QA_MARKER)

  // Collect actual section start positions (only for found markers)
  const positions = [
    themeIdx !== -1  ? themeIdx  : Infinity,
    cmsIdx !== -1    ? cmsIdx    : Infinity,
    blogQaIdx !== -1 ? blogQaIdx : Infinity,
    cmsQaIdx !== -1  ? cmsQaIdx  : Infinity,
  ]
  const firstSplit = Math.min(...positions)

  const main   = (firstSplit < Infinity ? md.slice(0, firstSplit) : md).trim()
  const theme  = themeIdx !== -1
    ? md.slice(themeIdx, Math.min(...positions.filter(p => p > themeIdx))).trim()
    : ''
  const cms    = cmsIdx !== -1
    ? md.slice(cmsIdx, Math.min(...positions.filter(p => p > cmsIdx))).trim()
    : ''
  const blogQa = blogQaIdx !== -1
    ? md.slice(blogQaIdx, Math.min(...positions.filter(p => p > blogQaIdx))).trim()
    : ''
  const cmsQa  = cmsQaIdx !== -1 ? md.slice(cmsQaIdx).trim() : ''

  return { main, theme, cms, blogQa, cmsQa }
}

// ─── TOC Component ───────────────────────────────────────────────────────────

function TocPanel({ headings, onClose }: { headings: Heading[]; onClose?: () => void }) {
  const [active, setActive] = useState('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.filter(e => e.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: '-60px 0px -70% 0px' },
    )
    headings.forEach(h => {
      const el = document.getElementById(h.id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [headings])

  return (
    <nav className="space-y-0.5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">目录</p>
        {onClose && (
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {headings.map(h => (
        <a
          key={h.id}
          href={`#${h.id}`}
          onClick={e => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }}
          className={cn(
            'block text-xs py-0.5 transition-colors leading-relaxed hover:text-foreground',
            h.level === 1 && 'font-medium',
            h.level === 2 && 'pl-3',
            h.level === 3 && 'pl-6',
            active === h.id ? 'text-primary font-medium' : 'text-muted-foreground',
          )}
        >
          {h.text}
        </a>
      ))}
    </nav>
  )
}

// Inject IDs onto headings rendered by MarkdownPreview
function useInjectHeadingIds(headings: Heading[], dep: string) {
  useEffect(() => {
    if (!headings.length) return
    const timer = setTimeout(() => {
      const headingEls = document.querySelectorAll<HTMLElement>(
        '.wmde-markdown h1, .wmde-markdown h2, .wmde-markdown h3',
      )
      let idx = 0
      headingEls.forEach(el => {
        if (idx < headings.length) {
          el.id = headings[idx].id
          idx++
        }
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [headings, dep])
}

// ─── Main GuideViewer ────────────────────────────────────────────────────────

interface GuideViewerProps {
  content: string
}

function MdPanel({ source, colorMode }: { source: string; colorMode: 'light' | 'dark' }) {
  return (
    <div data-color-mode={colorMode} className="rounded-lg border bg-card p-6">
      <MarkdownPreview
        source={source}
        style={{ background: 'transparent', fontSize: '14px' }}
        wrapperElement={{ 'data-color-mode': colorMode } as React.HTMLAttributes<HTMLDivElement>}
      />
    </div>
  )
}

export function GuideViewer({ content }: GuideViewerProps) {
  const [tab, setTab] = useState('main')
  const [tocOpen, setTocOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const resolvedTheme = useResolvedTheme()

  const { main, theme, cms, blogQa, cmsQa } = splitContent(content)

  const headingMap: Record<string, Heading[]> = {
    main:   parseHeadings(main),
    theme:  parseHeadings(theme),
    cms:    parseHeadings(cms),
    blogQa: parseHeadings(blogQa),
    cmsQa:  parseHeadings(cmsQa),
  }
  const currentHeadings = headingMap[tab] ?? []

  useInjectHeadingIds(currentHeadings, tab)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      setIsNarrow(w < 860)
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const tabs = [
    { value: 'main',   label: '快速部署 Hexo',  content: main },
    ...(theme  ? [{ value: 'theme',  label: '更换 Hexo 主题', content: theme }]  : []),
    ...(cms    ? [{ value: 'cms',    label: '部署 CMS',        content: cms }]    : []),
    ...(blogQa ? [{ value: 'blogQa', label: 'Blog 常见问题',   content: blogQa }] : []),
    ...(cmsQa  ? [{ value: 'cmsQa',  label: 'CMS 常见问题',    content: cmsQa }]  : []),
  ]

  return (
    <div ref={containerRef} className="relative">
      <Tabs value={tab} onValueChange={v => { setTab(v); setTocOpen(false) }}>
        <TabsList className="mb-4 flex-wrap h-auto gap-y-1">
          {tabs.map(t => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>

        <div className="flex gap-6 items-start">
          <div className="min-w-0 flex-1">
            {tabs.map(t => (
              <TabsContent key={t.value} value={t.value} className="mt-0">
                <MdPanel source={t.content} colorMode={resolvedTheme} />
              </TabsContent>
            ))}
          </div>

          {!isNarrow && currentHeadings.length > 0 && (
            <aside className="w-52 shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border bg-card p-4">
              <TocPanel headings={currentHeadings} />
            </aside>
          )}
        </div>
      </Tabs>

      {isNarrow && currentHeadings.length > 0 && (
        <>
          <button
            onClick={() => setTocOpen(o => !o)}
            className="fixed bottom-6 right-6 z-50 flex h-11 w-11 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
            title="目录"
            aria-label="打开目录"
          >
            <AlignLeft className="h-5 w-5" />
          </button>

          {tocOpen && (
            <>
              <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setTocOpen(false)} />
              <div className="fixed bottom-20 right-4 z-50 w-64 rounded-xl border bg-card p-4 shadow-xl">
                <TocPanel headings={currentHeadings} onClose={() => setTocOpen(false)} />
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
