'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  FileText, PenSquare, GitBranch, ExternalLink,
  TrendingUp, ArrowRight, AlertCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BuildStatusCard } from '@/components/build/BuildStatusCard'
import { usePostStore } from '@/store/postStore'
import { useAuthStore } from '@/store/authStore'
import { ROUTES } from '@/config/constants'
import { getGitHubClient } from '@/services/githubClient'

function useBlogUrl() {
  const { config } = useAuthStore()
  const [blogUrl, setBlogUrl] = useState<string | null>(null)
  const [urlLoaded, setUrlLoaded] = useState(false)

  useEffect(() => {
    if (!config) return
    getGitHubClient()
      .getFile('_config.yml')
      .then(({ content }) => {
        const urlMatch = content.match(/^url:\s*(.+)$/m)
        const rootMatch = content.match(/^root:\s*(.+)$/m)
        const url = urlMatch?.[1]?.trim()
        const root = rootMatch?.[1]?.trim() ?? '/'
        if (url) {
          setBlogUrl(url.endsWith('/') || root === '/' ? url : url + root)
        }
      })
      .catch(() => {})
      .finally(() => setUrlLoaded(true))
  }, [config])

  return { blogUrl, urlLoaded }
}

export default function DashboardPage() {
  const { posts, fetchPosts, isLoading } = usePostStore()
  const { user } = useAuthStore()
  const { blogUrl, urlLoaded } = useBlogUrl()

  useEffect(() => { fetchPosts('all') }, [fetchPosts])

  const published = posts.filter((p) => !p.isDraft)
  const drafts = posts.filter((p) => p.isDraft)
  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  return (
    <AppShell title="仪表盘">
      <div className="space-y-6">
        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              欢迎回来{user?.name ? `，${user.name}` : ''}！
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              今天是 {format(new Date(), 'yyyy年MM月dd日 EEEE', { locale: zhCN })}
            </p>
          </div>
          {urlLoaded && (
            blogUrl ? (
              <a href={blogUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm" className="gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  查看博客
                </Button>
              </a>
            ) : (
              <Link href={`${ROUTES.GUIDE}#第三步修改-blog_configyml-配置`}>
                <Button variant="outline" size="sm" className="gap-2 text-amber-600 border-amber-300">
                  <AlertCircle className="h-3.5 w-3.5" />
                  配置博客 URL
                </Button>
              </Link>
            )
          )}
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href={`${ROUTES.POSTS}?filter=published`}>
            <Card className="cursor-pointer hover:bg-accent/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">已发布文章</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '—' : published.length}</div>
                <p className="text-xs text-muted-foreground mt-1">source/_posts</p>
              </CardContent>
            </Card>
          </Link>

          <Link href={`${ROUTES.POSTS}?filter=draft`}>
            <Card className="cursor-pointer hover:bg-accent/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">草稿</CardTitle>
                <PenSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{isLoading ? '—' : drafts.length}</div>
                <p className="text-xs text-muted-foreground mt-1">source/_drafts</p>
              </CardContent>
            </Card>
          </Link>

          <a
            href={`https://github.com/${useAuthStore.getState().config?.owner}/${useAuthStore.getState().config?.repo}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Card className="cursor-pointer hover:bg-accent/40 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">仓库</CardTitle>
                <GitBranch className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold truncate">
                  {useAuthStore.getState().config
                    ? `${useAuthStore.getState().config!.owner}/${useAuthStore.getState().config!.repo}`
                    : '—'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  分支: {useAuthStore.getState().config?.branch ?? 'main'}
                </p>
              </CardContent>
            </Card>
          </a>
        </div>

        {/* Recent Posts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                最近文章
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">最新创建或修改的文章（含草稿）</CardDescription>
            </div>
            <Link href={ROUTES.POSTS}>
              <Button variant="ghost" size="icon" className="h-7 w-7" title="查看全部">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2.5">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="h-3.5 w-4/5 animate-pulse rounded bg-muted" />
                    <div className="h-3.5 w-1/5 animate-pulse rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : recentPosts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <p>还没有文章。</p>
                <Link href={ROUTES.EDITOR_NEW}>
                  <Button variant="link" size="sm" className="mt-2">创建第一篇文章</Button>
                </Link>
              </div>
            ) : (
              <ul className="space-y-2.5">
                {recentPosts.map((post) => (
                  <li key={post.path} className="flex items-center justify-between gap-3">
                    <Link
                      href={`${ROUTES.EDITOR}?path=${encodeURIComponent(post.path)}`}
                      className="flex-1 min-w-0 text-sm hover:text-primary transition-colors truncate"
                    >
                      {post.title}
                    </Link>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        variant={post.isDraft ? 'secondary' : 'outline'}
                        className="text-xs h-4 py-0"
                      >
                        {post.isDraft ? '草稿' : '已发布'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(post.date), 'MM-dd', { locale: zhCN })}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Build Status */}
        <BuildStatusCard />

        {/* Quick Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Link href={ROUTES.EDITOR_NEW}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <PenSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">新建文章</p>
                  <p className="text-xs text-muted-foreground">写一篇新的博客文章</p>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href={ROUTES.SETTINGS}>
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <GitBranch className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">仓库设置</p>
                  <p className="text-xs text-muted-foreground">管理 GitHub 仓库配置</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </AppShell>
  )
}
