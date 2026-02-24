'use client'

import { AppShell } from '@/components/layout/AppShell'
import { PostEditor } from '@/components/post/PostEditor'

export default function NewPostPage() {
  return (
    <AppShell title="新建文章">
      <PostEditor mode="create" />
    </AppShell>
  )
}
