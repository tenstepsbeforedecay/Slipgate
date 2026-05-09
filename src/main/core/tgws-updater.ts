import { existsSync, mkdirSync, writeFileSync } from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { tgwsRuntimeDir } from '../utils/dirs'
import { getAppConfig, patchAppConfig } from '../config'
import { loadUpdateCache, saveUpdateCache } from '../utils/update-cache'
import { stopTgws, getTgwsStatus } from './tgws'

const REPO = 'tenstepsbeforedecay/slipgate-tgws-cli'
const RELEASES_LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`
const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent': 'Slipgate-Updater',
  Accept: 'application/vnd.github+json'
}

const BUNDLED_TGWS_VERSION = '1.6.6'

export interface TgwsUpdateInfo {
  installed?: string
  latest?: string
  hasUpdate: boolean
  assetName?: string
  assetUrl?: string
  assetSize?: number
  releaseUrl?: string
  publishedAt?: string
  dismissed?: boolean
}

function compareVersion(a: string, b: string): number {
  const norm = (v: string): (number | string)[] =>
    v
      .replace(/^v/i, '')
      .split(/[.\-+]/)
      .map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p))
  const aa = norm(a)
  const bb = norm(b)
  const len = Math.max(aa.length, bb.length)
  for (let i = 0; i < len; i++) {
    const av = aa[i] ?? 0
    const bv = bb[i] ?? 0
    if (typeof av === 'number' && typeof bv === 'number') {
      if (av > bv) return 1
      if (av < bv) return -1
    } else {
      const as = String(av)
      const bs = String(bv)
      if (as > bs) return 1
      if (as < bs) return -1
    }
  }
  return 0
}

interface GhAsset {
  name: string
  browser_download_url: string
  size: number
}
interface GhRelease {
  tag_name?: string
  name?: string
  html_url?: string
  published_at?: string
  assets?: GhAsset[]
}

let cache: { at: number; data: TgwsUpdateInfo } | null = null
let cacheHydrated = false
const CACHE_TTL_MS = 12 * 60 * 60 * 1000
const CACHE_NAME = 'tgws'

function hydrateCacheFromDisk(): void {
  if (cacheHydrated) return
  cacheHydrated = true
  const persisted = loadUpdateCache<TgwsUpdateInfo>(CACHE_NAME)
  if (persisted) cache = persisted
}

let refreshInflight = false
function backgroundRefresh(): void {
  if (refreshInflight) return
  refreshInflight = true
  checkTgwsUpdate(true)
    .catch(() => void 0)
    .finally(() => {
      refreshInflight = false
    })
}

// Effective installed version: explicit config value > bundled-build constant.
function effectiveInstalled(cfgInstalled?: string): string {
  return cfgInstalled && cfgInstalled.trim() ? cfgInstalled.trim() : BUNDLED_TGWS_VERSION
}

export async function checkTgwsUpdate(force = false): Promise<TgwsUpdateInfo> {
  hydrateCacheFromDisk()
  const cfg = await getAppConfig()
  const installed = effectiveInstalled(cfg.tgws?.installedVersion)
  const dismissedTag = cfg.tgws?.dismissedUpdateTag

  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS && cache.data.latest) {
    // Cache is fresh — return it. If it's older than 1h schedule a silent
    // background refresh so the user gets up-to-date info on the NEXT
    // launch without paying the GitHub latency on this one.
    if (Date.now() - cache.at > 60 * 60 * 1000) backgroundRefresh()
    return {
      ...cache.data,
      installed,
      hasUpdate: compareVersion(cache.data.latest, installed) > 0,
      dismissed: dismissedTag === cache.data.latest
    }
  }

  let release: GhRelease
  try {
    const res = await fetch(RELEASES_LATEST_URL, { headers: REQUEST_HEADERS })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    release = (await res.json()) as GhRelease
  } catch (e) {
    throw new Error(`Не удалось проверить обновления TgWsProxy: ${e instanceof Error ? e.message : String(e)}`)
  }

  const latestRaw = release.tag_name ?? release.name ?? ''
  const latest = latestRaw.replace(/^v/i, '').trim() || undefined

  // Strict 64-bit Windows binary match: the release also ships a Win-7 32-bit
  // build we don't want to install on modern systems.
  const assets = release.assets ?? []
  const winAsset =
    assets.find((a) => /^TgWsProxy_windows\.exe$/i.test(a.name)) ??
    assets.find((a) => /^TgWsProxy_windows.*\.exe$/i.test(a.name) && !/32bit/i.test(a.name))

  const hasUpdate = !!latest && compareVersion(latest, installed) > 0

  const info: TgwsUpdateInfo = {
    installed,
    latest,
    hasUpdate,
    assetName: winAsset?.name,
    assetUrl: winAsset?.browser_download_url,
    assetSize: winAsset?.size,
    releaseUrl: release.html_url,
    publishedAt: release.published_at,
    dismissed: !!latest && dismissedTag === latest
  }

  cache = { at: Date.now(), data: info }
  // Persist to disk so the NEXT Slipgate launch can render the update
  // banner instantly from cache instead of paying the 1–2 s GitHub fetch
  // for the private CLI mirror repo.
  saveUpdateCache(CACHE_NAME, info)
  return info
}

// Best-effort kill of any leftover TgWsProxy_windows.exe so we can overwrite
// the binary on Windows (where a running .exe holds an exclusive write lock).
async function killStaleTgwsBinary(): Promise<void> {
  if (process.platform !== 'win32') return
  await new Promise<void>((resolve) => {
    const p = spawn('taskkill.exe', ['/F', '/IM', 'TgWsProxy_windows.exe', '/T'], {
      windowsHide: true
    })
    p.on('exit', () => resolve())
    p.on('error', () => resolve())
  })
  // Give the OS a beat to release the file lock.
  await new Promise((r) => setTimeout(r, 300))
}

export async function installTgwsUpdate(
  assetUrl: string,
  expectedVersion?: string
): Promise<{ installedVersion?: string; sizeBytes: number }> {
  if (!assetUrl) throw new Error('Пустая ссылка на бинарник')

  // Stop the currently-running tgws first so its on-disk .exe isn't write-
  // locked. Mirrors the zapret install flow.
  const st = getTgwsStatus()
  if (st.state === 'running' || st.state === 'starting') {
    try { await stopTgws() } catch { /* best-effort */ }
  }
  // Even after our managed stop there can be a stray TgWsProxy_windows.exe
  // (manual user launch, prior crash) — wipe everything matching the image
  // name before writing.
  await killStaleTgwsBinary()

  let buf: Buffer
  try {
    const res = await fetch(assetUrl, { headers: { 'User-Agent': REQUEST_HEADERS['User-Agent'] } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ab = await res.arrayBuffer()
    buf = Buffer.from(ab)
  } catch (e) {
    throw new Error(`Не удалось скачать TgWsProxy: ${e instanceof Error ? e.message : String(e)}`)
  }

  if (buf.length < 1024 * 1024) {
    // Smallest legitimate Win build is ~14 MB; anything below 1 MB is a
    // 404 page or a redirect we failed to follow.
    throw new Error(`Загруженный файл слишком маленький (${buf.length} байт)`)
  }

  const dir = tgwsRuntimeDir()
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const dest = path.join(dir, 'TgWsProxy_windows.exe')
  writeFileSync(dest, buf)

  // Persist version + clear "Later" dismissal.
  const finalVersion = expectedVersion || undefined
  const cfg = await getAppConfig()
  const next: TgwsConfig = {
    ...(cfg.tgws as TgwsConfig),
    installedVersion: finalVersion ?? cfg.tgws?.installedVersion,
    dismissedUpdateTag: undefined
  }
  await patchAppConfig({ tgws: next })

  cache = null
  return { installedVersion: finalVersion, sizeBytes: buf.length }
}

export async function dismissTgwsUpdate(tag: string): Promise<void> {
  if (!tag) return
  const cfg = await getAppConfig()
  const next: TgwsConfig = {
    ...(cfg.tgws as TgwsConfig),
    dismissedUpdateTag: tag
  }
  await patchAppConfig({ tgws: next })
  if (cache) cache.data.dismissed = cache.data.latest === tag
}
