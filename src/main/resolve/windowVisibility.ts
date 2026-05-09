import { mainWindow } from '..'
import { getAppConfigSync } from '../config'

/**
 * Returns true if the current config dictates that the main window should be
 * hidden from the Windows taskbar. Guarded against the "tray is off" edge
 * case — without a tray icon we must keep the taskbar entry so the user can
 * always reach the window.
 */
export function shouldSkipTaskbar(): boolean {
  const cfg = getAppConfigSync()
  return !!cfg.hideTaskbarIcon && !cfg.disableTray
}

/**
 * Pushes the current `shouldSkipTaskbar()` value onto the live BrowserWindow.
 * Safe to call repeatedly — Electron's `setSkipTaskbar` is idempotent.
 */
export function applySkipTaskbar(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return
  mainWindow.setSkipTaskbar(shouldSkipTaskbar())
}
