'use client'

import { useRouter } from 'next/navigation'
import { Moon, Sun, LogOut, User } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
import { ROUTES } from '@/config/constants'

interface HeaderProps {
  title?: string
}

export function Header({ title }: HeaderProps) {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { theme, setTheme } = useUIStore()

  function handleLogout() {
    logout()
    toast.success('已退出登录')
    router.push(ROUTES.LOGIN)
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      {title && <h1 className="text-lg font-semibold">{title}</h1>}
      {!title && <div />}

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="切换主题">
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        {user && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground">
            {user.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.avatar_url}
                alt={user.login}
                className="h-6 w-6 rounded-full"
              />
            ) : (
              <User className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{user.name ?? user.login}</span>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="退出登录">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}
