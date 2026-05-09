import { readFile, writeFile, rename, copyFile, unlink } from 'fs/promises'
import { appConfigPath } from '../utils/dirs'
import { parseYaml, stringifyYaml } from '../utils/yaml'
import { deepMerge } from '../utils/merge'
import { defaultConfig, CONFIG_VERSION } from '../utils/template'
import { randomBytes } from 'crypto'
import { readFileSync, existsSync } from 'fs'
import { enableAutoRun, disableAutoRun } from '../sys/autoRun'

let appConfig: AppConfig | undefined
let writePromise: Promise<void> = Promise.resolve()

function isValidConfig(c: unknown): c is AppConfig {
  return !!c && typeof c === 'object' && 'appTheme' in (c as object)
}

async function safeWriteConfig(content: string): Promise<void> {
  const configPath = appConfigPath()
  const tmpPath = `${configPath}.tmp`
  const backupPath = `${configPath}.backup`
  try {
    await writeFile(tmpPath, content, 'utf-8')
    if (existsSync(configPath)) {
      await copyFile(configPath, backupPath)
      if (process.platform === 'win32') {
        await unlink(configPath)
      }
    }
    if (existsSync(tmpPath)) {
      await rename(tmpPath, configPath)
    }
  } catch (e) {
    if (existsSync(tmpPath)) {
      try { await unlink(tmpPath) } catch { /* noop */ }
    }
    throw e
  }
}

export async function getAppConfig(force = false): Promise<AppConfig> {
  if (force || !appConfig) {
    try {
      const data = await readFile(appConfigPath(), 'utf-8')
      const parsed = parseYaml<AppConfig>(data)
      if (!parsed || !isValidConfig(parsed)) {
        const backup = await readFile(`${appConfigPath()}.backup`, 'utf-8')
        appConfig = parseYaml<AppConfig>(backup)
      } else {
        appConfig = parsed
      }
    } catch {
      appConfig = defaultConfig
    }
  }
  if (!appConfig || typeof appConfig !== 'object') appConfig = defaultConfig

  const persistedVersion: number = typeof appConfig.configVersion === 'number'
    ? appConfig.configVersion
    : 0

  const persistedBuildId = typeof appConfig.lastBuildId === 'string'
    ? appConfig.lastBuildId
    : ''

  // Backfill any missing fields (e.g. tgws/zapret sections from older configs)
  // by merging persisted values *over* the default template.
  appConfig = deepMerge(defaultConfig, appConfig) as AppConfig

  if ((appConfig.appTheme as string) !== 'light' && (appConfig.appTheme as string) !== 'dark') {
    appConfig = { ...appConfig, appTheme: 'dark' }
  }

  // ---- Per-build "fresh install" reset
  if (persistedBuildId !== __BUILD_ID__) {
    appConfig = {
      ...appConfig,
      lastBuildId: __BUILD_ID__,
      // Behaviour toggles — forced back to template defaults.
      autoLaunch: false,
      silentStart: false,
      disableTray: false,         // tray ON
      hideTaskbarIcon: false,     // normal taskbar behaviour
      tgws: {
        ...(appConfig.tgws ?? defaultConfig.tgws!),
        enabled: false,
        autoStart: false,
        // Random per-install secret. Evaluated NOW on the end-user's machine,
        // so every install gets a unique key.
        secret: randomBytes(16).toString('hex')
      },
      zapret: {
        ...(appConfig.zapret ?? defaultConfig.zapret!),
        enabled: false,
        autoStart: false,
        // Force the user to consciously pick a strategy in the UI rather
        // than silently inheriting whatever was last used in dev.
        activeStrategy: undefined
      }
    }
    try {
      await safeWriteConfig(stringifyYaml(appConfig))
    } catch { /* noop — best-effort, will retry on next patch */ }
    // Tear down any auto-launch task / registry entry left over from a
    // prior install so the freshly-reset `autoLaunch: false` actually
    // takes effect on the next login.
    try { await disableAutoRun() } catch { /* noop */ }
  }

  // ---- One-shot migration
  if (persistedVersion < CONFIG_VERSION) {
    appConfig = {
      ...appConfig,
      configVersion: CONFIG_VERSION,
      // Wipe every "behaviour" toggle so production builds always start
      // identically regardless of what dev runs left behind.
      autoLaunch: false,
      silentStart: false,         // ← critical: stale `true` left the window invisible on launch
      disableTray: false,         // tray icon ON by default — required for hideTaskbarIcon
      hideTaskbarIcon: false,     // normal taskbar behaviour by default
      tgws: {
        ...(appConfig.tgws ?? defaultConfig.tgws!),
        enabled: false,
        autoStart: false,
        // Regenerate a fresh secret + URL on first production launch so the
        // user can't accidentally publish a dev-time secret.
        secret: randomBytes(16).toString('hex')
      },
      zapret: {
        ...(appConfig.zapret ?? defaultConfig.zapret!),
        enabled: false,
        autoStart: false,
        // Force the user to consciously pick a strategy in the UI rather
        // than inheriting a dev-time `general.bat` they may not want.
        activeStrategy: undefined
      }
    }
    // Persist the migrated config immediately so a crash before the next
    // patchAppConfig call doesn't roll back the migration.
    try {
      await safeWriteConfig(stringifyYaml(appConfig))
    } catch { /* noop — migration is best-effort */ }
    // Also tear down any auto-launch task/registry left over from a prior
    // build so Slipgate isn't relaunched on next login against the user's
    // (now-clean) preference.
    try { await disableAutoRun() } catch { /* noop */ }
  }

  return appConfig
}

export async function patchAppConfig(patch: Partial<AppConfig>): Promise<void> {
  const previous = writePromise
  const prevAutoLaunch = appConfig?.autoLaunch
  const prevDisableTray = appConfig?.disableTray
  const prevHideTaskbarIcon = appConfig?.hideTaskbarIcon
  writePromise = (async () => {
    await previous
    appConfig = deepMerge(appConfig ?? defaultConfig, patch)
    await safeWriteConfig(stringifyYaml(appConfig))
  })()
  await writePromise
  if (patch.autoLaunch !== undefined && patch.autoLaunch !== prevAutoLaunch) {
    try {
      if (patch.autoLaunch) await enableAutoRun()
      else await disableAutoRun()
    } catch { /* noop */ }
  }
  // React to tray toggle: create or destroy tray on the fly so the user
  // doesn't have to relaunch the app for the change to take effect.
  if (patch.disableTray !== undefined && patch.disableTray !== prevDisableTray) {
    try {
      const tray = await import('../resolve/tray')
      if (patch.disableTray) tray.destroyTray()
      else await tray.createTray()
    } catch { /* noop */ }
  }
  const disableTrayChanged =
    patch.disableTray !== undefined && patch.disableTray !== prevDisableTray
  const hideChanged =
    patch.hideTaskbarIcon !== undefined && patch.hideTaskbarIcon !== prevHideTaskbarIcon
  if (hideChanged || disableTrayChanged) {
    try {
      const { applySkipTaskbar } = await import('../resolve/windowVisibility')
      applySkipTaskbar()
    } catch { /* noop */ }
  }
}

export function getAppConfigSync(): AppConfig {
  try {
    const raw = readFileSync(appConfigPath(), 'utf-8')
    const data = parseYaml<AppConfig>(raw)
    if (data && typeof data === 'object') return deepMerge(defaultConfig, data) as AppConfig
    return defaultConfig
  } catch {
    return defaultConfig
  }
}