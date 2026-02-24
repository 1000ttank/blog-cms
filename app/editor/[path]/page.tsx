import { EditPostPageClient } from './EditPostPageClient'

// Required for `output: 'export'` — actual paths are resolved at runtime via GitHub API.
// An empty array tells Next.js "no pages to pre-render"; client-side navigation handles routing.
export function generateStaticParams() {
  return []
}

export default function EditPostPage() {
  return <EditPostPageClient />
}
