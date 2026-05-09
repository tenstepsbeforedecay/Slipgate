#!/usr/bin/env node
// -----------------------------------------------------------------------------
// Visual Studio F5 launcher for Slipgate (Electron + Vite).
//
// Visual Studio's NTVS debugger can only launch a plain Node.js script.
// Hitting F5 runs this launcher, which performs one-time bootstrap steps
// (install dependencies, download sidecar binaries) and then spawns
// `pnpm dev` (electron-vite). stdout/stderr are piped straight into the
// VS "Output" window.
//
// Environment flags (set in .env.vs or before launch):
//   SKIP_INSTALL=1  - never run pnpm install automatically
//   SKIP_PREPARE=1  - never run pnpm prepare (mihomo / geo data download)
//   FORCE_PREPARE=1 - always re-run pnpm prepare
// -----------------------------------------------------------------------------

import { spawn, spawnSync } from 'node:child_process'
import { platform } from 'node:process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { existsSync, readFileSync } from 'node:fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = resolve(__dirname, '..')

const isWindows = platform === 'win32'
const pnpmBin = isWindows ? 'pnpm.cmd' : 'pnpm'
const npmBin = isWindows ? 'npm.cmd' : 'npm'

loadDotEnv(resolve(projectRoot, '.env.vs'))

const pkgManager = hasCommand(pnpmBin) ? pnpmBin : npmBin
log(`project : ${projectRoot}`)
log(`pkgmgr  : ${pkgManager}`)

// -------- 1) dependencies -----------------------------------------------------
const nodeModules = resolve(projectRoot, 'node_modules')
if (process.env.SKIP_INSTALL !== '1' && !existsSync(nodeModules)) {
  log('node_modules is missing — installing dependencies (one-time, ~1-3 min)...')
  runSyncOrExit(pkgManager, ['install'])
} else {
  log('dependencies: OK')
}

// -------- 2) sidecar binaries (mihomo.exe, geo-data, runner.exe, ...) ---------
const sidecarExe = resolve(
  projectRoot,
  'extra',
  'sidecar',
  isWindows ? 'mihomo.exe' : 'mihomo'
)
const needPrepare =
  process.env.FORCE_PREPARE === '1' ||
  (process.env.SKIP_PREPARE !== '1' && !existsSync(sidecarExe))

if (needPrepare) {
  log('sidecar binaries missing — running "pnpm prepare" (downloads ~200 MB)...')
  log('  (set SKIP_PREPARE=1 in .env.vs after the first successful run to skip this)')
  runSyncOrExit(pkgManager, ['run', 'prepare'])
} else {
  log('sidecar : OK')
}

// -------- 3) dev server -------------------------------------------------------
log('---- starting dev server (pnpm dev) ----')

const child = spawn(pkgManager, ['run', 'dev'], {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: false,
  env: { ...process.env, FORCE_COLOR: '1', ELECTRON_ENABLE_LOGGING: '1' }
})

child.on('error', (err) => {
  console.error('[vs-launch] failed to spawn dev server:', err)
  process.exit(1)
})

child.on('exit', (code, signal) => {
  log(`dev server exited (code=${code}, signal=${signal ?? 'none'})`)
  process.exit(code ?? 0)
})

const forward = (sig) => {
  if (!child.killed) {
    try {
      child.kill(sig)
    } catch {
      /* noop */
    }
  }
}
process.on('SIGINT', () => forward('SIGINT'))
process.on('SIGTERM', () => forward('SIGTERM'))
process.on('SIGHUP', () => forward('SIGTERM'))
process.on('beforeExit', () => forward('SIGTERM'))

// ------------------------------------ utils ----------------------------------
function log(msg) {
  console.log(`[vs-launch] ${msg}`)
}

function hasCommand(cmd) {
  const r = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: false })
  return r.status === 0
}

function runSyncOrExit(cmd, args) {
  log(`$ ${cmd} ${args.join(' ')}`)
  const r = spawnSync(cmd, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, FORCE_COLOR: '1' }
  })
  if (r.status !== 0) {
    console.error(`[vs-launch] "${cmd} ${args.join(' ')}" failed with code ${r.status}`)
    process.exit(r.status ?? 1)
  }
}

function loadDotEnv(file) {
  if (!existsSync(file)) return
  try {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    for (const line of lines) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i)
      if (!m) continue
      if (process.env[m[1]] === undefined) {
        process.env[m[1]] = m[2].replace(/^"(.*)"$/, '$1')
      }
    }
    log(`loaded env overrides from ${file}`)
  } catch (err) {
    console.warn('[vs-launch] failed to read .env.vs:', err.message)
  }
}
