'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ExternalLink,
  RefreshCw,
  GitCommit,
  RotateCcw,
} from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { getActionsService } from '@/services/actionsService'
import { markSnapshotAsGood, getLastGoodSnapshot } from '@/services/configBackupService'
import { ROUTES } from '@/config/constants'
import type { WorkflowRun } from '@/services/actionsService'

function RunStatusIcon({ run }: { run: WorkflowRun }) {
  if (run.status === 'in_progress' || run.status === 'queued') {
    return <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
  }
  if (run.conclusion === 'success') {
    return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
  }
  if (run.conclusion === 'failure' || run.conclusion === 'timed_out') {
    return <XCircle className="h-4 w-4 text-destructive shrink-0" />
  }
  return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
}

function RunStatusBadge({ run }: { run: WorkflowRun }) {
  if (run.status === 'queued') {
    return <Badge variant="secondary" className="text-xs">排队中</Badge>
  }
  if (run.status === 'in_progress') {
    return <Badge className="text-xs bg-blue-500 hover:bg-blue-500">构建中</Badge>
  }
  if (run.conclusion === 'success') {
    return (
      <Badge className="text-xs bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20">
        成功
      </Badge>
    )
  }
  if (run.conclusion === 'failure') {
    return <Badge variant="destructive" className="text-xs">失败</Badge>
  }
  if (run.conclusion === 'cancelled') {
    return <Badge variant="outline" className="text-xs">已取消</Badge>
  }
  return <Badge variant="outline" className="text-xs">{run.conclusion ?? run.status}</Badge>
}

interface BuildStatusCardProps {
  /** Auto-refresh interval in ms, 0 = disabled */
  refreshInterval?: number
}

export function BuildStatusCard({ refreshInterval = 30000 }: BuildStatusCardProps) {
  const [runs, setRuns] = useState<WorkflowRun[]>([])
  const [loading, setLoading] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [hasGoodSnapshot, setHasGoodSnapshot] = useState(false)
  const prevRunsRef = useRef<WorkflowRun[]>([])

  const fetchRuns = useCallback(async () => {
    const service = getActionsService()
    if (!service) return
    setLoading(true)
    try {
      const { runs: data } = await service.getRecentRuns(5)
      // When latest run transitions to success, mark snapshot as good
      const latestNew = data[0]
      const latestPrev = prevRunsRef.current[0]
      if (latestNew?.conclusion === 'success' && latestPrev?.id === latestNew.id && latestPrev.conclusion !== 'success') {
        markSnapshotAsGood()
      } else if (latestNew?.conclusion === 'success' && !latestPrev) {
        markSnapshotAsGood()
      }
      prevRunsRef.current = data
      setRuns(data)
      setLastRefreshed(new Date())
      setHasGoodSnapshot(!!getLastGoodSnapshot())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRuns()
  }, [fetchRuns])

  // Auto-refresh when a run is in_progress or queued
  useEffect(() => {
    const hasActive = runs.some(
      (r) => r.status === 'in_progress' || r.status === 'queued',
    )
    const interval = hasActive ? 8000 : refreshInterval
    if (!interval) return
    const timer = setInterval(fetchRuns, interval)
    return () => clearInterval(timer)
  }, [runs, refreshInterval, fetchRuns])

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base flex items-center gap-2">
            <GitCommit className="h-4 w-4" />
            构建状态
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            最近 5 次 GitHub Actions 构建记录
            {lastRefreshed && (
              <span className="ml-1">
                · 刷新于{' '}
                {formatDistanceToNow(lastRefreshed, { locale: zhCN, addSuffix: true })}
              </span>
            )}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={fetchRuns}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent>
        {loading && runs.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-4 w-4 animate-pulse rounded-full bg-muted" />
                <div className="h-3 flex-1 animate-pulse rounded bg-muted" />
                <div className="h-5 w-12 animate-pulse rounded-full bg-muted" />
              </div>
            ))}
          </div>
        ) : runs.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            暂无构建记录
          </p>
        ) : (
          <ul className="space-y-2.5">
            {runs.map((run) => (
              <li
                key={run.id}
                className="group flex items-start gap-3"
              >
                <div className="mt-0.5">
                  <RunStatusIcon run={run} />
                </div>

                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-sm font-medium leading-tight truncate">
                    {run.headCommitMessage ?? run.name ?? `#${run.id}`}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(run.createdAt), {
                      locale: zhCN,
                      addSuffix: true,
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {(run.conclusion === 'failure' || run.conclusion === 'timed_out') && hasGoodSnapshot && (
                    <Link href={ROUTES.CONFIG} title="恢复到最后一次正确配置">
                      <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1 text-amber-600 hover:text-amber-700 hover:bg-amber-50">
                        <RotateCcw className="h-3 w-3" />
                        恢复
                      </Button>
                    </Link>
                  )}
                  <RunStatusBadge run={run} />
                  <a
                    href={run.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="在 GitHub 查看详情"
                  >
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
