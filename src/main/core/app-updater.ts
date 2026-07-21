import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { spawn } from 'child_process'
import path from 'path'
import { app } from 'electron'
import { dataDir } from '../utils/dirs'
import { getAppConfig, patchAppConfig } from '../config'
import { loadUpdateCache, saveUpdateCache } from '../utils/update-cache'

const REPO = 'tenstepsbeforedecay/Slipgate'
const RELEASES_LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`
const REQUEST_HEADERS: Record<string, string> = {
  'User-Agent': 'Slipgate-Updater',
  Accept: 'application/vnd.github+json'
}

export const UPGRADE_MARKER_NAME = '.slipgate-upgrade'

export interface AppUpdateInfo {
  installed: string
  latest?: string
  hasUpdate: boolean
  tag?: string
  assetName?: string
  assetUrl?: string
  assetSize?: number
  releaseUrl?: string
  releaseNotes?: string
  publishedAt?: string
  dismissed?: boolean
}

interface GhAsset {
  name: string
  browser_download_url: string
  size: number
}
interface GhRelease {
  tag_name?: string
  name?: string
  body?: string
  html_url?: string
  published_at?: string
  prerelease?: boolean
  draft?: boolean
  assets?: GhAsset[]
}

function parseVersion(s?: string): string | null {
  if (!s) return null
  const stripped = s.replace(/^v/i, '').trim()
  if (!/^\d+(\.\d+)+/.test(stripped)) return null
  const m = stripped.match(/^\d+(\.\d+)+([.\-+][\w.\-+]+)?/)
  return m ? m[0] : null
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

let cache: { at: number; data: AppUpdateInfo } | null = null
let cacheHydrated = false
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const CACHE_NAME = 'app'

function hydrateCacheFromDisk(): void {
  if (cacheHydrated) return
  cacheHydrated = true
  const persisted = loadUpdateCache<AppUpdateInfo>(CACHE_NAME)
  if (persisted) cache = persisted
}

let refreshInflight = false
function backgroundRefresh(): void {
  if (refreshInflight) return
  refreshInflight = true
  checkAppUpdate(true)
    .catch(() => void 0)
    .finally(() => {
      refreshInflight = false
    })
}

export async function checkAppUpdate(force = false): Promise<AppUpdateInfo> {
  hydrateCacheFromDisk()
  const installed = app.getVersion()
  const cfg = await getAppConfig()
  const dismissedTag = cfg.dismissedAppUpdateTag

  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS && cache.data.tag) {
    if (Date.now() - cache.at > 30 * 60 * 1000) backgroundRefresh()
    const cachedLatest = cache.data.latest
    return {
      ...cache.data,
      installed,
      hasUpdate: !!cachedLatest && compareVersion(cachedLatest, installed) > 0,
      dismissed: dismissedTag === cache.data.tag
    }
  }

  let release: GhRelease
  try {
    const res = await fetch(RELEASES_LATEST_URL, { headers: REQUEST_HEADERS })
    if (!res.ok) throw new Error(`GitHub API ${res.status}`)
    release = (await res.json()) as GhRelease
  } catch (e) {
    throw new Error(
      `Не удалось проверить обновления Slipgate: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  if (release.draft || release.prerelease) {
    const info: AppUpdateInfo = { installed, hasUpdate: false }
    cache = { at: Date.now(), data: info }
    saveUpdateCache(CACHE_NAME, info)
    return info
  }

  const tag = release.tag_name?.trim() || undefined
  const latest = parseVersion(tag) || parseVersion(release.name) || undefined

  // Pick the per-machine NSIS installer artifact. electron-builder.yml writes
  // it as `Slipgate_x64.exe`; we accept any `Slipgate*.exe` to survive minor
  // naming changes.
  const assets = release.assets ?? []
  const installerAsset =
    assets.find((a) => /^Slipgate_x64\.exe$/i.test(a.name)) ??
    assets.find((a) => /^Slipgate.*\.exe$/i.test(a.name) && !/portable/i.test(a.name))

  const hasUpdate = !!latest && compareVersion(latest, installed) > 0

  const info: AppUpdateInfo = {
    installed,
    latest,
    hasUpdate,
    tag,
    assetName: installerAsset?.name,
    assetUrl: installerAsset?.browser_download_url,
    assetSize: installerAsset?.size,
    releaseUrl: release.html_url,
    releaseNotes: release.body?.trim() || undefined,
    publishedAt: release.published_at,
    dismissed: !!tag && dismissedTag === tag
  }

  cache = { at: Date.now(), data: info }
  saveUpdateCache(CACHE_NAME, info)
  return info
}

