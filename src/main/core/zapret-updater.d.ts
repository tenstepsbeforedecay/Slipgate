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
export declare function checkZapretUpdate(force?: boolean): Promise<ZapretUpdateInfo>;
export declare function installZapretUpdate(assetUrl: string, expectedVersion?: string): Promise<{
    strategies: number;
    installedVersion?: string;
}>;
export declare function dismissZapretUpdate(tag: string): Promise<void>;
