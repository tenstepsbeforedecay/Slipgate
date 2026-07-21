import { existsSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { zapretBundleDir } from '../utils/dirs';
// list-general.txt is consumed by Zapret as a hostlist (SNI / Host
// header matching). Domains are the primary entry; IPs/CIDRs are
// accepted too — some Zapret strategies cross-reference both.
const IPV4_CIDR = /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\/(?:[0-9]|[12]\d|3[0-2]))?$/;
const IPV6_CIDR = /^(?:[A-Fa-f0-9:]+:+)+[A-Fa-f0-9]*(?:\/(?:1[0-1]\d|12[0-8]|\d{1,2}))?$/;
// Hostname / FQDN: labels of [a-z0-9-], 1–63 chars, joined by dots,
// optionally with a leading wildcard (`*.example.com`). Total ≤253.
const HOSTNAME = /^\*?\.?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))+$/i;
export const CURATED_IP_SETS = [
    {
        id: 'discord',
        name: 'Discord',
        description: 'Основные домены Discord, их CDN и голосовых сервисов.',
        cidrs: [
            'discord.com',
            'discordapp.com',
            'discordapp.net',
            'discord.gg',
            'discord.gift',
            'discord.media',
            'discord.new',
            'discordcdn.com',
            'dis.gd',
            'discordstatus.com'
        ]
    },
    {
        id: 'telegram',
        name: 'Telegram',
        description: 'Домены Telegram и вспомогательных сервисов.',
        cidrs: [
            'telegram.org',
            'telegram.me',
            't.me',
            'telesco.pe',
            'web.telegram.org',
            'core.telegram.org',
            'cdn-telegram.org',
            'tdesktop.com',
            'telegram-cdn.org'
        ]
    },
    {
        id: 'youtube',
        name: 'YouTube / Google',
        description: 'Домены YouTube и смежных сервисов Google.',
        cidrs: [
            'youtube.com',
            'youtu.be',
            'youtubekids.com',
            'youtube-nocookie.com',
            'yt.be',
            'ytimg.com',
            'ggpht.com',
            'googlevideo.com',
            'youtubei.googleapis.com',
            'i.ytimg.com',
            's.ytimg.com',
            'm.youtube.com'
        ]
    },
    {
        id: 'cloudflare',
        name: 'Cloudflare',
        description: 'Ключевые домены Cloudflare (DNS, Workers, ECH, R2).',
        cidrs: [
            'cloudflare.com',
            'cloudflare-dns.com',
            'cloudflareinsights.com',
            'cloudflarestream.com',
            'cloudflareaccess.com',
            'cloudflare-ech.com',
            'workers.dev',
            'pages.dev',
            'r2.dev',
            'one.one.one.one'
        ]
    },
    {
        id: 'twitch',
        name: 'Twitch',
        description: 'Домены Twitch и их CDN.',
        cidrs: [
            'twitch.tv',
            'ttvnw.net',
            'jtvnw.net',
            'twitchcdn.net',
            'twitchsvc.net',
            'live-video.net',
            'helix.twitch.tv'
        ]
    },
    {
        id: 'spotify',
        name: 'Spotify',
        description: 'Домены Spotify и смежных CDN.',
        cidrs: [
            'spotify.com',
            'spotifycdn.com',
            'scdn.co',
            'spoti.fi',
            'spotilocal.com',
            'pscdn.co',
            'audio-fa.scdn.co',
            'audio-ak.spotify.com'
        ]
    }
];
export function getCuratedIpSets() {
    return CURATED_IP_SETS.map((s) => ({ ...s, cidrs: [...s.cidrs] }));
}
function listFile() {
    return path.join(zapretBundleDir(), 'lists', 'list-general.txt');
}
function backupFile() {
    // No upstream backup is shipped for list-general.txt — we mint one
    // ourselves on first edit (see ensureBackup) so «restore from backup»
    // can roll back to the original Flowseal hostlist.
    return path.join(zapretBundleDir(), 'lists', 'list-general.txt.backup');
}
function isValidCidr(line) {
    const v = line.trim();
    if (!v)
        return false;
    if (v.startsWith('#') || v.startsWith(';'))
        return false;
    if (IPV4_CIDR.test(v) || IPV6_CIDR.test(v))
        return true;
    if (v.length > 253)
        return false;
    return HOSTNAME.test(v);
}
function ensureBackup() {
    const src = listFile();
    const bak = backupFile();
    if (!existsSync(src))
        return;
    if (existsSync(bak) && safeSize(bak) > 0)
        return;
    try {
        copyFileSync(src, bak);
    }
    catch { /* best-effort */ }
}
function readLines(file) {
    if (!existsSync(file))
        return [];
    try {
        return readFileSync(file, 'utf-8').split(/\r?\n/);
    }
    catch {
        return [];
    }
}
function dedup(list) {
    const seen = new Set();
    const out = [];
    for (const raw of list) {
        const v = raw.trim();
        if (!v)
            continue;
        if (seen.has(v))
            continue;
        seen.add(v);
        out.push(v);
    }
    return out;
}
function ensureDirOrThrow() {
    const dir = path.dirname(listFile());
    if (!existsSync(dir)) {
        throw new Error(`zapret-bundle отсутствует: нет ${dir}. Установите/обновите Zapret.`);
    }
}
export function getIpListSnapshot() {
    const file = listFile();
    const lines = dedup(readLines(file).filter(isValidCidr));
    return {
        total: lines.length,
        preview: lines.slice(0, 25),
        hasBackup: existsSync(backupFile()) && safeSize(backupFile()) > 0,
        filePath: file
    };
}
function safeSize(file) {
    try {
        return statSync(file).size;
    }
    catch {
        return 0;
    }
}
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
export function applyIpListPatch(patch) {
    ensureDirOrThrow();
    ensureBackup();
    const file = listFile();
    const existing = patch.replace ? [] : readLines(file).filter(isValidCidr);
    const fromSets = [];
    if (patch.setIds && patch.setIds.length) {
        const byId = new Map(CURATED_IP_SETS.map((s) => [s.id, s]));
        for (const id of patch.setIds) {
            const s = byId.get(id);
            if (s)
                fromSets.push(...s.cidrs);
        }
    }
    const fromCustom = (patch.customCidrs ?? [])
        .flatMap((s) => s.split(/[\s,;]+/))
        .map((s) => s.trim())
        .filter(isValidCidr);
    const merged = dedup([...existing, ...fromSets, ...fromCustom]);
    writeAtomic(file, merged.join('\r\n') + (merged.length ? '\r\n' : ''));
    return getIpListSnapshot();
}
export function clearIpList() {
    ensureDirOrThrow();
    ensureBackup();
    writeAtomic(listFile(), '');
    return getIpListSnapshot();
}
/**
 * Restore list-general.txt from a backup. The first time the user edits
 * the file we copy the original Flowseal hostlist to .backup; restore
 * just copies it back.
 */
export function restoreIpListBackup() {
    ensureDirOrThrow();
    const src = backupFile();
    if (!existsSync(src)) {
        throw new Error('Backup-файл list-general.txt.backup ещё не создан (вы ни разу не правили список).');
    }
    copyFileSync(src, listFile());
    return getIpListSnapshot();
}
function writeAtomic(file, content) {
    // list-general.txt is loaded once when winws.exe starts; live mid-write
    // races aren't a real concern. A direct write is fine and avoids the
    // Windows rename-over-existing-file caveat entirely.
    writeFileSync(file, content, 'utf-8');
}
