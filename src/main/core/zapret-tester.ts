import { spawn, ChildProcess } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import path from 'path'
import { BrowserWindow } from 'electron'
import { dataDir, zapretBundleDir } from '../utils/dirs'
import {
  ensureWinDivertReady,
  getZapretStatus,
  isWinwsRunning,
  killWinws,
  listStrategies,
  startZapret,
  withZapretLock
} from './zapret'
import { getAppConfig } from '../config'

// HTTPS hosts that DPI bypass solutions are typically tested against.
const HTTP_TARGETS: string[] = [
  'https://discord.com',
  'https://gateway.discord.gg',
  'https://cdn.discordapp.com',
  'https://updates.discord.com',
  'https://www.youtube.com',
  'https://youtu.be',
  'https://i.ytimg.com',
  'https://www.google.com',
  'https://www.gstatic.com',
  'https://www.cloudflare.com'
]

const PROBE_TIMEOUT_MS = 5000
const STRATEGY_WARMUP_MS = 4500
const STRATEGY_BOOT_TIMEOUT_MS = 6000
const PASS_THRESHOLD = 0.5
const RESULTS_FILENAME = 'zapret-test-results.json'

// Same shape as the renderer-side type in renderer/utils/ipc.ts —
// kept duplicated to avoid leaking renderer types into main code.
export interface StrategyTestResult {
  passed: boolean
  okCount: number
  totalCount: number
  score: number
  tested: true
}

export interface StrategyTestReport {
  ranAt: number
  durationMs: number
  bundleVersion?: string
  results: Record<string, StrategyTestResult>
  bestStrategy?: string
}

interface TestProgress {
  phase: 'starting' | 'testing' | 'completed' | 'error' | 'idle'
  current?: number
  total?: number
  strategy?: string
  report?: StrategyTestReport
  message?: string
}

let runningPromise: Promise<StrategyTestReport> | null = null
let cachedReport: StrategyTestReport | null = null

function resultsPath(): string {
  return path.join(dataDir(), RESULTS_FILENAME)
}

export function getStrategyTestResults(): StrategyTestReport | null {
  if (cachedReport) return cachedReport
  try {
    const p = resultsPath()
    if (!existsSync(p)) return null
    const raw = readFileSync(p, 'utf8')
    const parsed = JSON.parse(raw) as StrategyTestReport
    if (parsed && typeof parsed.ranAt === 'number' && parsed.results) {
      cachedReport = parsed
      return parsed
    }
    return null
  } catch {
    return null
  }
}

function saveReport(report: StrategyTestReport): void {
  try {
    writeFileSync(resultsPath(), JSON.stringify(report, null, 2), 'utf8')
    cachedReport = report
  } catch (e) {
    console.warn('[zapret-tester] save report failed:', e)
  }
}

function broadcast(channel: string, payload: TestProgress): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, payload)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

interface ProbeResult {
  url: string
  ok: boolean
  status?: number
  ms: number
  error?: string
}

async function probeOne(url: string): Promise<ProbeResult> {
  const t0 = Date.now()
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      method: 'HEAD',
      redirect: 'manual',
      signal: ctrl.signal,
      // Don't reuse keep-alive sockets across strategies — each strategy
      // gets a clean WinDivert filter, so an old socket might bypass it.
      headers: { Connection: 'close' }
    })
    return {
      url,
      // 2xx/3xx (incl. manual redirect) and 4xx all mean the server
      ok: res.status >= 200 && res.status < 600,
      status: res.status,
      ms: Date.now() - t0
    }
  } catch (e) {
    return {
      url,
      ok: false,
      error: e instanceof Error ? e.message : String(e),
      ms: Date.now() - t0
    }
  } finally {
    clearTimeout(timer)
  }
}

async function probeAll(): Promise<ProbeResult[]> {
  return Promise.all(HTTP_TARGETS.map(probeOne))
}

async function killChildTree(pid: number | undefined): Promise<void> {
  if (!pid) return
  await new Promise<void>((r) => {
    const p = spawn('taskkill.exe', ['/F', '/T', '/PID', String(pid)], { windowsHide: true })
    p.on('exit', () => r())
    p.on('error', () => r())
  })
}

async function spawnStrategy(batPath: string): Promise<ChildProcess> {
  const dir = zapretBundleDir()
  const c = spawn('cmd.exe', ['/c', batPath], {
    cwd: dir,
    windowsHide: true,
    detached: false,
    env: {
      ...process.env,
      // Same flag startZapretImpl uses to skip the .bat's own GitHub
      // update check on cold start.
      NO_UPDATE_CHECK: '1'
    }
  })
  // Drain stdio so the child process buffer doesn't fill up and stall
  // winws.exe — we don't care about test-time logs in main's logs UI.
  c.stdout?.on('data', () => void 0)
  c.stderr?.on('data', () => void 0)
  c.on('error', () => void 0)
  return c
}

