interface IpcResult<T> {
  ok: boolean
  value?: T
  message?: string
}

async function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  const res = (await window.electron.ipcRenderer.invoke(channel, ...args)) as IpcResult<T>
  if (!res || !res.ok) {
    throw new Error(res?.message ?? `IPC ${channel} failed`)
  }
  return res.value as T
}

// ---- App config -------------------------------------------------------------
export const getAppConfig = (): Promise<AppConfig> => invoke('app:getConfig')
export const patchAppConfig = (patch: Partial<AppConfig>): Promise<void> =>
  invoke('app:patchConfig', patch)
export const getAppVersion = (): Promise<string> => invoke('app:version')

// ---- Theme ------------------------------------------------------------------
export const setNativeTheme = (theme: AppTheme): Promise<void> =>
  invoke('theme:setNative', theme)
export const applyTheme = (file: string): Promise<void> => invoke('theme:apply', file)

// ---- Utility ----------------------------------------------------------------
export const openTelegramLink = (url: string): Promise<void> => invoke('shell:openTelegramLink', url)
export const writeClipboard = (text: string): Promise<void> =>
  invoke('clipboard:writeText', text)

// ---- TG WS Proxy ------------------------------------------------------------
export const tgwsStatus = (): Promise<CoreStatus> => invoke('tgws:status')
export const tgwsStart = (): Promise<void> => invoke('tgws:start')
export const tgwsStop = (): Promise<void> => invoke('tgws:stop')
export const tgwsRestart = (): Promise<void> => invoke('tgws:restart')
export const tgwsGetLink = (): Promise<string> => invoke('tgws:getLink')

export interface TgwsUpdateInfo {
  installed?: string
  latest?: string
  hasUpdate: boolean
  assetName?: string
  assetUrl?: string
  assetSize?: number
  releaseUrl?: string
  publishedAt?: string
  dismissed?: boolean
}
export const tgwsCheckUpdate = (force = false): Promise<TgwsUpdateInfo> =>
  invoke('tgws:checkUpdate', force)
export const tgwsInstallUpdate = (
  url: string,
  expectedVersion?: string
): Promise<{ installedVersion?: string; sizeBytes: number }> =>
  invoke('tgws:installUpdate', url, expectedVersion)
export const tgwsDismissUpdate = (tag: string): Promise<void> =>
  invoke('tgws:dismissUpdate', tag)

// ---- Zapret -----------------------------------------------------------------
export const zapretStatus = (): Promise<CoreStatus> => invoke('zapret:status')
export const zapretListStrategies = (): Promise<{ file: string; title: string; description: string }[]> =>
  invoke('zapret:listStrategies')
export const zapretStart = (): Promise<void> => invoke('zapret:start')
export const zapretStop = (): Promise<void> => invoke('zapret:stop')
export const zapretRestart = (): Promise<void> => invoke('zapret:restart')
export const zapretInstallBundle = (bytes: Uint8Array): Promise<{ strategies: number }> =>
  invoke('zapret:installBundle', bytes)

export interface ZapretUpdateInfo {
  installed?: string
  latest?: string
  hasUpdate: boolean
  assetName?: string
  assetUrl?: string
  assetSize?: number
  releaseUrl?: string
  publishedAt?: string
  dismissed?: boolean
}
export const zapretCheckUpdate = (force = false): Promise<ZapretUpdateInfo> =>
  invoke('zapret:checkUpdate', force)
export const zapretInstallUpdate = (
  url: string,
  expectedVersion?: string
): Promise<{ strategies: number; installedVersion?: string }> =>
  invoke('zapret:installUpdate', url, expectedVersion)
export const zapretDismissUpdate = (tag: string): Promise<void> =>
  invoke('zapret:dismissUpdate', tag)

// ---- Zapret strategy tester -------------------------------------------------
export interface StrategyTestResult {
  passed: boolean
  okCount: number
  totalCount: number
  score: number
  tested: true
}
export interface StrategyTestReport {
  ranAt: number
  durationMs: number
  bundleVersion?: string
  results: Record<string, StrategyTestResult>
  bestStrategy?: string
}
export interface StrategyTestProgress {
  phase: 'starting' | 'testing' | 'completed' | 'error' | 'idle'
  current?: number
  total?: number
  strategy?: string
  report?: StrategyTestReport
  message?: string
}
export const zapretRunStrategyTest = (): Promise<StrategyTestReport> =>
  invoke('zapret:runStrategyTest')
export const zapretGetStrategyTestResults = (): Promise<StrategyTestReport | null> =>
  invoke('zapret:getStrategyTestResults')
export const zapretIsStrategyTestRunning = (): Promise<boolean> =>
  invoke('zapret:isStrategyTestRunning')

// ---- Zapret IP list (ipset-all.txt) ----------------------------------------
export interface CuratedIpSet {
  id: string
  name: string
  description: string
  cidrs: string[]
}
export interface IpListSnapshot {
  total: number
  preview: string[]
  hasBackup: boolean
  filePath: string
}
export interface IpListPatch {
  setIds?: string[]
  customCidrs?: string[]
  replace?: boolean
}
export const zapretGetCuratedIpSets = (): Promise<CuratedIpSet[]> =>
  invoke('zapret:getCuratedIpSets')
export const zapretGetIpList = (): Promise<IpListSnapshot> => invoke('zapret:getIpList')
export const zapretApplyIpListPatch = (patch: IpListPatch): Promise<IpListSnapshot> =>
  invoke('zapret:applyIpListPatch', patch)
export const zapretClearIpList = (): Promise<IpListSnapshot> => invoke('zapret:clearIpList')
export const zapretRestoreIpListBackup = (): Promise<IpListSnapshot> =>
  invoke('zapret:restoreIpListBackup')

// ---- Slipgate self-update ---------------------------------------------------
export interface AppUpdateInfo {
  installed: string
  latest?: string
  hasUpdate: boolean
  tag?: string
  assetName?: string
  assetUrl?: string
  assetSize?: number
  releaseUrl?: string
  releaseNotes?: string
  publishedAt?: string
  dismissed?: boolean
}
export const appCheckUpdate = (force = false): Promise<AppUpdateInfo> =>
  invoke('app:checkUpdate', force)
export const appInstallUpdate = (
  url: string,
  expectedVersion?: string
): Promise<{ scheduled: true }> =>
  invoke('app:installUpdate', url, expectedVersion)
export const appDismissUpdate = (tag: string): Promise<void> =>
  invoke('app:dismissUpdate', tag)

// ---- App control ------------------------------------------------------------
export const appQuit = (): Promise<void> => invoke('app:quit')
export const appRelaunch = (): Promise<void> => invoke('app:relaunch')

// Deprecated legacy stubs used by components we haven't pruned yet.
export const needsFirstRunAdmin = async (): Promise<boolean> => false
export const restartAsAdmin = async (): Promise<void> => {
  await appRelaunch()
}
