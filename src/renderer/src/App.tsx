import { useEffect } from 'react'
import { useLocation, useRoutes } from 'react-router-dom'
import { toast } from 'sonner'
import { useTheme } from 'next-themes'
import './i18n'
import routes from '@renderer/routes'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { applyTheme, setNativeTheme } from '@renderer/utils/ipc'
import { SidebarProvider } from '@renderer/components/ui/sidebar'
import AppSidebar from '@renderer/components/app-sidebar'
import AppUpdateOverlay from '@renderer/components/app-update-overlay'
import WindowControls from '@renderer/components/window-controls'
import { platform } from '@renderer/utils/init'
import { attachLogsStore } from '@renderer/store/logs-store'
import { attachTgwsStore } from '@renderer/store/tgws-store'
import { attachZapretStore } from '@renderer/store/zapret-store'
import { attachZapretTestStore } from '@renderer/store/zapret-test-store'
import mapDark from '@renderer/assets/map_darktheme.svg'
import mapLight from '@renderer/assets/map_lighttheme.svg'

const App: React.FC = () => {
  const { appConfig } = useAppConfig()
  const { appTheme = 'dark', customTheme } = appConfig || {}
  const { setTheme, resolvedTheme } = useTheme()
  const page = useRoutes(routes)
  const location = useLocation()
  const isHome = location.pathname === '/' || location.pathname.includes('/home')
  const mapBg = resolvedTheme === 'dark' ? mapDark : mapLight

  useEffect(() => {
    const d1 = attachLogsStore()
    const d2 = attachTgwsStore()
    const d3 = attachZapretStore()
    const d4 = attachZapretTestStore()
    return () => {
      d1()
      d2()
      d3()
      d4()
    }
  }, [])

  useEffect(() => {
    setNativeTheme(appTheme)
    setTheme(appTheme)
  }, [appTheme, setTheme])

  useEffect(() => {
    applyTheme(customTheme || 'default.css').catch(() => {
      /* noop */
    })
  }, [customTheme])

  useEffect(() => {
    const handleShowError = (_e: unknown, title: string, message: string): void => {
      toast.error(title, { description: message })
    }
    window.electron.ipcRenderer.on('showError', handleShowError)
    return () => {
      window.electron.ipcRenderer.removeAllListeners('showError')
    }
  }, [])

  // Fix the classic Electron "sticky hover/focus" bug.
  useEffect(() => {
    let resetTimer: ReturnType<typeof setTimeout> | null = null

    const clearStuckState = (): void => {
      if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur()
      }
      const body = document.body
      body.classList.add('hover-reset')
      if (resetTimer) clearTimeout(resetTimer)
      // 120 ms is empirically reliable across 60/120/144 Hz displays. The
      resetTimer = setTimeout(() => body.classList.remove('hover-reset'), 120)
    }

    window.addEventListener('blur', clearStuckState)
    window.addEventListener('focus', clearStuckState)
    const handleVisibilityIpc = (): void => clearStuckState()
    window.electron.ipcRenderer.on('window:visibility', handleVisibilityIpc)

    return () => {
      window.removeEventListener('blur', clearStuckState)
      window.removeEventListener('focus', clearStuckState)
      window.electron.ipcRenderer.removeAllListeners('window:visibility')
      if (resetTimer) clearTimeout(resetTimer)
    }
  }, [])

  return (
    // Dark = pure black (was #080F16, deep navy). Light = neutral light
    // gray (was #C5D4F1, periwinkle blue) so light mode also drops the
    // blue tint and stays consistent with the new monochrome palette.
    <SidebarProvider
      defaultOpen={false}
      className="relative w-full h-screen overflow-hidden"
      style={{ backgroundColor: resolvedTheme === 'dark' ? '#000000' : '#E5E5E5' }}
    >
      <img
        src={mapBg}
        alt=""
        className={`pointer-events-none absolute inset-0 opacity-65 w-full h-full object-cover z-0 transition-[filter] duration-500 ${
          isHome ? '' : 'blur-3xl'
        }`}
      />
      {platform === 'darwin' && (
        <div className="fixed top-0.5 -left-1 h-14.25 flex items-center pl-3 z-100 app-drag">
          <WindowControls />
        </div>
      )}
      <AppSidebar />
      <div className="relative z-10 main grow h-full overflow-y-auto">{page}</div>
      <AppUpdateOverlay />
    </SidebarProvider>
  )
}

export default App
