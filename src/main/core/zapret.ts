import { spawn, spawnSync, ChildProcess } from 'child_process'
import { existsSync, readdirSync, readFileSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import path from 'path'
import AdmZip from 'adm-zip'
import { BrowserWindow } from 'electron'
import { zapretBundleDir, zapretRuntimeDir } from '../utils/dirs'
import { getAppConfig } from '../config'

export interface StrategyDescriptor {
  file: string
  title: string
  description: string
}

let child: ChildProcess | null = null
let status: CoreStatus = { state: 'stopped' }

function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, ...args)
  }
}

function log(type: ControllerLog['type'], payload: string): void {
  broadcast('log', {
    time: Date.now(),
    type,
    source: 'zapret',
    payload
  } satisfies ControllerLog)
}

function setStatus(next: Partial<CoreStatus>): void {
  status = { ...status, ...next }
  broadcast('zapret:status', status)
}

export function getZapretStatus(): CoreStatus {
  return status
}

/**
 * Scan zapretBundleDir() for `general*.bat` and extract the first
 * one-line REM/rem comment as a description. Returns an empty array
 * if the bundle isn't present yet.
 */
export function listStrategies(): StrategyDescriptor[] {
  const dir = zapretBundleDir()
  if (!existsSync(dir)) return []
  const out: StrategyDescriptor[] = []
  for (const f of readdirSync(dir)) {
    if (!/^general.*\.bat$/i.test(f)) continue
    const full = path.join(dir, f)
    let description = ''
    try {
      const head = readFileSync(full, 'utf-8').split(/\r?\n/).slice(0, 10)
      for (const line of head) {
        const m = line.match(/^\s*(?:::|REM)\s*(.+)$/i)
        if (m) { description = m[1].trim(); break }
      }
    } catch { /* noop */ }
    out.push({
      file: f,
      title: f.replace(/\.bat$/i, ''),
      description
    })
  }
  return out.sort((a, b) => a.title.localeCompare(b.title))
}

export async function installZapretBundle(
  zipBytes: Uint8Array
): Promise<{ strategies: number; installedVersion?: string }> {
  if (!zipBytes || zipBytes.length === 0) {
    throw new Error('Пустой архив')
  }

  // Stop a running winws.exe before touching the bundle directory; locked
  // files on Windows would otherwise make rmSync fail with EBUSY.
  if (status.state === 'running' || status.state === 'starting') {
    try { await stopZapret() } catch { /* best-effort */ }
  }

  if (process.platform === 'win32') {
    for (const name of WINDIVERT_SERVICE_NAMES) {
      try { spawnSync('sc.exe', ['stop', name], { windowsHide: true, timeout: 3000 }) } catch { /* noop */ }
      try { spawnSync('sc.exe', ['delete', name], { windowsHide: true, timeout: 3000 }) } catch { /* noop */ }
    }
    detectedWinDivertSvc = null
    // Give the SCM a beat to actually release the .sys file handle.
    await new Promise((r) => setTimeout(r, 400))
  }

  let zip: AdmZip
  try {
    zip = new AdmZip(Buffer.from(zipBytes))
  } catch (e) {
    throw new Error(`Не удалось прочитать архив: ${e instanceof Error ? e.message : String(e)}`)
  }

  const entries = zip.getEntries()
  const normalize = (n: string): string => n.replace(/\\/g, '/')

  const generalEntry = entries.find(
    (e) => !e.isDirectory && /(^|\/)general\.bat$/i.test(normalize(e.entryName))
  )
  if (!generalEntry) {
    throw new Error('Архив не содержит general.bat — это не сборка Zapret')
  }

  const generalPath = normalize(generalEntry.entryName)
  const rootPrefix = generalPath.includes('/')
    ? generalPath.slice(0, generalPath.lastIndexOf('/') + 1)
    : ''

  const expectedBin = `${rootPrefix}bin/winws.exe`
  const hasBin = entries.some(
    (e) => !e.isDirectory && normalize(e.entryName).toLowerCase() === expectedBin.toLowerCase()
  )
  if (!hasBin) {
    throw new Error('Архив повреждён или неполный: не найден bin/winws.exe')
  }

  const dest = zapretRuntimeDir()
  if (existsSync(dest)) {
    rmSync(dest, { recursive: true, force: true })
  }
  mkdirSync(dest, { recursive: true })

  let written = 0
  for (const e of entries) {
    if (e.isDirectory) continue
    const name = normalize(e.entryName)
    if (rootPrefix && !name.startsWith(rootPrefix)) continue
    const rel = name.slice(rootPrefix.length)
    if (!rel) continue
    // Defensive: refuse path-traversal entries.
    if (rel.includes('..')) continue
    const out = path.join(dest, rel)
    mkdirSync(path.dirname(out), { recursive: true })
    writeFileSync(out, e.getData())
    written++
  }

  const startWrapperRe = /start\s+"zapret:\s*%~n0"\s+\/min\s+/gi
  for (const f of readdirSync(dest)) {
    if (!/^general.*\.bat$/i.test(f)) continue
    const full = path.join(dest, f)
    try {
      const before = readFileSync(full, 'utf-8')
      const after = before.replace(startWrapperRe, '')
      if (after !== before) writeFileSync(full, after, 'utf-8')
    } catch { /* best-effort patch — bad encoding etc. */ }
  }

  // Try to infer the upstream release version from the archive's top-level
  // folder, e.g. "zapret-discord-youtube-1.7.7/" → "1.7.7". Falls back to
  // undefined for archives unpacked at the zip root or with custom prefix.
  let installedVersion: string | undefined
  if (rootPrefix) {
    const m = rootPrefix.match(/zapret-discord-youtube-(.+?)\/?$/i)
    if (m) installedVersion = m[1]
  }

  const list = listStrategies()
  log(
    'info',
    `Zapret bundle installed: ${written} files, ${list.length} strategies` +
      (installedVersion ? `, version ${installedVersion}` : '')
  )
  return { strategies: list.length, installedVersion }
}

