//

import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { dataDir } from './dirs'

export interface PersistedUpdateCache<T> {
  at: number
  data: T
}

function cachePath(name: string): string {
  return path.join(dataDir(), `update-cache-${name}.json`)
}

/**
 * Synchronously load the on-disk cache for `name`. Returns `null` on any
 * failure (missing file, malformed JSON, permission glitch) — callers
 * MUST treat null as "no cache, fall through to live fetch".
 */
export function loadUpdateCache<T>(name: string): PersistedUpdateCache<T> | null {
  try {
    const p = cachePath(name)
    if (!existsSync(p)) return null
    const raw = readFileSync(p, 'utf8')
    const parsed = JSON.parse(raw) as PersistedUpdateCache<T>
    if (typeof parsed?.at !== 'number' || !parsed?.data) return null
    return parsed
  } catch {
    return null
  }
}

/**
 * Best-effort sync write of the cache. Fire-and-forget — the write is
 * cheap (sub-1 KB JSON) and any I/O failure is logged via console then
 * silently swallowed; we never want a cache write to break the user's
 * actual update check.
 */
export function saveUpdateCache<T>(name: string, data: T): void {
  try {
    const payload: PersistedUpdateCache<T> = { at: Date.now(), data }
    writeFileSync(cachePath(name), JSON.stringify(payload), 'utf8')
  } catch (e) {
    console.warn(`[update-cache:${name}] write failed:`, e)
  }
}
