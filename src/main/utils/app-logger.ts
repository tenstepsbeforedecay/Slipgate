import { BrowserWindow } from 'electron'

function broadcast(channel: string, ...args: unknown[]): void {
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.webContents.send(channel, ...args)
  }
}

export function appLog(type: ControllerLog['type'], payload: string): void {
  broadcast('log', {
    time: Date.now(),
    type,
    source: 'app',
    payload
  } satisfies ControllerLog)
  // Also mirror to stdout for dev convenience.
  const tag = type === 'error' ? '[app:error]' : type === 'warn' ? '[app:warn]' : '[app]'
  console.log(`${tag} ${payload}`)
}