// Serialise start/stop/restart so concurrent IPC invocations cannot race.
let opLock: Promise<void> = Promise.resolve()
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = opLock.then(fn, fn)
  opLock = next.then(() => undefined, () => undefined)
  return next
}

export function withZapretLock<T>(fn: () => Promise<T>): Promise<T> {
  return withLock(fn)
}

export function startZapret(): Promise<void> {
  return withLock(() => startZapretImpl())
}
export function stopZapret(): Promise<void> {
  return withLock(() => stopZapretImpl())
}

/** Kill any orphan winws.exe instances by image name. */
export function killWinws(): Promise<void> {
  return new Promise((resolve) => {
    const p = spawn('taskkill.exe', ['/F', '/IM', 'winws.exe'], { windowsHide: true })
    p.on('exit', () => resolve())
    p.on('error', () => resolve())
  })
}

/**
 * WinDivert service candidate names. Different zapret forks register
 * the driver under slightly different identifiers; we try them in order.
 * The first match is remembered in `detectedWinDivertSvc` to save on
 * repeated `sc query` calls during status checks.
 */
const WINDIVERT_SERVICE_NAMES = ['WinDivert', 'windivert', 'WinDivert64', 'windivert64'] as const
let detectedWinDivertSvc: string | null = null

interface ScQueryResult {
  exists: boolean
  state: 'running' | 'stopped' | 'start_pending' | 'stop_pending' | 'unknown'
  binaryPath: string | null
}

/** Run `sc query` + `sc qc` for a single service name. */
function scQueryOne(name: string): ScQueryResult {
  const q = spawnSync('sc.exe', ['query', name], { windowsHide: true, timeout: 2000, encoding: 'utf8' })
  if (q.status !== 0 || !q.stdout) return { exists: false, state: 'unknown', binaryPath: null }
  const stateMatch = q.stdout.match(/STATE\s*:\s*\d+\s+(\w+)/i)
  const stateRaw = (stateMatch?.[1] ?? '').toLowerCase()
  const state: ScQueryResult['state'] =
    stateRaw === 'running' ? 'running' :
    stateRaw === 'stopped' ? 'stopped' :
    stateRaw === 'start_pending' ? 'start_pending' :
    stateRaw === 'stop_pending' ? 'stop_pending' : 'unknown'
  // `sc qc` exposes BINARY_PATH_NAME — needed so we can detect a stale
  // registration pointing at a previous install directory.
  const qc = spawnSync('sc.exe', ['qc', name], { windowsHide: true, timeout: 2000, encoding: 'utf8' })
  const pathMatch = qc.stdout?.match(/BINARY_PATH_NAME\s*:\s*(.+)$/im)
  return {
    exists: true,
    state,
    binaryPath: pathMatch?.[1].trim() ?? null
  }
}

/** Find a registered WinDivert service (if any) and cache the winning name. */
function findWinDivertService(): { name: string; info: ScQueryResult } | null {
  const ordered = detectedWinDivertSvc
    ? [detectedWinDivertSvc, ...WINDIVERT_SERVICE_NAMES.filter((n) => n !== detectedWinDivertSvc)]
    : [...WINDIVERT_SERVICE_NAMES]
  for (const name of ordered) {
    const info = scQueryOne(name)
    if (info.exists) {
      detectedWinDivertSvc = name
      return { name, info }
    }
  }
  return null
}

