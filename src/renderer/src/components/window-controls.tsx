import React, { useEffect, useState } from 'react'
import { platform } from '@renderer/utils/init'

const WindowControls: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false)
  const [isFocused, setIsFocused] = useState(document.hasFocus())
  const [suppressHover, setSuppressHover] = useState<'close' | 'minimize' | null>(null)
  const isMac = platform === 'darwin'

  useEffect(() => {
    window.electron.ipcRenderer.invoke('windowIsMaximized').then(setIsMaximized)

    const onMaximize = (): void => setIsMaximized(true)
    const onUnmaximize = (): void => setIsMaximized(false)

    window.electron.ipcRenderer.on('window-maximized', onMaximize)
    window.electron.ipcRenderer.on('window-unmaximized', onUnmaximize)

    const onFocus = (): void => setIsFocused(true)
    const onBlur = (): void => setIsFocused(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)

    const onAnyPointerMove = (): void => setSuppressHover(null)
    document.addEventListener('pointermove', onAnyPointerMove, { passive: true })

    return () => {
      window.electron.ipcRenderer.removeAllListeners('window-maximized')
      window.electron.ipcRenderer.removeAllListeners('window-unmaximized')
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('pointermove', onAnyPointerMove)
    }
  }, [])

  const handleMinimize = (e: React.MouseEvent<HTMLButtonElement>): void => {
    setSuppressHover('minimize')
    e.currentTarget.blur()
    window.electron.ipcRenderer.invoke('windowMinimize')
  }
  const handleMaximize = (): void => {
    window.electron.ipcRenderer.invoke('windowMaximize')
  }
  const handleClose = (e: React.MouseEvent<HTMLButtonElement>): void => {
    setSuppressHover('close')
    e.currentTarget.blur()
    window.electron.ipcRenderer.invoke('windowClose')
  }

  // Cleared when the cursor actually leaves the button — at that point real
  // :hover is gone too and we can re-enable the normal hover styling.
  const clearSuppressed = (): void => setSuppressHover(null)

  const closeBtn = (
    <button
      key="close"
      className={`wc-btn wc-close${suppressHover === 'close' ? ' wc-suppress-hover' : ''}`}
      onClick={handleClose}
      onPointerLeave={clearSuppressed}
      onPointerMove={clearSuppressed}
    >
      <svg viewBox="0 0 10 10" fill="none">
        <path
          d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  )

  const minimizeBtn = (
    <button
      key="minimize"
      className={`wc-btn wc-minimize${suppressHover === 'minimize' ? ' wc-suppress-hover' : ''}`}
      onClick={handleMinimize}
      onPointerLeave={clearSuppressed}
      onPointerMove={clearSuppressed}
    >
      <svg viewBox="0 0 10 10" fill="none">
        <path d="M1.5 5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </button>
  )

  const maximizeBtn = (
    <button key="maximize" className="wc-btn wc-maximize" onClick={handleMaximize}>
      {isMaximized ? (
        <svg viewBox="0 0 10 10" fill="none">
          <path
            d="M3 1H8.5A.5.5 0 0 1 9 1.5V7"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <rect x="1" y="3" width="6" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      ) : (
        <svg viewBox="0 0 10 10" fill="none">
          <rect
            x="1.5"
            y="1.5"
            width="7"
            height="7"
            rx="0.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
      )}
    </button>
  )

  const buttons = isMac
    ? [closeBtn, minimizeBtn, maximizeBtn]
    : [minimizeBtn, maximizeBtn, closeBtn]

  return (
    <div className={`wc-group app-nodrag ${isMac ? `wc-mac${!isFocused ? ' wc-blurred' : ''}` : 'wc-win'}`}>{buttons}</div>
  )
}

export default WindowControls
