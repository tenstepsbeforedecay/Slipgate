export declare const getAppConfig: () => Promise<AppConfig>;
export declare const patchAppConfig: (patch: Partial<AppConfig>) => Promise<void>;
export declare const getAppVersion: () => Promise<string>;
export declare const setNativeTheme: (theme: AppTheme) => Promise<void>;
export declare const applyTheme: (file: string) => Promise<void>;
export declare const openTelegramLink: (url: string) => Promise<void>;
export declare const writeClipboard: (text: string) => Promise<void>;
export declare const tgwsStatus: () => Promise<CoreStatus>;
export declare const tgwsStart: () => Promise<void>;
export declare const tgwsStop: () => Promise<void>;
export declare const tgwsRestart: () => Promise<void>;
export declare const tgwsGetLink: () => Promise<string>;
export interface TgwsUpdateInfo {
    installed?: string;
    latest?: string;
    hasUpdate: boolean;
    assetName?: string;
    assetUrl?: string;
    assetSize?: number;
    releaseUrl?: string;
    publishedAt?: string;
    dismissed?: boolean;
}
export declare const tgwsCheckUpdate: (force?: boolean) => Promise<TgwsUpdateInfo>;
export declare const tgwsInstallUpdate: (url: string, expectedVersion?: string) => Promise<{
    installedVersion?: string;
    sizeBytes: number;
}>;
export declare const tgwsDismissUpdate: (tag: string) => Promise<void>;
export declare const zapretStatus: () => Promise<CoreStatus>;
export declare const zapretListStrategies: () => Promise<{
    file: string;
    title: string;
    description: string;
}[]>;
export declare const zapretStart: () => Promise<void>;
export declare const zapretStop: () => Promise<void>;
export declare const zapretRestart: () => Promise<void>;
export declare const zapretInstallBundle: (bytes: Uint8Array) => Promise<{
    strategies: number;
}>;
export interface ZapretUpdateInfo {
    installed?: string;
    latest?: string;
    hasUpdate: boolean;
    assetName?: string;
    assetUrl?: string;
    assetSize?: number;
    releaseUrl?: string;
    publishedAt?: string;
    dismissed?: boolean;
}
export declare const zapretCheckUpdate: (force?: boolean) => Promise<ZapretUpdateInfo>;
export declare const zapretInstallUpdate: (url: string, expectedVersion?: string) => Promise<{
    strategies: number;
    installedVersion?: string;
}>;
export declare const zapretDismissUpdate: (tag: string) => Promise<void>;
export interface StrategyTestResult {
    passed: boolean;
    okCount: number;
    totalCount: number;
    score: number;
    tested: true;
}
export interface StrategyTestReport {
    ranAt: number;
    durationMs: number;
    bundleVersion?: string;
    results: Record<string, StrategyTestResult>;
    bestStrategy?: string;
}
export interface StrategyTestProgress {
    phase: 'starting' | 'testing' | 'completed' | 'error' | 'idle';
    current?: number;
    total?: number;
    strategy?: string;
    report?: StrategyTestReport;
    message?: string;
}
export declare const zapretRunStrategyTest: () => Promise<StrategyTestReport>;
export declare const zapretGetStrategyTestResults: () => Promise<StrategyTestReport | null>;
export declare const zapretIsStrategyTestRunning: () => Promise<boolean>;
export interface CuratedIpSet {
    id: string;
    name: string;
    description: string;
    cidrs: string[];
}
export interface IpListSnapshot {
    total: number;
    preview: string[];
    hasBackup: boolean;
    filePath: string;
}
export interface IpListPatch {
    setIds?: string[];
    customCidrs?: string[];
    replace?: boolean;
}
export declare const zapretGetCuratedIpSets: () => Promise<CuratedIpSet[]>;
export declare const zapretGetIpList: () => Promise<IpListSnapshot>;
export declare const zapretApplyIpListPatch: (patch: IpListPatch) => Promise<IpListSnapshot>;
export declare const zapretClearIpList: () => Promise<IpListSnapshot>;
export declare const zapretRestoreIpListBackup: () => Promise<IpListSnapshot>;
export type GameFilterMode = 'off' | 'all' | 'tcp' | 'udp';
export type IpsetFilterMode = 'none' | 'loaded' | 'any';
export interface IpsetFilterSnapshot {
    mode: IpsetFilterMode;
    lines: number;
    hasBackup: boolean;
}
export declare const zapretGetGameFilter: () => Promise<GameFilterMode>;
export declare const zapretSetGameFilter: (mode: GameFilterMode) => Promise<GameFilterMode>;
export declare const zapretGetIpsetFilter: () => Promise<IpsetFilterSnapshot>;
export declare const zapretSetIpsetFilter: (mode: IpsetFilterMode) => Promise<IpsetFilterSnapshot>;
export declare const zapretUpdateIpsetList: () => Promise<IpsetFilterSnapshot>;
export interface AppUpdateInfo {
    installed: string;
    latest?: string;
    hasUpdate: boolean;
    tag?: string;
    assetName?: string;
    assetUrl?: string;
    assetSize?: number;
    releaseUrl?: string;
    releaseNotes?: string;
    publishedAt?: string;
    dismissed?: boolean;
}
export declare const appCheckUpdate: (force?: boolean) => Promise<AppUpdateInfo>;
export declare const appInstallUpdate: (url: string, expectedVersion?: string) => Promise<{
    scheduled: true;
}>;
export declare const appDismissUpdate: (tag: string) => Promise<void>;
export declare const appQuit: () => Promise<void>;
export declare const appRelaunch: () => Promise<void>;
export declare const needsFirstRunAdmin: () => Promise<boolean>;
export declare const restartAsAdmin: () => Promise<void>;
