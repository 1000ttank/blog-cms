'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Handles the SPA redirect from 404.html on GitHub Pages.
 * When the user hard-refreshes a deep URL (e.g. /editor/foo), GitHub Pages
 * serves 404.html which encodes the path as ?p=<encoded>. This component
 * reads that param and restores the correct client-side route.
 */
export function SpaRedirectHandler() {
  const router = useRouter()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encodedPath = params.get('p')
    if (!encodedPath) return

    const decoded = decodeURIComponent(encodedPath)
    // decoded may look like: "editor/source%2F_posts%2Ffoo.md"
    // Restore any nested query string (&q=...) that was encoded inside
    const [pathPart, qPart] = decoded.split('&q=')
    const targetPath =
      '/' + pathPart + (qPart ? '?' + decodeURIComponent(qPart) : '')

    // Replace current URL to clean up the ?p= query param
    router.replace(targetPath)
  }, [router])

  return null
}
