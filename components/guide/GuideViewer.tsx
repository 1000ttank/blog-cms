'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef, useState } from 'react'
import { AlignLeft, X } from 'lucide-react'
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
  return md
    .split('\n')
    .filter(line => /^#{1,3}\s/.test(line))
    .map(line => {
      const match = line.match(/^(#{1,3})\s+(.+)$/)
      if (!match) return null
      const level = match[1].length
      const text = match[2].trim()
      return { level, text, id: slugify(text) }
    })
    .filter(Boolean) as Heading[]
}

// ─── Split markdown into tabs ────────────────────────────────────────────────

function splitContent(md: string) {
  const qaMarker = '\n## 常见问题'
  const qaIdx = md.indexOf(qaMarker)
  if (qaIdx === -1) return { main: md, qa: '' }
  return {
    main: md.slice(0, qaIdx).trim(),
    qa: md.slice(qaIdx).trim(),
  }
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

export function GuideViewer({ content }: GuideViewerProps) {
  const [tab, setTab] = useState('main')
  const [tocOpen, setTocOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNarrow, setIsNarrow] = useState(false)

  const { main: mainContent, qa: qaContent } = splitContent(content)
  const mainHeadings = parseHeadings(mainContent)
  const qaHeadings = parseHeadings(qaContent)
  const currentHeadings = tab === 'main' ? mainHeadings : qaHeadings

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

  return (
    <div ref={containerRef} className="relative">
      <Tabs value={tab} onValueChange={v => { setTab(v); setTocOpen(false) }}>
        <TabsList className="mb-4">
          <TabsTrigger value="main">快速部署 Hexo</TabsTrigger>
          {qaContent && <TabsTrigger value="qa">常见问题 Q&amp;A</TabsTrigger>}
        </TabsList>

        {/* Wide layout: content + right TOC */}
        <div className="flex gap-6 items-start">
          <div className="min-w-0 flex-1">
            <TabsContent value="main" className="mt-0">
              <div data-color-mode="light" className="rounded-lg border bg-card p-6">
                <MarkdownPreview
                  source={mainContent}
                  style={{ background: 'transparent', fontSize: '14px' }}
                  wrapperElement={{ 'data-color-mode': 'light' } as React.HTMLAttributes<HTMLDivElement>}
                />
              </div>
            </TabsContent>
            {qaContent && (
              <TabsContent value="qa" className="mt-0">
                <div data-color-mode="light" className="rounded-lg border bg-card p-6">
                  <MarkdownPreview
                    source={qaContent}
                    style={{ background: 'transparent', fontSize: '14px' }}
                    wrapperElement={{ 'data-color-mode': 'light' } as React.HTMLAttributes<HTMLDivElement>}
                  />
                </div>
              </TabsContent>
            )}
          </div>

          {/* Sticky sidebar TOC (wide screens) */}
          {!isNarrow && currentHeadings.length > 0 && (
            <aside className="w-52 shrink-0 sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-lg border bg-card p-4">
              <TocPanel headings={currentHeadings} />
            </aside>
          )}
        </div>
      </Tabs>

      {/* Narrow: floating TOC button */}
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

          {/* TOC drawer overlay */}
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
