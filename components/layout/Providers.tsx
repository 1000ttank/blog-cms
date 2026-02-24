'use client'

import { useEffect } from 'react'
import { Toaster } from 'sonner'
import { useUIStore } from '@/store/uiStore'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const { theme, setTheme } = useUIStore()

  useEffect(() => {
    setTheme(theme)
  }, [theme, setTheme])

  return (
    <>
      {children}
      <Toaster richColors position="top-right" closeButton />
    </>
  )
}
