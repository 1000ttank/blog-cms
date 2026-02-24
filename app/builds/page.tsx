'use client'

import { useEffect, useState, useCallback } from 'react'
import { formatDistanceToNow, format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  CheckCircle2, XCircle, Loader2, Clock,
  ExternalLink, RefreshCw, ChevronLeft, ChevronRight, Ban, AlertCircle, RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getActionsService } from '@/services/actionsService'
import { getLastGoodSnapshot } from '@/services/configBackupService'
import { ROUTES } from '@/config/constants'
import type { WorkflowRun, WorkflowRunConclusion } from '@/services/actionsService'

const PAGE_SIZE = 10

function StatusIcon({ run }: { run: WorkflowRun }) {
  if (run.status === 'queued') return <Clock className="h-4 w-4 text-muted-foreground" />
  if (run.status === 'in_progress') return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
  if (run.conclusion === 'success') return <CheckCircle2 className="h-4 w-4 text-green-500" />
  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') return <XCircle className="h-4 w-4 text-destructive" />
  if (run.conclusion === 'cancelled') return <Ban className="h-4 w-4 text-muted-foreground" />
  return <AlertCircle className="h-4 w-4 text-amber-500" />
}

function StatusBadge({ status, conclusion }: { status: WorkflowRun['status']; conclusion: WorkflowRunConclusion }) {
  if (status === 'queued') return <Badge variant="secondary">排队中</Badge>
  if (status === 'in_progress') return <Badge className="bg-blue-500 hover:bg-blue-500">构建中</Badge>
  if (conclusion === 'success') return <Badge className="bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">成功</Badge>
  if (conclusion === 'failure') return <Badge variant="destructive">失败</Badge>
  if (conclusion === 'timed_out') return <Badge variant="destructive">超时</Badge>
  if (conclusion === 'cancelled') return <Badge variant="outline">已取消</Badge>
  return <Badge variant="outline">{conclusion ?? status}</Badge>
}

type FilterType = 'all' | 'success' | 'failure' | 'in_progress'

export default function BuildsPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [hasGoodSnapshot, setHasGoodSnapshot] = useState(false)

  const fetchRuns = useCallback(async (p: number) => {
    const service = getActionsService()
    if (!service) return
    setLoading(true)
    try {
      const { runs: data, total: count } = await service.getRecentRuns(PAGE_SIZE, p)
      setRuns(data)
      setTotal(count)
      setLastRefreshed(new Date())
      setHasGoodSnapshot(!!getLastGoodSnapshot())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRuns(page) }, [page, fetchRuns])

  useEffect(() => {
    const hasActive = runs.some(r => r.status !== 'completed')
    if (!hasActive) return
    const timer = setInterval(() => fetchRuns(page), 8000)
    return () => clearInterval(timer)
  }, [runs, page, fetchRuns])

  const filtered = filter === 'all' ? runs
    : runs.filter(r => {
        if (filter === 'in_progress') return r.status !== 'completed'
        return r.conclusion === filter
      })

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <AppShell title="构建历史">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
            <TabsList>
              <TabsTrigger value="all">全部 {total > 0 && `(${total})`}</TabsTrigger>
              <TabsTrigger value="success">成功</TabsTrigger>
              <TabsTrigger value="failure">失败</TabsTrigger>
              <TabsTrigger value="in_progress">进行中</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {lastRefreshed && <span>刷新于 {formatDistanceToNow(lastRefreshed, { locale: zhCN, addSuffix: true })}</span>}
            <Button variant="outline" size="sm" onClick={() => fetchRuns(page)} disabled={loading} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">所有构建记录</CardTitle>
            <CardDescription>每次文章保存后自动触发构建，点击右侧链接可查看完整日志</CardDescription>
          </CardHeader>
          <CardContent>
            {loading && runs.length === 0 ? (
              <div className="space-y-3 py-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="h-4 w-4 shrink-0 animate-pulse rounded-full bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                    </div>
                    <div className="h-6 w-14 animate-pulse rounded-full bg-muted" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">暂无{filter !== 'all' ? '符合条件的' : ''}构建记录</div>
            ) : (
              <ul className="divide-y">
                {filtered.map((run) => (
                  <li key={run.id} className="flex items-center gap-3 py-3">
                    <StatusIcon run={run} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">
                        {run.headCommitMessage ?? run.name ?? `Run #${run.id}`}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        #{run.id} · <span title={format(new Date(run.createdAt), 'yyyy-MM-dd HH:mm:ss')}>
                          {formatDistanceToNow(new Date(run.createdAt), { locale: zhCN, addSuffix: true })}
                        </span>
                        {run.status === 'completed' && (
                          <span className="ml-1">· 用时 {Math.round((new Date(run.updatedAt).getTime() - new Date(run.createdAt).getTime()) / 1000)}s</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(run.conclusion === 'failure' || run.conclusion === 'timed_out') && hasGoodSnapshot && (
                        <Link href={ROUTES.CONFIG} title="恢复到最后一次正确配置">
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                            <RotateCcw className="h-3.5 w-3.5" />
                            恢复配置
                          </Button>
                        </Link>
                      )}
                      <StatusBadge status={run.status} conclusion={run.conclusion} />
                      <a href={run.htmlUrl} target="_blank" rel="noopener noreferrer" title="在 GitHub 查看完整日志" className="text-muted-foreground hover:text-foreground transition-colors">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>第 {page} / {totalPages} 页，共 {total} 条</span>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
