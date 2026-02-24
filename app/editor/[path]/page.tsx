'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'
import { PostEditor } from '@/components/post/PostEditor'
import { usePostStore } from '@/store/postStore'

export default function EditPostPage() {
  const params = useParams()
  const { fetchPost, currentPost, isLoading } = usePostStore()

  const filePath = decodeURIComponent(params.path as string)

  useEffect(() => {
    if (filePath) {
      fetchPost(filePath)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath])

  return (
    <AppShell title={currentPost?.frontmatter.title ?? '编辑文章'}>
      {isLoading ? (
        <div className="flex h-96 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <PostEditor mode="edit" post={currentPost ?? undefined} />
      )}
    </AppShell>
  )
}
