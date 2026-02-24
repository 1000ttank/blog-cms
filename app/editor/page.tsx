'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PostEditor } from '@/components/post/PostEditor'
import { usePostStore } from '@/store/postStore'

function EditPostContent() {
  const searchParams = useSearchParams()
  const { fetchPost, currentPost, isLoading } = usePostStore()

  const filePath = searchParams.get('path')
    ? decodeURIComponent(searchParams.get('path')!)
    : null

  useEffect(() => {
    if (filePath) {
      fetchPost(filePath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath])

  if (!filePath) {
    return (
      <AppShell title="编辑文章">
        <div className="flex h-96 items-center justify-center text-muted-foreground text-sm">
          未指定文章路径
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell title={currentPost?.frontmatter.title ?? '编辑文章'}>
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        // key=path forces PostEditor to remount (and reinitialize useState)
        // whenever the target post changes, preventing stale draft-switch state
        <PostEditor key={currentPost?.path} mode="edit" post={currentPost ?? undefined} />
      )}
    </AppShell>
  )
}

export default function EditPostPage() {
  return (
    <Suspense
      fallback={
        <AppShell title="编辑文章">
          <div className="flex h-96 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </AppShell>
      }
    >
      <EditPostContent />
    </Suspense>
  )
}
