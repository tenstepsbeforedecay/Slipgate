import { ipcMain, app, shell, clipboard, BrowserWindow } from 'electron'
import { getAppConfig, patchAppConfig } from '../config'
import { applyTheme, setNativeTheme } from '../resolve/theme'
import {
  getTgwsStatus,
  startTgws,
  stopTgws,
  restartTgws,
  getTgwsLink
} from '../core/tgws'
import {
  getZapretStatus,
  startZapret,
  stopZapret,
  restartZapret,
  listStrategies,
  installZapretBundle
} from '../core/zapret'
import {
  checkZapretUpdate,
  installZapretUpdate,
  dismissZapretUpdate
} from '../core/zapret-updater'
import {
  runStrategyTests,
  getStrategyTestResults,
  isStrategyTestRunning
} from '../core/zapret-tester'
import {
  getCuratedIpSets,
  getIpListSnapshot,
  applyIpListPatch,
  clearIpList,
  restoreIpListBackup,
  type IpListPatch
} from '../core/zapret-iplist'
import {
  checkTgwsUpdate,
  installTgwsUpdate,
  dismissTgwsUpdate
} from '../core/tgws-updater'
import {
  checkAppUpdate,
  installAppUpdate,
  dismissAppUpdate
} from '../core/app-updater'
import { execFile } from 'node:child_process'
import { writeFileSync, unlinkSync } from 'node:fs'
import path from 'node:path'

//
function logTgError(stage: string, err: Error | null, stderr?: string): void {
  if (!err && !stderr) return
  const msg = err?.message ?? stderr ?? 'unknown'
  console.error(`[openTelegramLink] ${stage}: ${msg.trim()}`)
}

function tryFallbackOpen(url: string): void {
  shell.openExternal(url).catch((e) => logTgError('shell.openExternal', e))
}