async function testOneStrategy(batPath: string): Promise<{
  okCount: number
  totalCount: number
  score: number
  passed: boolean
}> {
  // Defensive cleanup of any winws.exe still lingering from the previous
  // iteration — taskkill returns immediately when there's nothing to kill.
  await killWinws()
  await sleep(250)

  // Make sure the WinDivert driver is loaded BEFORE winws.exe launches —
  // exact same preflight startZapretImpl uses, otherwise the first .bat
  // in the sweep tends to fail-load the driver and skew the report.
  try { ensureWinDivertReady() } catch { /* best effort */ }

  const child = await spawnStrategy(batPath)
  try {
    const deadline = Date.now() + STRATEGY_BOOT_TIMEOUT_MS
    let booted = false
    while (Date.now() < deadline) {
      if (await isWinwsRunning()) { booted = true; break }
      if (child.exitCode !== null) break
      await sleep(150)
    }
    if (!booted) {
      return { okCount: 0, totalCount: HTTP_TARGETS.length, score: 0, passed: false }
    }

    // Extra warmup so winws.exe finishes binding WinDivert filters before
    // we hit it with traffic. Empirically 4-5s is the minimum; below 3s
    // and the first strategy in the sweep gets random false negatives.
    await sleep(STRATEGY_WARMUP_MS)

    const results = await probeAll()
    const okCount = results.filter((r) => r.ok).length
    const totalCount = results.length
    const score = totalCount === 0 ? 0 : okCount / totalCount
    return { okCount, totalCount, score, passed: score >= PASS_THRESHOLD }
  } finally {
    await killWinws()
    await killChildTree(child.pid)
    await sleep(400)
  }
}

/**
 * Run the full strategy test sweep. Holds the zapret start/stop lock for
 * the entire duration so a user toggle waits for us to finish (or queues
 * behind us). Returns the persisted report.
 */
export function runStrategyTests(): Promise<StrategyTestReport> {
  if (runningPromise) return runningPromise

  runningPromise = (async () => {
    const startedAt = Date.now()

    const strategies = listStrategies()
    const total = strategies.length
    if (total === 0) {
      const empty: StrategyTestReport = {
        ranAt: startedAt,
        durationMs: 0,
        results: {}
      }
      saveReport(empty)
      broadcast('zapret:testProgress', { phase: 'completed', report: empty })
      return empty
    }

    const cfg = await getAppConfig().catch(() => null)
    const wasRunning = getZapretStatus().state === 'running'

    broadcast('zapret:testProgress', {
      phase: 'starting',
      total,
      current: 0
    })

    const results: Record<string, StrategyTestResult> = {}
    let bestStrategy: string | undefined
    let bestScore = -1
    let testError: Error | null = null

    try {
      await withZapretLock(async () => {
        // User's zapret was running — kill it now (we're inside the lock,
        // so no concurrent toggle can race). The exit handler in zapret.ts
        // will null out its global `child` once cmd.exe sees winws die.
        if (wasRunning) await killWinws()
        await sleep(500)

        for (let i = 0; i < strategies.length; i++) {
          const s = strategies[i]
          broadcast('zapret:testProgress', {
            phase: 'testing',
            current: i + 1,
            total,
            strategy: s.file
          })
          const batPath = path.join(zapretBundleDir(), s.file)
          if (!existsSync(batPath)) {
            results[s.file] = {
              tested: true,
              passed: false,
              okCount: 0,
              totalCount: HTTP_TARGETS.length,
              score: 0
            }
            continue
          }
          try {
            const r = await testOneStrategy(batPath)
            results[s.file] = { tested: true, ...r }
            if (r.passed && r.score > bestScore) {
              bestScore = r.score
              bestStrategy = s.file
            }
          } catch (e) {
            console.warn(`[zapret-tester] ${s.file} threw:`, e)
            results[s.file] = {
              tested: true,
              passed: false,
              okCount: 0,
              totalCount: HTTP_TARGETS.length,
              score: 0
            }
          }
        }
      })
    } catch (e) {
      testError = e instanceof Error ? e : new Error(String(e))
    }

    const report: StrategyTestReport = {
      ranAt: startedAt,
      durationMs: Date.now() - startedAt,
      bundleVersion: cfg?.zapret?.installedVersion,
      results,
      bestStrategy
    }
    saveReport(report)

    // Restore user's zapret if it was running before. Done OUTSIDE the
    // lock so `startZapret()` can take the lock itself in the normal
    // way — we already released ours by exiting the withZapretLock body.
    if (wasRunning) {
      try { await startZapret() } catch { /* surfaced via status */ }
    }

    if (testError) {
      broadcast('zapret:testProgress', {
        phase: 'error',
        message: testError.message,
        report
      })
    } else {
      broadcast('zapret:testProgress', { phase: 'completed', report })
    }
    return report
  })()

  runningPromise.finally(() => {
    runningPromise = null
  })

  return runningPromise
}

export function isStrategyTestRunning(): boolean {
  return runningPromise !== null
}
