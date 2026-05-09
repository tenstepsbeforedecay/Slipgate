interface AppVersion {
  version: string
  changelog: string
}

interface AppConfig {
  // ---- Migration marker
  configVersion?: number
  // BUILD_ID baked into the main bundle that last wrote this config. When a
  // freshly-installed build sees a different value here it regenerates the
  // TG WS secret + URL so two installs never share credentials.
  lastBuildId?: string

  // ---- Appearance & locale
  appTheme: AppTheme
  customTheme?: string
  disableTray?: boolean
  hideTaskbarIcon?: boolean
  autoLaunch?: boolean
  silentStart?: boolean
  // After Slipgate starts and proxies are warmed up, launch these apps.
  // Lets the user disable Telegram/Discord native autostart and let
  // Slipgate orchestrate the order: proxy first, app second.
  launchTelegram?: boolean
  launchDiscord?: boolean
  language?: 'en-US' | 'ru-RU' | 'zh-CN'

  // ---- Updates
  autoCheckUpdate: boolean
  // Tag the user explicitly dismissed via the "Later" button on the
  // full-screen Slipgate-update overlay. The overlay stays hidden until
  // GitHub publishes a release with a different tag.
  dismissedAppUpdateTag?: string

  // ---- Logs
  maxLogDays: number

  // ---- Shortcuts
  showWindowShortcut?: string
  restartAppShortcut?: string
  tgwsToggleShortcut?: string
  zapretToggleShortcut?: string

  // ---- GPU / low-level
  disableGPU: boolean

  // ---- Feature-specific sub-configs
  tgws?: TgwsConfig
  zapret?: ZapretConfig
}

interface TgwsConfig {
  enabled: boolean
  autoStart?: boolean
  host: string            // default 127.0.0.1
  port: number            // default 1443
  secret: string          // 32-hex MTProto secret
  dcIp?: string[]         // e.g. ['2:149.154.167.220']
  bufKb?: number          // default 256
  poolSize?: number       // default 4
  verbose?: boolean
  cfproxy?: boolean
  cfproxyPriority?: boolean
  cfproxyUserDomain?: string
  fakeTlsDomain?: string
  binaryPath?: string     // override path to TgWsProxy_windows.exe
  // Version of the TgWsProxy_windows.exe currently installed in
  // runtime/tgws/. Set by the auto-updater. Used to decide whether a
  // newer Flowseal/tg-ws-proxy release is available.
  installedVersion?: string
  // Tag the user explicitly dismissed via "Later"; updater stays quiet
  // for that exact tag until upstream ships a fresher one.
  dismissedUpdateTag?: string
}

interface ZapretConfig {
  enabled: boolean
  autoStart?: boolean
  activeStrategy?: string          // file name of the .bat strategy
  gameFilter?: boolean             // enable UDP/TCP >1023 filter
  ipsetMode?: 'none' | 'loaded' | 'any'
  bundlePath?: string              // override path to unpacked zapret folder
  useService?: boolean             // installed as Windows service
  // Version of the unpacked Flowseal/zapret-discord-youtube bundle in
  // runtime/zapret. Set when the user installs/updates from the auto-
  // updater. Used to decide whether a newer GitHub release exists.
  installedVersion?: string
  // ISO timestamp + tag the user explicitly dismissed via "Later". The
  // updater will stay quiet for that exact tag until a newer one ships.
  dismissedUpdateTag?: string
}

type CoreStatusState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

interface CoreStatus {
  state: CoreStatusState
  pid?: number
  startedAt?: number
  lastError?: string
}
