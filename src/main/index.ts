import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, dialog, Menu, shell } from 'electron'
import windowStateKeeper from 'electron-window-state'
import { join } from 'path'
import icon from '../../resources/icon.png?asset'
import { registerIpcMainHandlers } from './utils/ipc'
import { init } from './utils/init'
import { getAppConfig, getAppConfigSync } from './config'
import { createTray, isTrayActive, refreshTray } from './resolve/tray'
import { createApplicationMenu } from './resolve/menu'
import { initShortcut } from './resolve/shortcut'
import { startTgws, stopTgws } from './core/tgws'
import { startZapret, stopZapret } from './core/zapret'
import { appLog } from './utils/app-logger'
import { enableAutoRun, disableAutoRun } from './sys/autoRun'
import { isRunningAsAdmin } from './utils/elevation'

// Lock the userData / cache / log folder names.
app.setName(is.dev ? 'slipgate-dev' : 'slipgate')

export let mainWindow: BrowserWindow | null = null

/** Legacy re-export, kept minimal. */
export function showError(title: string, message: string): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('showError', title, message)
  } else {
    dialog.showErrorBox(title, message)
  }
}

/* Single-instance lock */
if (!app.requestSingleInstanceLock()) {
  app.quit()
}

// Surface unexpected errors to the Logs page instead of silent console spam.
process.on('uncaughtException', (err) => {
  appLog('error', `uncaughtException: ${err.stack || err.message}`)
})
process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? (reason.stack || reason.message) : String(reason)
  appLog('error', `unhandledRejection: ${msg}`)
})

app.on('second-instance', () => showMainWindow())

const syncConfig = getAppConfigSync()
if (syncConfig.disableGPU) app.disableHardwareAcceleration()

