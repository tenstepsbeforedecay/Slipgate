import { installZapretBundle } from './zapret';
import { getAppConfig, patchAppConfig } from '../config';
import { loadUpdateCache, saveUpdateCache } from '../utils/update-cache';
const REPO = 'Flowseal/zapret-discord-youtube';
const RELEASES_LATEST_URL = `https://api.github.com/repos/${REPO}/releases/latest`;
const REQUEST_HEADERS = {
    'User-Agent': 'Slipgate-Updater',
    Accept: 'application/vnd.github+json'
};
// Lightweight numeric-aware version compare. Handles "1.7.7" vs "v1.7.10"
// correctly (would fail with plain string compare). Non-numeric segments
// fall back to lexical compare so things like "1.7.7-beta" sort sanely.
function compareVersion(a, b) {
    const norm = (v) => v
        .replace(/^v/i, '')
        .split(/[.\-+]/)
        .map((p) => (/^\d+$/.test(p) ? parseInt(p, 10) : p));
    const aa = norm(a);
    const bb = norm(b);
    const len = Math.max(aa.length, bb.length);
    for (let i = 0; i < len; i++) {
        const av = aa[i] ?? 0;
        const bv = bb[i] ?? 0;
        if (typeof av === 'number' && typeof bv === 'number') {
            if (av > bv)
                return 1;
            if (av < bv)
                return -1;
        }
        else {
            const as = String(av);
            const bs = String(bv);
            if (as > bs)
                return 1;
            if (as < bs)
                return -1;
        }
    }
    return 0;
}
// 12-hour cache, persisted to disk via update-cache helper so the very
let cache = null;
let cacheHydrated = false;
const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const CACHE_NAME = 'zapret';
function hydrateCacheFromDisk() {
    if (cacheHydrated)
        return;
    cacheHydrated = true;
    const persisted = loadUpdateCache(CACHE_NAME);
    if (persisted)
        cache = persisted;
}
let refreshInflight = false;
function backgroundRefresh() {
    if (refreshInflight)
        return;
    refreshInflight = true;
    checkZapretUpdate(true)
        .catch(() => void 0)
        .finally(() => {
        refreshInflight = false;
    });
}
const BUNDLED_ZAPRET_VERSION = '1.9.8c';
function effectiveInstalled(cfgInstalled) {
    return cfgInstalled && cfgInstalled.trim() ? cfgInstalled.trim() : BUNDLED_ZAPRET_VERSION;
}
export async function checkZapretUpdate(force = false) {
    hydrateCacheFromDisk();
    if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
        // Re-attach live values that may have changed since the cached call.
        const cfg = await getAppConfig();
        const installedNow = effectiveInstalled(cfg.zapret?.installedVersion);
        if (Date.now() - cache.at > 60 * 60 * 1000)
            backgroundRefresh();
        return {
            ...cache.data,
            installed: installedNow,
            hasUpdate: !!cache.data.latest && compareVersion(cache.data.latest, installedNow) > 0,
            dismissed: cfg.zapret?.dismissedUpdateTag === cache.data.latest
        };
    }
    const cfg = await getAppConfig();
    const installed = effectiveInstalled(cfg.zapret?.installedVersion);
    const dismissedTag = cfg.zapret?.dismissedUpdateTag;
    let release;
    try {
        const res = await fetch(RELEASES_LATEST_URL, { headers: REQUEST_HEADERS });
        if (!res.ok)
            throw new Error(`GitHub API ${res.status}`);
        release = (await res.json());
    }
    catch (e) {
        // Network/rate-limit failures are non-fatal — UI just stays quiet.
        throw new Error(`Не удалось проверить обновления: ${e instanceof Error ? e.message : String(e)}`);
    }
    const latestRaw = release.tag_name ?? release.name ?? '';
    const latest = latestRaw.replace(/^v/i, '').trim() || undefined;
    const assets = release.assets ?? [];
    // Prefer the canonical "zapret-discord-youtube-*.zip" asset, fall back
    // to any .zip if the maintainer renamed it.
    const zipAsset = assets.find((a) => /^zapret-discord-youtube.*\.zip$/i.test(a.name)) ??
        assets.find((a) => /\.zip$/i.test(a.name));
    const hasUpdate = !!latest && compareVersion(latest, installed) > 0;
    const info = {
        installed,
        latest,
        hasUpdate,
        assetName: zipAsset?.name,
        assetUrl: zipAsset?.browser_download_url,
        assetSize: zipAsset?.size,
        releaseUrl: release.html_url,
        publishedAt: release.published_at,
        dismissed: !!latest && dismissedTag === latest
    };
    cache = { at: Date.now(), data: info };
    saveUpdateCache(CACHE_NAME, info);
    return info;
}
export async function installZapretUpdate(assetUrl, expectedVersion) {
    if (!assetUrl)
        throw new Error('Пустая ссылка на архив');
    let buf;
    try {
        const res = await fetch(assetUrl, { headers: { 'User-Agent': REQUEST_HEADERS['User-Agent'] } });
        if (!res.ok)
            throw new Error(`HTTP ${res.status}`);
        const ab = await res.arrayBuffer();
        buf = Buffer.from(ab);
    }
    catch (e) {
        throw new Error(`Не удалось скачать архив: ${e instanceof Error ? e.message : String(e)}`);
    }
    const result = await installZapretBundle(new Uint8Array(buf));
    const finalVersion = result.installedVersion ?? expectedVersion ?? undefined;
    const cfg = await getAppConfig();
    const next = {
        ...cfg.zapret,
        installedVersion: finalVersion ?? cfg.zapret?.installedVersion,
        dismissedUpdateTag: undefined
    };
    await patchAppConfig({ zapret: next });
    // Invalidate cache so a follow-up check reflects "up to date".
    cache = null;
    // Surface the persisted version in the result so the renderer can reflect
    // the new state without an extra round-trip.
    return { strategies: result.strategies, installedVersion: finalVersion };
}
export async function dismissZapretUpdate(tag) {
    if (!tag)
        return;
    const cfg = await getAppConfig();
    const next = {
        ...cfg.zapret,
        dismissedUpdateTag: tag
    };
    await patchAppConfig({ zapret: next });
    if (cache)
        cache.data.dismissed = cache.data.latest === tag;
}
