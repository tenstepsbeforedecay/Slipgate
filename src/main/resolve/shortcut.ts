import { globalShortcut } from 'electron'
import { getAppConfig } from '../config'
import { triggerMainWindow } from '..'
import { startTgws, stopTgws, getTgwsStatus } from '../core/tgws'
import { startZapret, stopZapret, getZapretStatus } from '../core/zapret'

export async function initShortcut(): Promise<void> {
  const cfg = await getAppConfig()
  globalShortcut.unregisterAll()

  if (cfg.showWindowShortcut) {
    try { globalShortcut.register(cfg.showWindowShortcut, () => triggerMainWindow()) } catch { /* noop */ }
  }
  if (cfg.tgwsToggleShortcut) {
    try {
      globalShortcut.register(cfg.tgwsToggleShortcut, () => {
        const s = getTgwsStatus().state
        if (s === 'running') stopTgws().catch(() => void 0)
        else startTgws().catch(() => void 0)
      })
    } catch { /* noop */ }
  }
  if (cfg.zapretToggleShortcut) {
    try {
      globalShortcut.register(cfg.zapretToggleShortcut, () => {
        const s = getZapretStatus().state
        if (s === 'running') stopZapret().catch(() => void 0)
        else startZapret().catch(() => void 0)
      })
    } catch { /* noop */ }
  }
}