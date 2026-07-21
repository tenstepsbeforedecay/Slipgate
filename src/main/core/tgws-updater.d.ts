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
export declare function checkTgwsUpdate(force?: boolean): Promise<TgwsUpdateInfo>;
export declare function installTgwsUpdate(assetUrl: string, expectedVersion?: string): Promise<{
    installedVersion?: string;
    sizeBytes: number;
}>;
export declare function dismissTgwsUpdate(tag: string): Promise<void>;
