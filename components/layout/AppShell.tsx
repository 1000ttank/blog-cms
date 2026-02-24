'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/config/constants'

interface AppShellProps {
  children: React.ReactNode
  title?: string
  fullWidth?: boolean
}

export function AppShell({ children, title, fullWidth }: AppShellProps) {
  const router = useRouter()
  const { isAuthenticated, isLoading, restoreSession } = useAuthStore()

  useEffect(() => {
    restoreSession().then(() => {
      if (!useAuthStore.getState().isAuthenticated) {
        router.replace(ROUTES.LOGIN)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">正在验证登录状态...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className={`flex-1 overflow-auto p-6 w-full ${fullWidth ? 'max-w-none' : ''}`}>{children}</main>
      </div>
    </div>
  )
}
