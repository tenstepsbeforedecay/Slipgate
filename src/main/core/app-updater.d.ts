export declare const UPGRADE_MARKER_NAME = ".slipgate-upgrade";
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
export declare function checkAppUpdate(force?: boolean): Promise<AppUpdateInfo>;
export declare function dismissAppUpdate(tag: string): Promise<void>;
/**
 * Download the installer and launch it in silent mode, then quit Slipgate
 * so NSIS can replace the on-disk files. The installer auto-relaunches the
 * new Slipgate when it's done; the user perceives the upgrade as ~5–10 s
 * of "closed and reopened".
 */
export declare function installAppUpdate(assetUrl: string, expectedVersion?: string): Promise<{
    scheduled: true;
}>;
export declare function silentBackgroundCheck(): void;
export declare function invalidateAppUpdateCache(): void;
