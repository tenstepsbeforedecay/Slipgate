import { app, Menu, nativeImage, Tray } from 'electron'
import { resolve, join } from 'path'
import { existsSync } from 'fs'
import { mainWindow, triggerMainWindow, showMainWindow } from '..'
import { startTgws, stopTgws, getTgwsStatus } from '../core/tgws'
import { startZapret, stopZapret, getZapretStatus } from '../core/zapret'
import { appLog } from '../utils/app-logger'

let tray: Tray | null = null
let rebuildInterval: NodeJS.Timeout | null = null
let rebuildTrayMenu: (() => Promise<void>) | null = null
let currentIconOn: boolean | null = null

/**
 * Load a tray-ready nativeImage for the given on/off state. Tries .ico first
 * (preferred on Windows because the system can pick the right size frame),
 * falls back to .png if the .ico is missing or rejected by the OS.
 */
function loadTrayImage(on: boolean): Electron.NativeImage {
  const ico = iconPath(on)
  let image = nativeImage.createFromPath(ico)
  if (image.isEmpty()) {
    appLog('warn', `Tray image empty for ${ico}, using PNG fallback`)
    image = nativeImage.createFromPath(ico.replace(/\.ico$/i, '.png'))
  }
  return image.isEmpty() ? nativeImage.createEmpty() : image
}

/**
 * Trigger an immediate tray-menu rebuild from outside this module. Used by
 * `mainWindow.on('show'/'hide'/'minimize'/'restore')` in src/main/index.ts
 * so the «Показать/Скрыть окно» label always reflects reality without
 * waiting for the 2-second background rebuildInterval. No-op if tray is
 * disabled / destroyed.
 */
export async function refreshTray(): Promise<void> {
  if (rebuildTrayMenu) await rebuildTrayMenu()
}

/**
 * Resolve the tray icon file path. We try multiple known locations because
 * `app.getAppPath()` and `process.resourcesPath` mean different things in
 * dev vs packaged builds:
 *   - dev:        app.getAppPath() = <project root>; resources at /resources
 *   - packaged:   app.getAppPath() = <install>/resources/app.asar (no FS);
 *                 process.resourcesPath = <install>/resources (icons live here)
 * If none of the candidates exist we log a warning so the silent
 * "tray icon doesn't appear" failure mode is at least diagnosable.
 */
function iconPath(on: boolean): string {
  // Tray icon mapping:
  //   on  = processes are running     -> resources/icon_on.{ico,png}
  //   off = no processes / idle state -> resources/icon_off.{ico,png}
  // Note: previously the ON state reused `icon.ico` (the app icon), which
  // made it impossible to tell from the tray whether anything was actually
  // running. We now ship a dedicated `icon_on.ico` for that.
  const ico = on ? 'icon_on.ico' : 'icon_off.ico'
  const png = on ? 'icon_on.png' : 'icon_off.png'
  const candidates: string[] = []
  if (process.resourcesPath) {
    candidates.push(join(process.resourcesPath, ico))
    candidates.push(join(process.resourcesPath, png))
  }
  candidates.push(resolve(app.getAppPath(), 'resources', ico))
  candidates.push(resolve(app.getAppPath(), 'resources', png))
  // Last-ditch fallback: project root from compiled main location
  // (out/main/<file>.js -> ../../resources/icon.ico).
  candidates.push(resolve(__dirname, '../../resources', ico))
  candidates.push(resolve(__dirname, '../../resources', png))

  for (const c of candidates) {
    if (existsSync(c)) {
      appLog('info', `Tray icon resolved: ${c}`)
      return c
    }
  }
  appLog('warn', `Tray icon NOT FOUND. Tried:\n  ${candidates.join('\n  ')}`)
  return candidates[0] ?? ''
}

export async function createTray(): Promise<void> {
  // Idempotent: a previous tray (and its rebuild interval) must be torn
  // down first, otherwise toggling the setting twice leaks Tray instances
  // and orphaned setInterval timers behind it.
  if (tray) destroyTray()

  // Start in OFF state; the first rebuild() below will swap to ON if a
  // process is already running (e.g. autostart kicked in before the tray
  // came up).
  try {
    tray = new Tray(loadTrayImage(false))
    currentIconOn = false
  } catch (e) {
    appLog('error', `Tray creation failed: ${e}`)
    return
  }
  tray.setToolTip('Slipgate')

  const rebuild = async (): Promise<void> => {
    if (!tray) return
    const tgws = getTgwsStatus()
    const zapret = getZapretStatus()

    // Swap the tray icon only when the on/off state actually flips —
    // setImage() is cheap but redrawing the system tray every 2 s for
    // nothing causes a visible flicker on some Windows builds.
    const anyRunning = tgws.state === 'running' || zapret.state === 'running'
    if (anyRunning !== currentIconOn) {
      tray.setImage(loadTrayImage(anyRunning))
      currentIconOn = anyRunning
    }

    const menu = Menu.buildFromTemplate([
      {
        label: mainWindow?.isVisible() ? 'Скрыть окно' : 'Показать окно',
        click: () => triggerMainWindow()
      },
      { type: 'separator' },
      {
        label: `Telegram: ${tgws.state}`,
        submenu: [
          { label: 'Запустить', enabled: tgws.state !== 'running' && tgws.state !== 'starting', click: () => { startTgws().catch(() => void 0) } },
          { label: 'Остановить',  enabled: tgws.state === 'running', click: () => { stopTgws().catch(() => void 0) } }
        ]
      },
      {
        label: `Zapret: ${zapret.state}`,
        submenu: [
          { label: 'Запустить', enabled: zapret.state !== 'running' && zapret.state !== 'starting', click: () => { startZapret().catch(() => void 0) } },
          { label: 'Остановить',  enabled: zapret.state === 'running', click: () => { stopZapret().catch(() => void 0) } }
        ]
      },
      { type: 'separator' },
      { label: 'Выйти из Slipgate', click: () => { app.quit() } }
    ])
    tray.setContextMenu(menu)
  }

  tray.on('click', () => showMainWindow())
  tray.on('double-click', () => triggerMainWindow())

  // Expose rebuild() so external triggers (window show/hide/minimize) can
  // refresh the «Показать/Скрыть окно» label instantly via refreshTray().
  rebuildTrayMenu = rebuild
  await rebuild()
  // Track the interval handle so destroyTray() can clear it. Without this
  // every off->on toggle in Settings stacks another timer that keeps
  // rebuilding a no-longer-visible tray menu (memory + CPU leak).
  rebuildInterval = setInterval(rebuild, 2000)
}

export function destroyTray(): void {
  if (rebuildInterval) {
    clearInterval(rebuildInterval)
    rebuildInterval = null
  }
  rebuildTrayMenu = null
  currentIconOn = null
  tray?.destroy()
  tray = null
}

/** Used by the close handler to verify the tray is actually alive before
 * hiding the window into it — otherwise the user would be stranded with a
 * hidden window and no way to restore it. */
export function isTrayActive(): boolean {
  return tray !== null && !tray.isDestroyed()
}