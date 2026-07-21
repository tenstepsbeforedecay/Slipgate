export interface StrategyDescriptor {
    file: string;
    title: string;
    description: string;
}
export declare function getZapretStatus(): CoreStatus;
/**
 * Scan zapretBundleDir() for `general*.bat` and extract the first
 * one-line REM/rem comment as a description. Returns an empty array
 * if the bundle isn't present yet.
 */
export declare function listStrategies(): StrategyDescriptor[];
export declare function installZapretBundle(zipBytes: Uint8Array): Promise<{
    strategies: number;
    installedVersion?: string;
}>;
export declare function withZapretLock<T>(fn: () => Promise<T>): Promise<T>;
export declare function startZapret(): Promise<void>;
export declare function stopZapret(): Promise<void>;
/** Kill any orphan winws.exe instances by image name. */
export declare function killWinws(): Promise<void>;
/**
 * Pre-flight for Zapret: make sure WinDivert is loaded and ready BEFORE we
 * spawn winws.exe. Two failure modes we actively guard against:
 *
 *  1. Service registered but pointing at a stale path (user reinstalled
 *     Slipgate to a different folder, or the resources/ layout changed).
 *     Detected by comparing `BINARY_PATH_NAME` to the current .sys location.
 *     Fix: `sc delete` so winws.exe re-registers on demand.
 *
 *  2. Service registered but stopped (previous Slipgate quit ran `sc stop`).
 *     Fix: `sc start` it ourselves — this is synchronous from our process,
 *     so we avoid the SCM-is-busy race that used to hit winws.exe at boot.
 *
 * Returns silently on success; throws with a user-facing message on hard
 * failure so the caller can surface it through the Zapret status card.
 */
export declare function ensureWinDivertReady(): void;
/** Returns true if at least one winws.exe is running. */
export declare function isWinwsRunning(): Promise<boolean>;
export declare function restartZapret(): Promise<void>;
