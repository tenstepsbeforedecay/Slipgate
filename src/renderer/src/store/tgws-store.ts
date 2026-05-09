import { create } from 'zustand'
import { tgwsStatus } from '@renderer/utils/ipc'

interface TgwsStore {
  status: CoreStatus
  setStatus: (s: CoreStatus) => void
}

export const useTgwsStore = create<TgwsStore>((set) => ({
  status: { state: 'stopped' },
  setStatus: (status): void => set({ status })
}))

let listener: ((event: unknown, payload: CoreStatus) => void) | null = null

export const attachTgwsStore = (): (() => void) => {
  // Hard-reset to dodge HMR/StrictMode duplicate listeners.
  window.electron.ipcRenderer.removeAllListeners('tgws:status')
  listener = (_e, payload) => useTgwsStore.getState().setStatus(payload)
  window.electron.ipcRenderer.on('tgws:status', listener)
  tgwsStatus().then((s) => useTgwsStore.getState().setStatus(s)).catch(() => void 0)
  return () => {
    if (listener) {
      window.electron.ipcRenderer.removeListener('tgws:status', listener)
      listener = null
    }
  }
}
