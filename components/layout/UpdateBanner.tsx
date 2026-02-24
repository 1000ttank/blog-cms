'use client'

import { useEffect, useState } from 'react'
import { Bell, X, Copy, Check, ExternalLink, ArrowRight } from 'lucide-react'
import { VERSION_CHECK } from '@/config/constants'
import { checkForUpdate, type VersionCheckResult } from '@/services/versionService'

const DISMISS_KEY = VERSION_CHECK.DISMISS_KEY

function getDismissedUntil(): number {
  try { return Number(localStorage.getItem(DISMISS_KEY) ?? 0) } catch { return 0 }
}

function setDismissedFor24h() {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now() + VERSION_CHECK.CACHE_TTL)) } catch {}
}

export function UpdateBanner() {
  const [info, setInfo] = useState<VersionCheckResult | null>(null)
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    // Skip if user dismissed recently
    if (Date.now() < getDismissedUntil()) return

    checkForUpdate().then((result) => {
      if (result.hasUpdate) {
        setInfo(result)
        setVisible(true)
      }
    })
  }, [])

  if (!visible || !info) return null

  function handleDismiss() {
    setDismissedFor24h()
    setVisible(false)
  }

  async function handleCopy() {
    await navigator.clipboard.writeText('npm update')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 bg-primary px-4 py-2 text-primary-foreground text-sm flex-wrap"
    >
      {/* Left: icon + message */}
      <div className="flex items-center gap-2 flex-wrap">
        <Bell className="h-4 w-4 shrink-0 animate-pulse" />
        <span className="font-medium">新版本可用</span>
        <span className="opacity-80">
          v{info.currentVersion}
          <ArrowRight className="inline h-3.5 w-3.5 mx-1 opacity-60" />
          v{info.latestVersion}
        </span>
      </div>

      {/* Center: actions */}
      <div className="flex items-center gap-2">
        {/* Copy upgrade command */}
        <button
          onClick={handleCopy}
          title="复制升级命令"
          className="inline-flex items-center gap-1.5 rounded bg-primary-foreground/15 px-2.5 py-1 font-mono text-xs hover:bg-primary-foreground/25 transition-colors"
        >
          <code>npm update</code>
          {copied
            ? <Check className="h-3.5 w-3.5 text-green-300" />
            : <Copy className="h-3.5 w-3.5 opacity-70" />}
        </button>

        {/* Release notes link */}
        {info.releaseUrl && (
          <a
            href={info.releaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs hover:bg-primary-foreground/15 transition-colors opacity-90 hover:opacity-100"
          >
            查看更新日志
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Right: dismiss */}
      <button
        onClick={handleDismiss}
        title="关闭（24小时内不再显示）"
        aria-label="关闭更新提示"
        className="ml-auto rounded p-1 hover:bg-primary-foreground/20 transition-colors shrink-0"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
