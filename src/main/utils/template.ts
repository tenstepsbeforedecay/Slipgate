import { randomBytes } from 'crypto'

/**
 * Bump this any time we want to force a partial reset of fields that older
 * (dev / stale) configs may have polluted. The migration in `config/app.ts`
 * compares the saved version against this and resets the relevant subset
 * back to defaults — fresh secret, no preselected zapret strategy, all
 * autoStart switches off, etc.
 */
export const CONFIG_VERSION = 4

/**
 * Default config written on first launch.
 * Production builds ship with EVERYTHING off — no autostart, no tray, no
 * silent start, no auto-launch. The user opts into each feature manually
 * from Settings. Keeps a clean blank-slate UX for first-time installs and
 * prevents dev/QA settings leaking into shipped builds.
 */
export const defaultConfig: AppConfig = {
  configVersion: CONFIG_VERSION,
  appTheme: 'dark',
  disableTray: false,
  // When ON the main window is excluded from the Windows taskbar entirely
  // AND clicking X hides the window into the tray. OFF by default — normal
  // taskbar app behaviour, X = full quit.
  hideTaskbarIcon: false,
  autoLaunch: false,
  // Window MUST be visible on first launch so the user can configure it.
  silentStart: false,
  language: 'en-US',
  autoCheckUpdate: true,
  maxLogDays: 7,
  disableGPU: false,
  tgws: {
    enabled: false,
    autoStart: false,
    host: '127.0.0.1',
    port: 1443,
    secret: randomBytes(16).toString('hex'),
    dcIp: [],
    bufKb: 256,
    poolSize: 4,
    verbose: false,
    cfproxy: true,
    cfproxyPriority: true,
    cfproxyUserDomain: '',
    fakeTlsDomain: ''
  },
  zapret: {
    enabled: false,
    autoStart: false,
    // Intentionally undefined — UI prompts the user to pick a strategy on
    // first run instead of silently committing them to one (general.bat).
    activeStrategy: undefined,
    gameFilter: false,
    ipsetMode: 'loaded',
    useService: false
  }
}