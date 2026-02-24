'use client'

import { useEffect, useState } from 'react'
import { useUIStore } from '@/store/uiStore'

/** Returns the resolved theme ('light' | 'dark') for components that need it (e.g. MDEditor data-color-mode). */
export function useResolvedTheme(): 'light' | 'dark' {
  const theme = useUIStore((s) => s.theme)
  const [systemResolved, setSystemResolved] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') return 'light'
    return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  })

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    setSystemResolved(mq.matches ? 'dark' : 'light')
    const handler = () => setSystemResolved(mq.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [theme])

  return theme !== 'system' ? theme : systemResolved
}
