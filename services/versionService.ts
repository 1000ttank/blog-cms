import { APP_VERSION, VERSION_CHECK } from '@/config/constants'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VersionCheckResult {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  releaseUrl: string
  releaseNotes: string
  checkedAt: string
}

interface CachedResult {
  result: VersionCheckResult
  cachedAt: number
}

// ─── SemVer compare ───────────────────────────────────────────────────────────

/**
 * Returns true if `latest` is strictly greater than `current`.
 * Handles versions like "1.2.3", "v1.2.3", "1.2.3-beta.1".
 * Falls back to lexicographic comparison if parsing fails.
 */
function isNewer(current: string, latest: string): boolean {
  const clean = (v: string) => v.replace(/^v/, '').split('-')[0]
  const parts = (v: string) => clean(v).split('.').map(Number)
  try {
    const [cMaj, cMin, cPat] = parts(current)
    const [lMaj, lMin, lPat] = parts(latest)
    if (lMaj !== cMaj) return lMaj > cMaj
    if (lMin !== cMin) return lMin > cMin
    return lPat > cPat
  } catch {
    return clean(latest) > clean(current)
  }
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

function readCache(): VersionCheckResult | null {
  try {
    const raw = localStorage.getItem(VERSION_CHECK.CACHE_KEY)
    if (!raw) return null
    const cached: CachedResult = JSON.parse(raw)
    if (Date.now() - cached.cachedAt > VERSION_CHECK.CACHE_TTL) return null
    return cached.result
  } catch {
    return null
  }
}

function writeCache(result: VersionCheckResult) {
  try {
    const cached: CachedResult = { result, cachedAt: Date.now() }
    localStorage.setItem(VERSION_CHECK.CACHE_KEY, JSON.stringify(cached))
  } catch {
    // localStorage might be unavailable (private browsing, quota exceeded)
  }
}

// ─── Fetchers ─────────────────────────────────────────────────────────────────

async function fetchFromGitHub(): Promise<{ version: string; url: string; notes: string } | null> {
  const res = await fetch(VERSION_CHECK.GITHUB_API, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const data = await res.json()
  const version = (data.tag_name as string).replace(/^v/, '')
  return {
    version,
    url: data.html_url as string,
    notes: (data.body as string | null) ?? '',
  }
}

async function fetchFromNpm(): Promise<{ version: string; url: string; notes: string } | null> {
  const res = await fetch(VERSION_CHECK.NPM_API, {
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return null
  const data = await res.json()
  const version = data.version as string
  return {
    version,
    url: `https://www.npmjs.com/package/${data.name}`,
    notes: '',
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const NOOP_RESULT: VersionCheckResult = {
  hasUpdate: false,
  currentVersion: APP_VERSION,
  latestVersion: APP_VERSION,
  releaseUrl: '',
  releaseNotes: '',
  checkedAt: new Date().toISOString(),
}

export async function checkForUpdate(): Promise<VersionCheckResult> {
  // 1. Return cached result if still fresh
  const cached = readCache()
  if (cached) return cached

  // 2. Try GitHub Releases first, then npm registry
  let remote: { version: string; url: string; notes: string } | null = null
  try {
    remote = await fetchFromGitHub()
  } catch {
    // fall through to npm
  }
  if (!remote) {
    try {
      remote = await fetchFromNpm()
    } catch {
      // both failed — offline or unreachable
    }
  }

  if (!remote) {
    writeCache(NOOP_RESULT)
    return NOOP_RESULT
  }

  const result: VersionCheckResult = {
    hasUpdate: isNewer(APP_VERSION, remote.version),
    currentVersion: APP_VERSION,
    latestVersion: remote.version,
    releaseUrl: remote.url,
    releaseNotes: remote.notes,
    checkedAt: new Date().toISOString(),
  }

  writeCache(result)
  return result
}

/** Force a fresh check on the next call (clears cache). */
export function invalidateVersionCache() {
  try {
    localStorage.removeItem(VERSION_CHECK.CACHE_KEY)
  } catch {}
}
