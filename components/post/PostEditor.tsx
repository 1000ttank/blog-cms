'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { Save, SendHorizonal, Eye, Code2, SplitSquareHorizontal, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { FrontmatterForm } from './FrontmatterForm'
import { usePostStore } from '@/store/postStore'
import { useResolvedTheme } from '@/hooks/useResolvedTheme'
import { ROUTES } from '@/config/constants'
import type { Post, PostInput } from '@/types'

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), {
  ssr: false,
  loading: () => (
    <div className="flex h-96 items-center justify-center rounded-lg border bg-muted text-muted-foreground text-sm">
      加载编辑器中...
    </div>
  ),
})

type EditorView = 'edit' | 'preview' | 'split'

interface PostEditorProps {
  mode: 'create' | 'edit'
  post?: Post
}

const DEFAULT_BODY = `## 简介

在这里写下你的文章内容...

## 正文

支持完整的 **Markdown** 语法，包括：

- 列表
- \`代码\`
- [链接](https://github.com)
- 图片

\`\`\`typescript
console.log('Hello, Blogo CMS!')
\`\`\`
`

export function PostEditor({ mode, post }: PostEditorProps) {
  const router = useRouter()
  const { createPost, updatePost, publishDraft, isSaving } = usePostStore()
  const resolvedTheme = useResolvedTheme()

  const [frontmatter, setFrontmatter] = useState<Omit<PostInput, 'body'>>({
    title: post?.frontmatter.title ?? '',
    tags: (post?.frontmatter.tags ?? []) as string[],
    categories: (post?.frontmatter.categories ?? []) as string[],
    draft: post?.isDraft ?? false,
    description: post?.frontmatter.description as string | undefined,
    cover: post?.frontmatter.cover as string | undefined,
    slug: post?.frontmatter.slug as string | undefined,
  })

  const [body, setBody] = useState<string>(post?.body ?? DEFAULT_BODY)
  const [editorView, setEditorView] = useState<EditorView>('split')

  // Sync state when the post prop changes (e.g. after draft-status move + navigation).
  // This is a belt-and-suspenders guard; the `key` prop on PostEditor already handles
  // remounting when the path changes, but this covers any edge case where it doesn't.
  useEffect(() => {
    if (mode === 'edit' && post) {
      setFrontmatter({
        title: post.frontmatter.title ?? '',
        tags: (post.frontmatter.tags ?? []) as string[],
        categories: (post.frontmatter.categories ?? []) as string[],
        draft: post.isDraft,
        description: post.frontmatter.description as string | undefined,
        cover: post.frontmatter.cover as string | undefined,
        slug: post.frontmatter.slug as string | undefined,
      })
      setBody(post.body ?? DEFAULT_BODY)
    }
    // Only re-run when the post's identity (path + sha) changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post?.path, post?.sha])

  // Auto-save to sessionStorage
  useEffect(() => {
    if (mode === 'create') {
      const autosaveKey = 'hexo_nx_cms_autosave'
      const saved = sessionStorage.getItem(autosaveKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (parsed.body) setBody(parsed.body)
          if (parsed.frontmatter) setFrontmatter(parsed.frontmatter)
        } catch {
          // ignore
        }
      }
    }
  }, [mode])

  useEffect(() => {
    if (mode === 'create') {
      const autosaveKey = 'hexo_nx_cms_autosave'
      const timeout = setTimeout(() => {
        sessionStorage.setItem(autosaveKey, JSON.stringify({ frontmatter, body }))
      }, 1000)
      return () => clearTimeout(timeout)
    }
  }, [frontmatter, body, mode])

  const handleSave = useCallback(async () => {
    if (!frontmatter.title.trim()) {
      toast.error('请输入文章标题')
      return
    }

    const input: PostInput = { ...frontmatter, body }

    try {
      if (mode === 'create') {
        const created = await createPost(input)
        sessionStorage.removeItem('hexo_nx_cms_autosave')
        toast.success('文章已创建！')
        router.push(`${ROUTES.EDITOR}?path=${encodeURIComponent(created.path)}`)
      } else if (post) {
        const updated = await updatePost(post.path, input, post.sha)
        toast.success('文章已保存！')
        // If draft status toggled, the file path changed — navigate to the new path
        if (updated.path !== post.path) {
          router.push(`${ROUTES.EDITOR}?path=${encodeURIComponent(updated.path)}`)
        }
      }
    } catch {
      toast.error('保存失败，请重试')
    }
  }, [frontmatter, body, mode, post, createPost, updatePost, router])

  async function handlePublish() {
    if (!post?.isDraft) {
      toast.info('文章已是发布状态')
      return
    }
    try {
      await publishDraft(post.path, post.sha)
      toast.success('文章已发布！')
      router.push(ROUTES.POSTS)
    } catch {
      toast.error('发布失败，请重试')
    }
  }

  const editorMode =
    editorView === 'edit' ? 'edit' : editorView === 'preview' ? 'preview' : undefined

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>编辑器</span>
          {frontmatter.title && (
            <>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground truncate max-w-64">
                {frontmatter.title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Tabs
            value={editorView}
            onValueChange={(v) => setEditorView(v as EditorView)}
          >
            <TabsList className="h-8">
              <TabsTrigger value="edit" className="h-7 px-2 text-xs gap-1">
                <Code2 className="h-3 w-3" />
                编辑
              </TabsTrigger>
              <TabsTrigger value="split" className="h-7 px-2 text-xs gap-1">
                <SplitSquareHorizontal className="h-3 w-3" />
                分栏
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-7 px-2 text-xs gap-1">
                <Eye className="h-3 w-3" />
                预览
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {mode === 'edit' && post?.isDraft && (
            <Button
              variant="outline"
              size="sm"
              onClick={handlePublish}
              disabled={isSaving}
              className="gap-2 text-green-600 border-green-600/30 hover:bg-green-50 hover:text-green-700"
            >
              <SendHorizonal className="h-3.5 w-3.5" />
              发布
            </Button>
          )}

          <Button size="sm" onClick={handleSave} disabled={isSaving} className="gap-2">
            {isSaving ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                保存中...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                保存
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Frontmatter Sidebar */}
        <div className="w-72 shrink-0 overflow-y-auto rounded-lg border bg-card p-4">
          <h3 className="mb-3 text-sm font-medium">文章信息</h3>
          <FrontmatterForm value={frontmatter} onChange={setFrontmatter} />
        </div>

        <Separator orientation="vertical" />

        {/* Markdown Editor */}
        <div className="flex-1 overflow-hidden" data-color-mode={resolvedTheme}>
          <MDEditor
            value={body}
            onChange={(v) => setBody(v ?? '')}
            preview={editorMode}
            height="100%"
            visibleDragbar={false}
            style={{ height: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}
