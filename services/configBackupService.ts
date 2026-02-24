/**
 * Stores snapshots of config files in localStorage.
 * A snapshot is saved every time the user saves a config.
 * The "last good" snapshot is updated when a build succeeds.
 */

export interface ConfigSnapshot {
  hexoYaml: string
  hexoSha: string
  themeFile: string
  themeYaml: string
  themeSha: string
  savedAt: string
  label: string
}

const SNAPSHOT_KEY = 'cms-config-snapshot'
const LAST_GOOD_KEY = 'cms-config-last-good'

export function saveConfigSnapshot(snapshot: ConfigSnapshot) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot))
  } catch {}
}

export function getConfigSnapshot(): ConfigSnapshot | null {
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

/** Called when a build succeeds — marks the current snapshot as "last good" */
export function markSnapshotAsGood() {
  try {
    const snap = getConfigSnapshot()
    if (snap) {
      localStorage.setItem(LAST_GOOD_KEY, JSON.stringify({ ...snap, label: '最后一次成功构建' }))
    }
  } catch {}
}

export function getLastGoodSnapshot(): ConfigSnapshot | null {
  try {
    const raw = localStorage.getItem(LAST_GOOD_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function clearSnapshots() {
  localStorage.removeItem(SNAPSHOT_KEY)
  localStorage.removeItem(LAST_GOOD_KEY)
}