function openTgLinkViaScheduler(url: string, fellBack: { v: boolean }): boolean {
  try {
    const taskName = `Slipgate_OpenTG_${Date.now()}_${Math.floor(Math.random() * 10000)}`
    const vbsPath = path.join(app.getPath('temp'), `${taskName}.vbs`)
    const vbsSafeUrl = url.replace(/"/g, '""')
    const vbsContent =
      'On Error Resume Next\r\n' +
      `CreateObject("Shell.Application").ShellExecute "${vbsSafeUrl}"\r\n`
    writeFileSync(vbsPath, vbsContent, 'utf8')

    // Wrap the wscript invocation in a single /TR string. //B = batch
    // mode (suppress all script-engine UI), //Nologo = suppress the
    // WSH banner. Path is double-quoted to survive spaces in %TEMP%.
    const trCommand = `wscript.exe //B //Nologo "${vbsPath}"`

    const cleanup = (): void => {
      execFile(
        'schtasks.exe',
        ['/Delete', '/F', '/TN', taskName],
        { windowsHide: true },
        () => {
          try { unlinkSync(vbsPath) } catch { /* noop */ }
        }
      )
    }

    // /SC ONCE wants a future-ish time. We use the far future so the
    // task never auto-fires; we always trigger via /Run.
    execFile(
      'schtasks.exe',
      [
        '/Create', '/F',
        '/TN', taskName,
        '/TR', trCommand,
        '/SC', 'ONCE',
        '/ST', '23:59',
        '/SD', '01/01/2099',
        '/IT',
        '/RL', 'LIMITED'
      ],
      { windowsHide: true },
      (createErr, _stdout, createStderr) => {
        if (createErr) {
          logTgError('schtasks /Create', createErr, createStderr)
          if (!fellBack.v) {
            fellBack.v = true
            tryFallbackOpen(url)
          }
          try { unlinkSync(vbsPath) } catch { /* noop */ }
          return
        }
        execFile(
          'schtasks.exe',
          ['/Run', '/TN', taskName],
          { windowsHide: true },
          (runErr, _so, runStderr) => {
            if (runErr) {
              logTgError('schtasks /Run', runErr, runStderr)
              if (!fellBack.v) {
                fellBack.v = true
                tryFallbackOpen(url)
              }
            }
            // Delete task + vbs 5 s later (after TG had time to launch).
            setTimeout(cleanup, 5000)
          }
        )
      }
    )
    return true
  } catch (e) {
    logTgError('openTgLinkViaScheduler sync', e as Error)
    return false
  }
}

const TG_INFLIGHT_LOCK_MS = 600
let tgInflightUntil = 0

function openTelegramLink(url: string): Promise<void> {
  const now = Date.now()
  if (now < tgInflightUntil) return Promise.resolve()
  tgInflightUntil = now + TG_INFLIGHT_LOCK_MS
  if (process.platform === 'win32') {
    const fellBack = { v: false }
    if (openTgLinkViaScheduler(url, fellBack)) return Promise.resolve()
    if (!fellBack.v) tryFallbackOpen(url)
    return Promise.resolve()
  }
  tryFallbackOpen(url)
  return Promise.resolve()
}

/**
 * Thin wrapper so any unhandled error in an IPC handler is serialised
 * back to the caller as `{ ok: false, message }` instead of crashing.
 */
function h<T>(fn: (...args: unknown[]) => Promise<T> | T) {
  return async (_event: Electron.IpcMainInvokeEvent, ...args: unknown[]) => {
    try {
      const value = await fn(...args)
      return { ok: true, value }
    } catch (e: unknown) {
      return { ok: false, message: e instanceof Error ? e.message : String(e) }
    }
  }
}

export function registerIpcMainHandlers(): void {
  // ---- App config ---------------------------------------------------------
  ipcMain.handle('app:getConfig', h(() => getAppConfig()))
  ipcMain.handle('app:patchConfig', h((patch) => patchAppConfig(patch as Partial<AppConfig>)))
  ipcMain.handle('app:version', h(() => app.getVersion()))

  // ---- Theme --------------------------------------------------------------
  ipcMain.handle('theme:setNative', h((theme) => setNativeTheme(theme as AppTheme)))
  ipcMain.handle('theme:apply', h((file) => applyTheme(file as string)))

  // ---- Utility ------------------------------------------------------------
  ipcMain.handle('shell:openTelegramLink', h((url) => openTelegramLink(url as string)))
  ipcMain.handle('clipboard:writeText', h((text) => { clipboard.writeText(text as string) }))

  // ---- TG WS Proxy --------------------------------------------------------
  ipcMain.handle('tgws:status', h(() => getTgwsStatus()))
  ipcMain.handle('tgws:start', h(() => startTgws()))
  ipcMain.handle('tgws:stop', h(() => stopTgws()))
  ipcMain.handle('tgws:restart', h(() => restartTgws()))
  ipcMain.handle('tgws:getLink', h(() => getTgwsLink()))
  ipcMain.handle('tgws:checkUpdate', h((force) => checkTgwsUpdate(Boolean(force))))
  ipcMain.handle('tgws:installUpdate', h((url, expectedVersion) =>
    installTgwsUpdate(url as string, expectedVersion as string | undefined)
  ))
  ipcMain.handle('tgws:dismissUpdate', h((tag) => dismissTgwsUpdate(tag as string)))

  // ---- Zapret -------------------------------------------------------------
  ipcMain.handle('zapret:status', h(() => getZapretStatus()))
  ipcMain.handle('zapret:listStrategies', h(() => listStrategies()))
  ipcMain.handle('zapret:start', h(() => startZapret()))
  ipcMain.handle('zapret:stop', h(() => stopZapret()))
  ipcMain.handle('zapret:restart', h(() => restartZapret()))
  ipcMain.handle('zapret:installBundle', h((bytes) =>
    installZapretBundle(bytes as Uint8Array)
  ))
  ipcMain.handle('zapret:checkUpdate', h((force) => checkZapretUpdate(Boolean(force))))
  ipcMain.handle('zapret:installUpdate', h((url, expectedVersion) =>
    installZapretUpdate(url as string, expectedVersion as string | undefined)
  ))
  ipcMain.handle('zapret:dismissUpdate', h((tag) => dismissZapretUpdate(tag as string)))

  // ---- Zapret strategy tester --------------------------------------------
  ipcMain.handle('zapret:runStrategyTest', h(() => runStrategyTests()))
  ipcMain.handle('zapret:getStrategyTestResults', h(() => getStrategyTestResults()))
  ipcMain.handle('zapret:isStrategyTestRunning', h(() => isStrategyTestRunning()))

  // ---- Zapret IP list (ipset-all.txt) ------------------------------------
  ipcMain.handle('zapret:getCuratedIpSets', h(() => getCuratedIpSets()))
  ipcMain.handle('zapret:getIpList', h(() => getIpListSnapshot()))
  ipcMain.handle('zapret:applyIpListPatch', h((patch) =>
    applyIpListPatch((patch ?? {}) as IpListPatch)
  ))
  ipcMain.handle('zapret:clearIpList', h(() => clearIpList()))
  ipcMain.handle('zapret:restoreIpListBackup', h(() => restoreIpListBackup()))

  // ---- Slipgate self-update ----------------------------------------------
  ipcMain.handle('app:checkUpdate', h((force) => checkAppUpdate(Boolean(force))))
  ipcMain.handle('app:installUpdate', h((url, expectedVersion) =>
    installAppUpdate(url as string, expectedVersion as string | undefined)
  ))
  ipcMain.handle('app:dismissUpdate', h((tag) => dismissAppUpdate(tag as string)))

  // ---- Quit / restart -----------------------------------------------------
  ipcMain.handle('app:quit', h(() => app.quit()))
  ipcMain.handle('app:relaunch', h(() => {
    app.relaunch()
    app.exit(0)
  }))

  // ---- Window controls (called from window-controls.tsx & i18n.ts) -------
  // These were noisy "No handler registered" errors before; persisting the
  // language change is a no-op for now (renderer keeps its own localStorage).
  ipcMain.handle('setLanguage', async (_e, _lang: string) => undefined)
  ipcMain.handle('windowIsMaximized', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    return win?.isMaximized() ?? false
  })
  ipcMain.handle('windowMinimize', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.minimize()
  })
  ipcMain.handle('windowMaximize', (e) => {
    const win = BrowserWindow.fromWebContents(e.sender)
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('windowClose', (e) => {
    BrowserWindow.fromWebContents(e.sender)?.close()
  })
}

/** Legacy export kept so old call-sites compile during transition. */
export function setupIpc(): void {
  registerIpcMainHandlers()
}
