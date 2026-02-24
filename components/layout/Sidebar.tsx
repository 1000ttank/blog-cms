'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  FileText,
  PenSquare,
  Palette,
  Settings,
  ExternalLink,
  ChevronLeft,
  BookOpen,
  Hammer,
  Type,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useUIStore } from '@/store/uiStore'
import { useAuthStore } from '@/store/authStore'
import { APP_NAME, ROUTES } from '@/config/constants'

const navItems = [
  {
    label: '仪表盘',
    href: ROUTES.DASHBOARD,
    icon: LayoutDashboard,
  },
  {
    label: '文章管理',
    href: ROUTES.POSTS,
    icon: FileText,
  },
  {
    label: '新建文章',
    href: ROUTES.EDITOR_NEW,
    icon: PenSquare,
  },
  {
    label: '配置管理',
    href: ROUTES.CONFIG,
    icon: Palette,
  },
  {
    label: '字体管理',
    href: ROUTES.FONTS,
    icon: Type,
  },
  {
    label: '构建历史',
    href: ROUTES.BUILDS,
    icon: Hammer,
  },
  {
    label: '设置',
    href: ROUTES.SETTINGS,
    icon: Settings,
  },
  {
    label: '入门指南',
    href: ROUTES.GUIDE,
    icon: BookOpen,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, toggleSidebar } = useUIStore()
  const { config } = useAuthStore()

  const blogUrl = config
    ? `https://${config.owner}.github.io/${config.repo}`
    : '#'

  return (
    <aside
      className={cn(
        'relative flex flex-col border-r bg-card transition-all duration-300',
        sidebarOpen ? 'w-60' : 'w-16',
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-4">
        {sidebarOpen ? (
          <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              H
            </div>
            <span className="font-semibold text-sm truncate">{APP_NAME}</span>
          </Link>
        ) : (
          <Link href={ROUTES.DASHBOARD}>
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
              H
            </div>
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    !sidebarOpen && 'justify-center px-2',
                  )}
                  title={!sidebarOpen ? item.label : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      <Separator />

      {/* Blog Link */}
      {sidebarOpen && (
        <div className="p-4">
          <a
            href={blogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">查看博客</span>
          </a>
        </div>
      )}

      {/* Collapse Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleSidebar}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-sm"
        aria-label={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
      >
        <ChevronLeft
          className={cn('h-3 w-3 transition-transform', !sidebarOpen && 'rotate-180')}
        />
      </Button>
    </aside>
  )
}
