import { create } from 'zustand'
import { toast } from 'sonner'
import {
  zapretGetStrategyTestResults,
  zapretIsStrategyTestRunning,
  type StrategyTestProgress,
  type StrategyTestReport
} from '@renderer/utils/ipc'
import { POWER_ON_BANNER_STYLE } from '@renderer/lib/utils'

interface ZapretTestStore {
  progress: StrategyTestProgress | null
  report: StrategyTestReport | null
  isRunning: boolean
  set: (patch: Partial<ZapretTestStore>) => void
}

export const useZapretTestStore = create<ZapretTestStore>((set) => ({
  progress: null,
  report: null,
  isRunning: false,
  set: (patch) => set(patch)
}))

let listener: ((event: unknown, payload: StrategyTestProgress) => void) | null = null
let lastToastedRanAt: number | null = null

export const attachZapretTestStore = (): (() => void) => {
  // Hard reset duplicate listeners under HMR / StrictMode.
  window.electron.ipcRenderer.removeAllListeners('zapret:testProgress')

  listener = (_e, p) => {
    const isRunning = p.phase === 'starting' || p.phase === 'testing'
    useZapretTestStore.getState().set({
      progress: p,
      isRunning,
      report: p.report ?? useZapretTestStore.getState().report
    })

    // Single global completion notification — appears on whichever tab
    // the user is currently looking at. Same vivid-green styling as the
    // other "power-on" success toasts (zapret install, copy-link, etc).
    if (p.phase === 'completed' && p.report && p.report.ranAt !== lastToastedRanAt) {
      lastToastedRanAt = p.report.ranAt
      const passed = Object.values(p.report.results).filter((r) => r.passed).length
      const total = Object.keys(p.report.results).length
      toast.success('Тестирование стратегий завершено', {
        description:
          total > 0
            ? `Прошли проверку: ${passed} из ${total}` +
              (p.report.bestStrategy ? `. Лучшая: ${p.report.bestStrategy}` : '')
            : undefined,
        style: POWER_ON_BANNER_STYLE,
        duration: 6000
      })
    }
    if (p.phase === 'error') {
      toast.error('Тест стратегий завершён с ошибкой', {
        description: p.message,
        duration: 6000
      })
    }
  }
  window.electron.ipcRenderer.on('zapret:testProgress', listener)

  // Hydrate initial state. If a sweep is currently running we mark
  // isRunning=true so the strategies card is locked out immediately
  // even before the next 'testing' tick lands.
  Promise.all([
    zapretGetStrategyTestResults().catch(() => null),
    zapretIsStrategyTestRunning().catch(() => false)
  ]).then(([report, running]) => {
    useZapretTestStore.getState().set({
      report: report ?? null,
      isRunning: running,
      progress: running ? { phase: 'testing' } : null
    })
  })

  return () => {
    if (listener) {
      window.electron.ipcRenderer.removeListener('zapret:testProgress', listener)
      listener = null
    }
  }
}
