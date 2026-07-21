export declare function getAppConfig(force?: boolean): Promise<AppConfig>;
export declare function patchAppConfig(patch: Partial<AppConfig>): Promise<void>;
export declare function getAppConfigSync(): AppConfig;
