import { create } from 'zustand'
import { zapretStatus } from '@renderer/utils/ipc'

interface ZapretStore {
  status: CoreStatus
  setStatus: (s: CoreStatus) => void
}

export const useZapretStore = create<ZapretStore>((set) => ({
  status: { state: 'stopped' },
  setStatus: (status): void => set({ status })
}))

let listener: ((event: unknown, payload: CoreStatus) => void) | null = null

export const attachZapretStore = (): (() => void) => {
  // Hard-reset to dodge HMR/StrictMode duplicate listeners.
  window.electron.ipcRenderer.removeAllListeners('zapret:status')
  listener = (_e, payload) => useZapretStore.getState().setStatus(payload)
  window.electron.ipcRenderer.on('zapret:status', listener)
  zapretStatus().then((s) => useZapretStore.getState().setStatus(s)).catch(() => void 0)
  return () => {
    if (listener) {
      window.electron.ipcRenderer.removeListener('zapret:status', listener)
      listener = null
    }
  }
}
