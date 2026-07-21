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
export declare const CURATED_IP_SETS: CuratedIpSet[];
export declare function getCuratedIpSets(): CuratedIpSet[];
export declare function getIpListSnapshot(): IpListSnapshot;
/**
 * Apply a patch to list-general.txt:
 *  - replace=true → wipe the file first
 *  - then merge in entries from selected curated sets + custom user lines
 *
 * Accepts hostnames, IPv4/IPv6 addresses, and CIDR ranges. Invalid lines
 * are silently dropped; duplicates collapsed. The original Flowseal
 * hostlist is backed up to list-general.txt.backup on first edit so
 * the user can restore it.
 */
export declare function applyIpListPatch(patch: IpListPatch): IpListSnapshot;
export declare function clearIpList(): IpListSnapshot;
/**
 * Restore list-general.txt from a backup. The first time the user edits
 * the file we copy the original Flowseal hostlist to .backup; restore
 * just copies it back.
 */
export declare function restoreIpListBackup(): IpListSnapshot;
