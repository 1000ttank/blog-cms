'use client'

/**
 * Reads the user-selected font CSS from localStorage and injects it into <head>
 * on every page, so the chosen font persists across navigation.
 *
 * The fonts page stores the full @font-face + body rule under the key
 * 'cms-font-css'. This component just re-applies it on mount.
 */
import { useEffect } from 'react'

export const FONT_CSS_KEY = 'cms-font-css'
export const FONT_NAME_KEY = 'cms-applied-font'

export function GlobalFontProvider() {
  useEffect(() => {
    const css = localStorage.getItem(FONT_CSS_KEY)
    if (!css) return
    injectFontCss(css)
  }, [])

  return null
}

export function injectFontCss(css: string) {
  let el = document.getElementById('cms-custom-font') as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = 'cms-custom-font'
    document.head.appendChild(el)
  }
  el.textContent = css
}

export function clearFontCss() {
  localStorage.removeItem(FONT_CSS_KEY)
  localStorage.removeItem(FONT_NAME_KEY)
  const el = document.getElementById('cms-custom-font')
  if (el) el.remove()
}
