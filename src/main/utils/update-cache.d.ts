export interface PersistedUpdateCache<T> {
    at: number;
    data: T;
}
/**
 * Synchronously load the on-disk cache for `name`. Returns `null` on any
 * failure (missing file, malformed JSON, permission glitch) — callers
 * MUST treat null as "no cache, fall through to live fetch".
 */
export declare function loadUpdateCache<T>(name: string): PersistedUpdateCache<T> | null;
/**
 * Best-effort sync write of the cache. Fire-and-forget — the write is
 * cheap (sub-1 KB JSON) and any I/O failure is logged via console then
 * silently swallowed; we never want a cache write to break the user's
 * actual update check.
 */
export declare function saveUpdateCache<T>(name: string, data: T): void;