export async function dismissAppUpdate(tag: string): Promise<void> {
  if (!tag) return
  await patchAppConfig({ dismissedAppUpdateTag: tag })
  if (cache && cache.data.tag === tag) cache.data.dismissed = true
}

// Path of the upgrade marker, written next to Slipgate.exe so the OLD
// installer's customUnInstall macro can find it via $INSTDIR.
function upgradeMarkerPath(): string {
  // app.getAppPath() points at .../resources/app.asar in prod and at the
  // repo root in dev — neither is $INSTDIR. The exe lives one level up
  // from the resources folder, which `process.execPath` references.
  const exeDir = path.dirname(process.execPath)
  return path.join(exeDir, UPGRADE_MARKER_NAME)
}

function writeUpgradeMarker(): void {
  try {
    const p = upgradeMarkerPath()
    const dir = path.dirname(p)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(p, `slipgate-upgrade ${Date.now()}\n`, 'utf8')
  } catch (e) {
    console.warn('[app-updater] write upgrade marker failed:', e)
  }
}

/**
 * Download the installer and launch it in silent mode, then quit Slipgate
 * so NSIS can replace the on-disk files. The installer auto-relaunches the
 * new Slipgate when it's done; the user perceives the upgrade as ~5–10 s
 * of "closed and reopened".
 */