/**
 * Pre-flight for Zapret: make sure WinDivert is loaded and ready BEFORE we
 * spawn winws.exe. Two failure modes we actively guard against:
 *
 *  1. Service registered but pointing at a stale path (user reinstalled
 *     Slipgate to a different folder, or the resources/ layout changed).
 *     Detected by comparing `BINARY_PATH_NAME` to the current .sys location.
 *     Fix: `sc delete` so winws.exe re-registers on demand.
 *
 *  2. Service registered but stopped (previous Slipgate quit ran `sc stop`).
 *     Fix: `sc start` it ourselves — this is synchronous from our process,
 *     so we avoid the SCM-is-busy race that used to hit winws.exe at boot.
 *
 * Returns silently on success; throws with a user-facing message on hard
 * failure so the caller can surface it through the Zapret status card.
 */
export function ensureWinDivertReady(): void {
  const bundle = zapretBundleDir()
  // Possible .sys locations across forks — pick whichever one actually
  // exists on disk so `sc create` (if needed) points at a real file.
  const sysCandidates = [
    path.join(bundle, 'bin', 'WinDivert64.sys'),
    path.join(bundle, 'bin', 'WinDivert.sys'),
    path.join(bundle, 'WinDivert64.sys'),
    path.join(bundle, 'WinDivert.sys')
  ]
  const expectedSys = sysCandidates.find((p) => existsSync(p))

  const svc = findWinDivertService()
  if (!svc) {
    log('info', 'WinDivert service not registered — winws.exe will register it')
    return
  }

  // Stale-path detection: the service points at a .sys that no longer
  // exists (old install folder was wiped). Wipe the registration so
  // winws.exe can re-create it at the current path.
  if (expectedSys && svc.info.binaryPath) {
    const registered = svc.info.binaryPath.replace(/^\\\?\?\\/, '').toLowerCase()
    const expected = expectedSys.toLowerCase()
    if (!existsSync(svc.info.binaryPath.replace(/^\\\?\?\\/, '')) || registered !== expected) {
      log('warn', `WinDivert service points at stale path: ${svc.info.binaryPath}; re-registering`)
      spawnSync('sc.exe', ['stop', svc.name], { windowsHide: true, timeout: 2000 })
      spawnSync('sc.exe', ['delete', svc.name], { windowsHide: true, timeout: 2000 })
      detectedWinDivertSvc = null
      return
    }
  }

  // Service exists and path looks right. Start it synchronously so the
  // driver is live BEFORE winws.exe tries to use it.
  if (svc.info.state !== 'running') {
    log('info', `starting WinDivert service (${svc.name}, was ${svc.info.state})`)
    const r = spawnSync('sc.exe', ['start', svc.name], { windowsHide: true, timeout: 5000, encoding: 'utf8' })
    if (r.status !== 0) {
      // 1056 = service already running — benign race; anything else is a
      // hard failure worth surfacing.
      const alreadyRunning = /1056/.test(r.stdout ?? '') || /1056/.test(r.stderr ?? '')
      if (!alreadyRunning) {
        log('error', `sc start ${svc.name} failed: ${(r.stdout || r.stderr || '').trim()}`)
      }
    }
  }
}

/** Returns true if at least one winws.exe is running. */
export function isWinwsRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    const p = spawn('tasklist.exe', ['/FI', 'IMAGENAME eq winws.exe', '/NH'], { windowsHide: true })
    let out = ''
    p.stdout?.on('data', (b) => { out += b.toString() })
    p.on('exit', () => resolve(/winws\.exe/i.test(out)))
    p.on('error', () => resolve(false))
  })
}

let stopRequested = false

/**
 * Health signals derived from winws.exe's own stdout. winws is the
 * authoritative source of truth on whether WinDivert actually loaded —
 * `sc query` is unreliable (modern WinDivert versions register the service
 * under version-suffixed names, or use unique per-session names). We trust
 * winws's logs instead.
 */
let winwsHealth: 'unknown' | 'capturing' | 'failed' = 'unknown'
let winwsLastError: string | null = null

function resetWinwsHealth(): void {
  winwsHealth = 'unknown'
  winwsLastError = null
}

function ingestWinwsLine(raw: string): void {
  // "windivert initialized. capture is started." — definitive success.
  // Variants from older Flowseal builds: "WinDivert: ok", "loaded".
  if (/windivert\s+initialized|capture\s+is\s+started|windivert.*\bok\b/i.test(raw)) {
    winwsHealth = 'capturing'
    return
  }
  // Hard failures we want to surface to the user instead of leaving
  // the UI sitting on "starting" until the 7-second timeout expires.
  if (
    /windivert.*failed|windivertopen.*failed|driver.*not.*loaded|access\s+is\s+denied|requires.*admin/i.test(raw)
  ) {
    winwsHealth = 'failed'
    winwsLastError = raw.trim()
  }
}