const initPromise = init()

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.slipgate.app')
  appLog('info', `Slipgate запущен (v${app.getVersion()}, ${process.platform}-${process.arch})`)

  if (process.platform === 'win32' && !is.dev && !(await isRunningAsAdmin())) {
    dialog.showErrorBox(
      'Slipgate — нужны права администратора',
      'Slipgate должен быть запущен с правами администратора, иначе Zapret\n' +
        '(WinDivert) и автозапуск через Task Scheduler не будут работать.\n\n' +
        'Закройте приложение и запустите его через «Запустить от имени администратора».'
    )
    app.quit()
    return
  }

  try {
    await initPromise
    appLog('info', 'Инициализация завершена')
  } catch (e) {
    appLog('error', `Ошибка инициализации: ${e}`)
    dialog.showErrorBox('Slipgate init failed', `${e}`)
    app.quit()
    return
  }

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcMainHandlers()
  const appConfig = await getAppConfig()

  if (appConfig.tgws?.autoStart) {
    appLog('info', 'Автозапуск Telegram WS — старт')
    startTgws().catch((e) => {
      appLog('error', `Автозапуск Telegram WS упал: ${e}`)
      showError('TG WS start failed', `${e}`)
    })
  }
  if (appConfig.zapret?.autoStart) {
    appLog('info', 'Автозапуск Zapret — старт')
    startZapret().catch((e) => {
      appLog('error', `Автозапуск Zapret упал: ${e}`)
      showError('Zapret start failed', `${e}`)
    })
  }

  // Synchronise Windows auto-launch with the saved config — keeps the toggle
  // in settings honest if the user manually edited startup outside the app.
  try {
    if (appConfig.autoLaunch) await enableAutoRun()
    else await disableAutoRun()
  } catch (e) {
    appLog('warn', `autoLaunch sync failed: ${e}`)
  }

  await createWindow(appConfig)

  const uiTasks: Promise<unknown>[] = [initShortcut()]
  if (!appConfig.disableTray) uiTasks.push(createTray())
  await Promise.all(uiTasks)

  app.on('activate', () => {
    showMainWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

let cleanupRan = false
let isQuitting = false

/**
 * Synchronous, fire-and-forget cleanup that runs when the app quits. Kills
 * every child process Slipgate ever spawned and unloads the WinDivert kernel
 * driver from memory so its `.sys` file is no longer locked on disk.
 *
 * IMPORTANT: we deliberately do NOT `sc delete` the WinDivert service. After
 * a reboot the LogonTrigger task fires Slipgate during winlogon (before most
 * system services finish initialising); at that moment the SCM is busy and
 * `CreateService` from a freshly-spawned winws.exe races against it. The
 * race manifests as `WinDivertOpen()` failing silently — winws.exe stays
 * alive in the process list (so the UI shows "running") but no packets are
 * intercepted, so Discord/YouTube/etc. don't work even though Slipgate
 * claims everything is fine. Keeping the service registered across quits
 * means winws.exe only has to call `StartService` on next boot, which is
 * synchronous and immune to the SCM race.
 *
 * `sc stop` alone is enough to make the install folder deletable: stopping
 * the service unloads the driver, releasing the kernel handle on the .sys
 * file. The leftover registry entry is just a few bytes pointing at the .sys
 * path; if the user moves Slipgate to a new folder, `verifyWinDivertService`
 * (called on every Zapret start) detects the path mismatch and forces
 * re-registration.
 *
 * Belt-and-braces: safe to call repeatedly, every step swallows its own
 * errors (services that aren't loaded, processes that no longer exist, etc.).
 */
function syncKillChildren(): void {
  if (process.platform !== 'win32') return
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { spawnSync } = require('child_process') as typeof import('child_process')
    const opts = { windowsHide: true, timeout: 2000 } as const

    // 1) Kill known Slipgate child binaries by image name. /T tears down the
    //    whole process tree, so cfproxy worker pools spawned by TgWsProxy
    //    and winws.exe sub-children are caught too.
    spawnSync('taskkill.exe', ['/F', '/IM', 'TgWsProxy_windows.exe', '/T'], opts)
    spawnSync('taskkill.exe', ['/F', '/IM', 'winws.exe', '/T'], opts)

    // 2) Stop the WinDivert kernel driver — unloads it from memory so the
    //    `.sys` file is no longer locked on disk. We DO NOT delete the
    //    service registration (see function-level comment for the rationale).
    for (const svc of ['WinDivert', 'windivert', 'WinDivert64', 'windivert64']) {
      spawnSync('sc.exe', ['stop', svc], opts)
    }
  } catch { /* noop */ }
}

async function cleanupServices(): Promise<void> {
  if (cleanupRan) return
  cleanupRan = true
  await Promise.race([
    Promise.all([stopTgws(), stopZapret()]).catch(() => void 0),
    new Promise<void>((r) => setTimeout(r, 3000))
  ])
  syncKillChildren()
}

app.on('before-quit', async (e) => {
  // Tell `mainWindow.on('close')` that this is a real quit — it must NOT
  // intercept the close to hide-to-tray.
  isQuitting = true
  if (cleanupRan) return
  appLog('info', 'Выход из приложения, остановка всех сервисов…')
  // Hold the quit until child processes are actually dead, so Telegram
  // immediately loses its proxy.
  e.preventDefault()
  await cleanupServices()
  app.exit(0)
})

// Last-resort synchronous kill: if Electron is force-killed (cmd window
// closed, Task Manager, system shutdown), `before-quit` may not run. Issue
// a blocking `taskkill /F /IM ... /T` so the proxy never outlives Slipgate.
process.on('exit', () => syncKillChildren())
process.on('SIGINT', () => { syncKillChildren(); process.exit(0) })
process.on('SIGTERM', () => { syncKillChildren(); process.exit(0) })

export async function createWindow(appConfig?: AppConfig): Promise<void> {
  const config = appConfig ?? (await getAppConfig())
  const { silentStart = false } = config

  const mainWindowState = windowStateKeeper({
    defaultWidth: 1000,
    defaultHeight: 720,
    file: 'window-state.json'
  })

  if (process.platform === 'darwin') {
    await createApplicationMenu()
  } else {
    Menu.setApplicationMenu(null)
  }

  // Compute initial skipTaskbar based on the user's hideTaskbarIcon +
  // tray-enabled combination. Hiding from the taskbar without a tray icon
  // is never allowed — the recovery path would vanish.
  const initialSkipTaskbar = !!config.hideTaskbarIcon && !config.disableTray

  mainWindow = new BrowserWindow({
    minWidth: 860,
    minHeight: 600,
    width: mainWindowState.width,
    height: mainWindowState.height,
    x: mainWindowState.x,
    y: mainWindowState.y,
    show: false,
    // Slipgate ships with a custom in-app titlebar (see WindowControls), so
    // the native OS frame is always disabled — there is no user-facing
    // option to re-enable it.
    frame: false,
    fullscreenable: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    skipTaskbar: initialSkipTaskbar,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      spellcheck: false,
      sandbox: false
    }
  })
  mainWindowState.manage(mainWindow)

  mainWindow.on('ready-to-show', () => {
    // Only honour silentStart when the tray icon is enabled — otherwise the
    // window would be invisible AND there'd be no tray icon to bring it back,
    // which is exactly the "app launches into nothing" bug we hit before.
    if (silentStart && !config.disableTray) return
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.on('close', (e) => {
    if (isQuitting) return
    const cfg = getAppConfigSync()
    const trayOn = !cfg.disableTray
    const hideTaskbarOn = !!cfg.hideTaskbarIcon

    if (trayOn && isTrayActive()) {
      e.preventDefault()
      if (hideTaskbarOn) {
        appLog('info', 'Окно скрыто в трей (таскбар отключён)')
        mainWindow?.setSkipTaskbar(true)
        mainWindow?.hide()
      } else {
        appLog('info', 'Окно свёрнуто (доступно в панели задач и в трее)')
        mainWindow?.setSkipTaskbar(false)
        mainWindow?.minimize()
      }
      return
    }

    // Tray off (or tray creation failed) → real close → before-quit cleanup.
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  const onWindowVisibilityChange = (kind: string): void => {
    refreshTray().catch(() => void 0)
    try {
      mainWindow?.webContents.send('window:visibility', kind)
    } catch {
      /* noop */
    }
  }
  mainWindow.on('show', () => onWindowVisibilityChange('show'))
  mainWindow.on('hide', () => onWindowVisibilityChange('hide'))
  mainWindow.on('minimize', () => onWindowVisibilityChange('minimize'))
  mainWindow.on('restore', () => onWindowVisibilityChange('restore'))
  mainWindow.on('focus', () => onWindowVisibilityChange('focus'))
  mainWindow.on('blur', () => onWindowVisibilityChange('blur'))

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

export async function showMainWindow(): Promise<void> {
  if (!mainWindow) await createWindow()
  const w = mainWindow as BrowserWindow | null
  if (!w) return
  if (w.isMinimized()) w.restore()
  // Restore skipTaskbar according to the CURRENT hideTaskbarIcon setting.
  const cfg = getAppConfigSync()
  const shouldSkip = !!cfg.hideTaskbarIcon && !cfg.disableTray
  w.setSkipTaskbar(shouldSkip)
  w.show()
  w.focus()
}

export function closeMainWindow(): void {
  mainWindow?.close()
}

export async function triggerMainWindow(): Promise<void> {
  if (mainWindow && mainWindow.isVisible()) {
    mainWindow.hide()
  } else {
    await showMainWindow()
  }
}