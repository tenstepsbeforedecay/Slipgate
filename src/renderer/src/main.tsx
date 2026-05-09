import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { init, platform } from '@renderer/utils/init'
import '@renderer/assets/main.css'
import App from '@renderer/App'
import BaseErrorBoundary from './components/base/base-error-boundary'
import { Toaster } from './components/ui/sonner'
import { appQuit } from './utils/ipc'
import { AppConfigProvider } from './hooks/use-app-config'

init().then(() => {
  document.addEventListener('keydown', (e) => {
    if (platform !== 'darwin' && e.ctrlKey && e.key === 'q') {
      e.preventDefault()
      appQuit()
    }
    if (platform === 'darwin' && e.metaKey && e.key === 'q') {
      e.preventDefault()
      appQuit()
    }
  })
})

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <NextThemesProvider attribute="class" enableSystem defaultTheme="dark">
      <BaseErrorBoundary>
        <HashRouter>
          <AppConfigProvider>
            <App />
            <Toaster richColors position="bottom-right" />
          </AppConfigProvider>
        </HashRouter>
      </BaseErrorBoundary>
    </NextThemesProvider>
  </React.StrictMode>
)