async function startZapretImpl(): Promise<void> {
  if (child) return
  const cfg = await getAppConfig()
  const z = cfg.zapret
  if (!z || !z.activeStrategy) {
    throw new Error('no active zapret strategy configured')
  }
  const dir = zapretBundleDir()
  const batPath = path.join(dir, z.activeStrategy)
  if (!existsSync(batPath)) {
    setStatus({ state: 'error', lastError: `strategy not found: ${batPath}` })
    log('error', `strategy not found: ${batPath}`)
    throw new Error(`zapret strategy not found: ${batPath}`)
  }

  setStatus({ state: 'starting', startedAt: Date.now(), lastError: undefined })
  log('info', `launching: ${batPath}`)
  stopRequested = false

  // Only kill stale winws.exe if one actually exists — saves ~150ms at
  // autostart on a fresh boot when there's nothing to clean up. WinDivert
  // is loaded on first .bat run, so we want the spawn ASAP.
  if (await isWinwsRunning()) {
    log('info', 'stale winws.exe detected — cleaning up')
    await killWinws()
  }

  ensureWinDivertReady()
  resetWinwsHealth()

  // .bat files were patched at install time to drop `start /min`, so winws.exe
  // is now a direct child of cmd — no visible window, no taskbar icon, and
  // the whole tree can be killed via taskkill /F /T /PID.
  child = spawn('cmd.exe', ['/c', batPath], {
    cwd: dir,
    windowsHide: true,
    detached: false,
    env: {
      ...process.env,
      // Skip the .bat's network update check — it can hang for several
      // seconds on cold-boot autostart while DNS/network is initialising.
      NO_UPDATE_CHECK: '1'
    }
  })
  child.stdout?.on('data', (buf) => {
    const s = buf.toString()
    log('info', s.trimEnd())
    for (const line of s.split(/\r?\n/)) ingestWinwsLine(line)
  })
  child.stderr?.on('data', (buf) => {
    const s = buf.toString()
    log('warn', s.trimEnd())
    for (const line of s.split(/\r?\n/)) ingestWinwsLine(line)
  })
  child.on('error', (err) => {
    log('error', `child error: ${err.message}`)
    setStatus({ state: 'error', lastError: err.message })
    child = null
  })
  child.on('exit', (code, signal) => {
    log('info', `zapret exited code=${code} signal=${signal ?? 'none'}`)
    child = null
    if (stopRequested) {
      setStatus({ state: 'stopped', pid: undefined, lastError: undefined })
    } else {
      setStatus({
        state: code === 0 || signal === 'SIGTERM' ? 'stopped' : 'error',
        pid: undefined,
        lastError: code && code !== 0 ? `winws.exe exited with code ${code}` : undefined
      })
    }
  })

  const deadline = Date.now() + 7000
  while (Date.now() < deadline) {
    if (!child) return   // cmd already died — exit handler will set error

    if (winwsHealth === 'failed') {
      log('error', `winws.exe reported a fatal error: ${winwsLastError ?? '(no detail)'}`)
      await killWinws()
      setStatus({
        state: 'error',
        pid: undefined,
        lastError:
          winwsLastError ??
          'WinDivert не загрузился. Запустите Slipgate от администратора и попробуйте снова.'
      })
      return
    }

    if (winwsHealth === 'capturing' && await isWinwsRunning()) {
      setStatus({ state: 'running', pid: child.pid })
      log('info', `winws.exe is capturing (${Date.now() - (status.startedAt ?? Date.now())}ms)`)
      return
    }

    await new Promise((r) => setTimeout(r, 100))
  }

  if (await isWinwsRunning() && child) {
    setStatus({ state: 'running', pid: child.pid })
    log('warn', 'winws.exe is up but no health signal seen in 7s — assuming OK')
    return
  }

  setStatus({
    state: 'error',
    lastError: 'winws.exe не запустился за 7с — запустите приложение от администратора'
  })
  log('error', 'winws.exe did not appear — check admin rights / antivirus')
}

async function stopZapretImpl(): Promise<void> {
  stopRequested = true
  setStatus({ state: 'stopping', lastError: undefined })

  // Kill winws.exe by image name — most reliable since it's a single-instance
  // userland process holding the WinDivert handle.
  await killWinws()

  // Kill the launcher cmd tree too (in case it's still alive waiting).
  if (child?.pid) {
    await new Promise<void>((resolve) => {
      const p = spawn('taskkill.exe', ['/F', '/T', '/PID', String(child!.pid)], { windowsHide: true })
      p.on('exit', () => resolve())
      p.on('error', () => resolve())
    })
  }
  child = null
  await new Promise((r) => setTimeout(r, 150))
  setStatus({ state: 'stopped', pid: undefined, lastError: undefined })
  log('info', 'zapret stopped')
}

export async function restartZapret(): Promise<void> {
  await stopZapret()
  await new Promise((r) => setTimeout(r, 500))
  await startZapret()
}
