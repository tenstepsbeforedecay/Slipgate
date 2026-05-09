import { create } from 'zustand'
import dayjs from 'dayjs'

const MAX_LOGS = 500

interface LogsStore {
  logs: ControllerLog[]
  clear: () => void
}

export const useLogsStore = create<LogsStore>((set) => ({
  logs: [],
  clear: (): void => set({ logs: [] })
}))

const handleIpcPayload = (log: ControllerLog): void => {
  const stamped: ControllerLog = {
    ...log,
    time: typeof log.time === 'number' ? log.time : Date.now()
  }
  const prev = useLogsStore.getState().logs
  const next =
    prev.length >= MAX_LOGS
      ? prev.slice(prev.length - MAX_LOGS + 1).concat(stamped)
      : prev.concat(stamped)
  useLogsStore.setState({ logs: next })
}

let ipcListener: ((event: unknown, payload: ControllerLog) => void) | null = null

export const attachLogsStore = (): (() => void) => {
  window.electron.ipcRenderer.removeAllListeners('log')
  ipcListener = (_event, payload): void => handleIpcPayload(payload)
  window.electron.ipcRenderer.on('log', ipcListener)
  return (): void => {
    if (ipcListener) {
      window.electron.ipcRenderer.removeListener('log', ipcListener)
      ipcListener = null
    }
  }
}

// Helper for the Logs page: human-readable HH:MM:SS.
export const formatLogTime = (t: number | string): string =>
  typeof t === 'number' ? dayjs(t).format('HH:mm:ss') : String(t)