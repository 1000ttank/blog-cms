'use client'

import { AppShell } from '@/components/layout/AppShell'
import { ImageHostingSettings } from '@/components/settings/ImageHostingSettings'

export default function ImageHostingPage() {
  return (
    <AppShell title="图床配置" fullWidth>
      <ImageHostingSettings />
    </AppShell>
  )
}
