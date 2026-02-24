'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { PenSquare, Search, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PostCard } from '@/components/post/PostCard'
import { usePostStore } from '@/store/postStore'
import { ROUTES } from '@/config/constants'
import type { PostStatus } from '@/types'

export default function PostsPage() {
  const router = useRouter()
  const { posts, isLoading, filter, fetchPosts, deletePost, publishDraft, unpublishPost, setFilter } =
    usePostStore()
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchPosts(filter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtered = posts.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase()),
  )

  async function handleDelete(path: string, sha: string, title: string) {
    if (!confirm(`确认删除文章「${title}」？此操作不可撤销。`)) return
    try {
      await deletePost(path, sha)
      toast.success(`已删除文章「${title}」`)
    } catch {
      toast.error('删除失败，请重试')
    }
  }

  async function handlePublish(path: string, sha: string, title: string) {
    try {
      await publishDraft(path, sha)
      toast.success(`已发布「${title}」`)
    } catch {
      toast.error('发布失败，请重试')
    }
  }

  async function handleUnpublish(path: string, sha: string, title: string) {
    try {
      await unpublishPost(path, sha)
      toast.success(`已将「${title}」移至草稿`)
    } catch {
      toast.error('操作失败，请重试')
    }
  }

  return (
    <AppShell title="文章管理">
      <div className="space-y-5">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative max-w-xs w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索文章标题..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs
              value={filter}
              onValueChange={(v) => setFilter(v as PostStatus)}
              className="shrink-0"
            >
              <TabsList>
                <TabsTrigger value="all">全部</TabsTrigger>
                <TabsTrigger value="published">已发布</TabsTrigger>
                <TabsTrigger value="draft">草稿</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPosts(filter)}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Link href={ROUTES.EDITOR_NEW}>
              <Button size="sm" className="gap-2">
                <PenSquare className="h-4 w-4" />
                新建文章
              </Button>
            </Link>
          </div>
        </div>

        {/* Post List */}
        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-muted-foreground">
              {search ? `没有找到包含「${search}」的文章` : '还没有文章'}
            </p>
            {!search && (
              <Link href={ROUTES.EDITOR_NEW}>
                <Button variant="link" className="mt-2">
                  写第一篇文章
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((post) => (
              <PostCard
                key={post.path}
                post={post}
                onEdit={() => router.push(`${ROUTES.EDITOR}?path=${encodeURIComponent(post.path)}`)}
                onDelete={() => handleDelete(post.path, post.sha, post.title)}
                onPublish={
                  post.isDraft ? () => handlePublish(post.path, post.sha, post.title) : undefined
                }
                onUnpublish={
                  !post.isDraft ? () => handleUnpublish(post.path, post.sha, post.title) : undefined
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}
