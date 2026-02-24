import { readFileSync } from 'fs'
import { join } from 'path'
import { AppShell } from '@/components/layout/AppShell'
import { GuideViewer } from '@/components/guide/GuideViewer'

export const metadata = { title: '入门指南' }

export default function GuidePage() {
  const content = readFileSync(join(process.cwd(), 'docs/getting-started.md'), 'utf-8')
  return (
    <AppShell title="入门指南" fullWidth>
      <GuideViewer content={content} />
    </AppShell>
  )
}