export async function installAppUpdate(
  assetUrl: string,
  expectedVersion?: string
): Promise<{ scheduled: true }> {
  if (!assetUrl) throw new Error('Пустая ссылка на установщик')
  if (process.platform !== 'win32') {
    throw new Error('Авто-обновление поддерживается только на Windows')
  }

  let buf: Buffer
  try {
    const res = await fetch(assetUrl, {
      headers: { 'User-Agent': REQUEST_HEADERS['User-Agent'] }
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const ab = await res.arrayBuffer()
    buf = Buffer.from(ab)
  } catch (e) {
    throw new Error(
      `Не удалось скачать установщик: ${e instanceof Error ? e.message : String(e)}`
    )
  }

  if (buf.length < 5 * 1024 * 1024) {
    throw new Error(`Загруженный файл слишком маленький (${buf.length} байт)`)
  }

  // Write the installer to %TEMP% so it's auto-cleaned by Windows. Using
  // a stable name plus a timestamp keeps concurrent retries (rare) from
  // colliding while leaving older copies for Disk Cleanup to remove.
  const dir = app.getPath('temp')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const installerPath = path.join(dir, `Slipgate-update-${Date.now()}.exe`)
  writeFileSync(installerPath, buf)

  // Tell the OLD installer's customUnInstall macro that this run is an
  // in-place upgrade and the user-data wipe MUST be skipped — otherwise
  // %APPDATA%\slipgate (every config the user has) would vanish.
  writeUpgradeMarker()

  if (expectedVersion) {
    try {
      await patchAppConfig({ dismissedAppUpdateTag: undefined })
    } catch {
      /* noop — user can dismiss manually if cleanup fails */
    }
  }

  // Spawn detached so the installer survives our app.quit().
  const child = spawn(installerPath, ['/S', '--updated'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true
  })
  child.on('error', (e) => console.error('[app-updater] installer spawn error:', e))
  const installerPid = child.pid
  child.unref()

  // Re-launch watcher. With `oneClick: false` (assisted installer) the
  // built-in `--updated` relaunch flag is unreliable when the installer
  // runs elevated, so we maintain our own watcher: poll the installer
  // PID, wait for Slipgate.exe to settle, then start it.
  if (installerPid) {
    try {
      const exePath = process.execPath
      const exeDir = path.dirname(exePath)
      const ts = Date.now()
      const logPath = path.join(dir, `Slipgate-relaunch-${ts}.log`)
      const watcherScript = [
        "$ErrorActionPreference = 'SilentlyContinue'",
        `$installerPid = ${installerPid}`,
        `$exe = '${exePath.replace(/'/g, "''")}'`,
        `$exeDir = '${exeDir.replace(/'/g, "''")}'`,
        `$logPath = '${logPath.replace(/'/g, "''")}'`,
        // Diagnostic log — survives even if the relaunch fails so we
        // can ask users to attach %TEMP%\Slipgate-relaunch-*.log when
        // a future bug report comes in.
        'function Log($m) {',
        "  try { Add-Content -LiteralPath $logPath -Value \"$([DateTime]::Now.ToString('HH:mm:ss.fff')) $m\" } catch {}",
        '}',
        'Log \"watcher started, installerPid=$installerPid exe=$exe\"',
        // 1) Wait for the installer to finish (up to 5 min — silent NSIS
        //    upgrades take 5–15s but slow disks / AV may stretch it).
        '$deadline = (Get-Date).AddMinutes(5)',
        'while ((Get-Date) -lt $deadline) {',
        '  if (-not (Get-Process -Id $installerPid -ErrorAction SilentlyContinue)) { Log \"installer exited\"; break }',
        '  Start-Sleep -Milliseconds 500',
        '}',
        // 2) Defender often holds the freshly-written Slipgate.exe for a
        //    few seconds for an on-write scan; 1s wasn't always enough.
        'Start-Sleep -Seconds 3',
        // 3) Wait until the new exe actually exists on disk.
        '$filePoll = (Get-Date).AddSeconds(60)',
        'while ((Get-Date) -lt $filePoll -and -not (Test-Path -LiteralPath $exe)) {',
        '  Start-Sleep -Milliseconds 500',
        '}',
        'if (-not (Test-Path -LiteralPath $exe)) { Log \"exe missing at $exe — giving up\"; exit 1 }',
        // 4) Try to launch via Start-Process first (preferred — surfaces
        //    in the user's interactive session). If that throws, fall
        //    back to the .NET Process API which goes through CreateProcess
        //    directly.
        'try {',
        '  Start-Process -FilePath $exe -WorkingDirectory $exeDir',
        '  Log \"Start-Process OK\"',
        '} catch {',
        '  Log \"Start-Process failed: $_ — trying .NET fallback\"',
        '  try {',
        '    [System.Diagnostics.Process]::Start($exe) | Out-Null',
        '    Log \"Process.Start OK\"',
        '  } catch {',
        '    Log \"all relaunch attempts failed: $_\"',
        '  }',
        '}'
      ].join('\n')
      const watcherPath = path.join(dir, `Slipgate-relaunch-${ts}.ps1`)
      // Prepend BOM so PowerShell reads the script as UTF-8 even on
      // legacy systems where the OEM code page would otherwise mangle
      // non-ASCII characters in install paths.
      writeFileSync(watcherPath, '\ufeff' + watcherScript, 'utf8')
      const watcher = spawn(
        'powershell.exe',
        [
          '-NoProfile',
          '-WindowStyle',
          'Hidden',
          '-ExecutionPolicy',
          'Bypass',
          '-File',
          watcherPath
        ],
        {
          detached: true,
          stdio: 'ignore',
          windowsHide: true
        }
      )
      watcher.on('error', (e) =>
        console.error('[app-updater] relaunch watcher spawn error:', e)
      )
      watcher.unref()
    } catch (e) {
      // Watcher is best-effort — if it fails the user just has to
      // double-click the desktop shortcut after install. Don't block
      // the upgrade itself on this.
      console.warn('[app-updater] relaunch watcher setup failed:', e)
    }
  }

  // Give NSIS a beat to acquire the install lock, then quit. If we quit
  // synchronously the installer's "is target running?" probe sometimes
  // races and shows a "close Slipgate" prompt despite /S.
  setTimeout(() => {
    try {
      app.quit()
    } catch {
      /* falling through to process.exit below */
    }
    setTimeout(() => process.exit(0), 1000)
  }, 800)

  return { scheduled: true }
}

// Convenience used by index.ts on startup if autoCheckUpdate is enabled.
export function silentBackgroundCheck(): void {
  checkAppUpdate(false).catch(() => void 0)
}

// Re-export so unrelated modules don't have to depend on the cache
// internals when they want to hint that a fresh check is appropriate
// (e.g. after the user explicitly cleared `dismissedAppUpdateTag`).
export function invalidateAppUpdateCache(): void {
  cache = null
}

void dataDir // keep import slot, used implicitly via update-cache
