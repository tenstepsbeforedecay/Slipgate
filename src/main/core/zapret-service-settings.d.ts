/**
 * These two settings mirror `service.bat`'s own "Game Filter" and "IPset
 * Filter" menu items. Both are driven entirely by files inside the Zapret
 * bundle (utils/game_filter.enabled, lists/ipset-all.txt) that
 * general.bat itself reads on every launch — we don't reimplement any
 * winws.exe argument logic here, we just manage the same files
 * service.bat would, so running it manually afterwards stays in sync and
 * nothing about the actual filtering behaviour changes underneath us.
 *
 * A running winws.exe reads these once at launch, so changes only take
 * effect after Zapret is restarted — same as service.bat's own
 * "Restart the zapret to apply the changes" note.
 */
export type GameFilterMode = 'off' | 'all' | 'tcp' | 'udp';
export type IpsetFilterMode = 'none' | 'loaded' | 'any';
/** Reads current mode straight from disk — source of truth, not config. */
export declare function getGameFilterMode(): GameFilterMode;
export declare function setGameFilterMode(mode: GameFilterMode): Promise<GameFilterMode>;
export declare function getIpsetFilterMode(): IpsetFilterMode;
export interface IpsetFilterSnapshot {
    mode: IpsetFilterMode;
    lines: number;
    hasBackup: boolean;
}
export declare function getIpsetFilterSnapshot(): IpsetFilterSnapshot;
export declare function setIpsetFilterMode(mode: IpsetFilterMode): Promise<IpsetFilterSnapshot>;
/**
 * Downloads the latest curated ipset list and installs it as the active
 * ("loaded") list, discarding any stale backup — a freshly downloaded
 * list is now the thing "loaded" should mean.
 */
export declare function updateIpsetList(): Promise<IpsetFilterSnapshot>;
