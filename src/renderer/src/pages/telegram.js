import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useTgwsStore } from '@renderer/store/tgws-store';
import { tgwsGetLink, tgwsStart, tgwsStop, tgwsRestart, writeClipboard, openTelegramLink, tgwsCheckUpdate, tgwsInstallUpdate, tgwsDismissUpdate } from '@renderer/utils/ipc';
import { useAppConfig } from '@renderer/hooks/use-app-config';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Copy, ExternalLink, MoreVertical, Download, Loader2, Sparkles } from 'lucide-react';
import TelegramIcon from '@renderer/components/telegram-icon';
import ReloadTgwsIcon from '@renderer/components/reload-tgws-icon';
import BasePage from '@renderer/components/base/base-page';
import SwitcherCard from '@renderer/components/switcher-card';
import { cn, POWER_ON_BANNER_STYLE, BUNDLED_TGWS_VERSION } from '@renderer/lib/utils';
// Re-export the shared banner style under the legacy name so the
// existing toast.success({ style: POWER_ON_TOAST_STYLE }) call sites
// don't need touching. Source of truth lives in lib/utils.ts.
const POWER_ON_TOAST_STYLE = POWER_ON_BANNER_STYLE;
function generateTgwsSecret() {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
const TelegramPage = () => {
    const status = useTgwsStore((s) => s.status);
    const { appConfig, patchAppConfig } = useAppConfig();
    const [link, setLink] = useState('');
    const tgws = appConfig?.tgws;
    useEffect(() => {
        tgwsGetLink().then(setLink).catch(() => setLink(''));
    }, [tgws?.host, tgws?.port, tgws?.secret, status.state]);
    const running = status.state === 'running';
    // ---- Auto-update banner
    const [updateInfo, setUpdateInfo] = useState(null);
    const [installing, setInstalling] = useState(false);
    const installingRef = useRef(false);
    useEffect(() => {
        tgwsCheckUpdate(false).then(setUpdateInfo).catch(() => setUpdateInfo(null));
    }, []);
    const showBanner = !!updateInfo && updateInfo.hasUpdate && !updateInfo.dismissed && !!updateInfo.assetUrl;
    const installUpdate = async () => {
        if (installingRef.current || !updateInfo?.assetUrl)
            return;
        installingRef.current = true;
        setInstalling(true);
        const tId = toast.loading('Скачиваем TgWsProxy…', {
            description: updateInfo.assetName ?? `v${updateInfo.latest}`
        });
        try {
            const res = await tgwsInstallUpdate(updateInfo.assetUrl, updateInfo.latest);
            const mb = (res.sizeBytes / (1024 * 1024)).toFixed(1);
            toast.success('TgWsProxy обновлён', {
                id: tId,
                description: `Версия ${res.installedVersion ?? updateInfo.latest} — ${mb} МБ`,
                // Same vivid power-on green as the other success toasts (copy-link,
                // regenerate-key, processes-reloaded) and the active home-page
                // power-on disc, so success feedback across the app is one colour.
                style: POWER_ON_TOAST_STYLE
            });
            // Re-check so the banner disappears immediately.
            const fresh = await tgwsCheckUpdate(true).catch(() => null);
            setUpdateInfo(fresh);
            // If the proxy was running we already stopped it server-side to free
            // the .exe write lock; restart it so the user doesn't have to.
            if (running) {
                try {
                    await tgwsStart();
                }
                catch { /* user can retry from the toggle */ }
            }
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error('Не удалось обновить TgWsProxy', { id: tId, description: msg });
        }
        finally {
            setInstalling(false);
            installingRef.current = false;
        }
    };
    const dismissUpdate = () => {
        if (!updateInfo?.latest)
            return;
        void tgwsDismissUpdate(updateInfo.latest).catch(() => void 0);
        setUpdateInfo({ ...updateInfo, dismissed: true });
    };
    const regeneratingRef = useRef(false);
    const [regenerating, setRegenerating] = useState(false);
    const handleRegenerateLink = async () => {
        if (regeneratingRef.current || !tgws)
            return;
        regeneratingRef.current = true;
        setRegenerating(true);
        try {
            const newSecret = generateTgwsSecret();
            await patchAppConfig({ tgws: { ...tgws, secret: newSecret } });
            try {
                const updated = await tgwsGetLink();
                setLink(updated);
            }
            catch {
                setLink('');
            }
            if (running) {
                await tgwsRestart().catch(() => void 0);
            }
            toast.success('Ключ и ссылка изменены', { style: POWER_ON_TOAST_STYLE });
        }
        finally {
            setRegenerating(false);
            regeneratingRef.current = false;
        }
    };
    return (_jsx(BasePage, { title: "Telegram", children: _jsxs("div", { className: "px-4 pb-6 space-y-4", children: [showBanner && updateInfo && (_jsxs("div", { className: cn('relative flex items-center gap-3 rounded-lg border border-stroke bg-card/70 backdrop-blur-xl px-4 py-3 transition', installing && 'pointer-events-none opacity-80'), children: [_jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary", children: installing
                                ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" })
                                : _jsx(Sparkles, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium text-foreground", children: installing
                                        ? 'Устанавливаем TgWsProxy…'
                                        : `Доступно обновление TgWsProxy — v${updateInfo.latest}` }), _jsx("div", { className: "text-xs text-muted-foreground truncate", children: installing
                                        ? 'Останавливаем прокси, перезаписываем бинарник…'
                                        : `Текущая версия: v${updateInfo.installed ?? '?'}` })] }), !installing && (_jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: dismissUpdate, children: "\u041F\u043E\u0437\u0436\u0435" }), _jsxs(Button, { size: "sm", onClick: () => { void installUpdate(); }, children: [_jsx(Download, { className: "h-3.5 w-3.5" }), "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C"] })] }))] })), _jsx(SwitcherCard, { icon: TelegramIcon, title: "Telegram", subtitle: `${tgws?.host ?? '127.0.0.1'}:${tgws?.port ?? 1443}`, version: tgws?.installedVersion ?? updateInfo?.installed ?? BUNDLED_TGWS_VERSION, status: status, onToggle: (v) => (v ? tgwsStart() : tgwsStop()).catch(() => void 0), footer: running ? null : 'Нажмите для запуска' }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435" }) }), _jsxs(CardContent, { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Input, { readOnly: true, value: link, className: "font-mono text-xs" }), _jsx(Button, { size: "icon-sm", variant: "outline", onClick: async () => {
                                                if (!link)
                                                    return;
                                                await writeClipboard(link);
                                                toast.success('Ссылка скопирована', { style: POWER_ON_TOAST_STYLE });
                                            }, title: "\u041A\u043E\u043F\u0438\u0440\u043E\u0432\u0430\u0442\u044C \u0441\u0441\u044B\u043B\u043A\u0443", children: _jsx(Copy, { className: "size-4" }) }), _jsx(Button, { size: "icon-sm", variant: "outline", onClick: () => link && openTelegramLink(link).catch(() => void 0), title: "\u041E\u0442\u043A\u0440\u044B\u0442\u044C \u0432 Telegram", children: _jsx(ExternalLink, { className: "size-4" }) }), _jsx(Button, { size: "icon-sm", variant: "outline", onClick: handleRegenerateLink, disabled: regenerating, title: "\u0421\u043C\u0435\u043D\u0438\u0442\u044C \u043A\u043B\u044E\u0447 \u0438 \u0441\u0441\u044B\u043B\u043A\u0443", children: regenerating
                                                ? _jsx(Loader2, { className: "size-4 animate-spin" })
                                                : _jsx(ReloadTgwsIcon, { className: "size-4" }) })] }), _jsxs("p", { className: "text-xs text-muted-foreground inline-flex flex-wrap items-center gap-x-1 gap-y-0.5", children: ["\u0412\u0441\u0442\u0430\u0432\u044C\u0442\u0435 \u0441\u0441\u044B\u043B\u043A\u0443 \u0432 Telegram", _jsx("span", { className: "opacity-70", children: "\u2192" }), "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", _jsx("span", { className: "opacity-70", children: "\u2192" }), "\u041F\u0440\u043E\u0434\u0432\u0438\u043D\u0443\u0442\u044B\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438", _jsx("span", { className: "opacity-70", children: "\u2192" }), "\u0422\u0438\u043F \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F", _jsx("span", { className: "opacity-70", children: "\u2192" }), _jsx(MoreVertical, { className: "size-3.5 translate-y-px -mx-1.5" }), _jsx("span", { children: "\u0438\u043B\u0438 \u043D\u0430\u0436\u043C\u0438\u0442\u0435 \u043D\u0430" }), _jsx(ExternalLink, { className: "size-3.5 translate-y-px" }), _jsx("span", { children: "\u0434\u043B\u044F \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u043E\u0433\u043E \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u044F." })] })] })] }), _jsxs(Card, { children: [_jsx(CardHeader, { children: _jsx(CardTitle, { children: "\u041F\u0430\u0440\u0430\u043C\u0435\u0442\u0440\u044B" }) }), _jsxs(CardContent, { className: "grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4", children: [_jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "\u0425\u043E\u0441\u0442" }), _jsx(Input, { value: tgws?.host ?? '', onChange: (e) => patchAppConfig({ tgws: { ...tgws, host: e.target.value } }), placeholder: "127.0.0.1" })] }), _jsxs("div", { className: "space-y-1.5", children: [_jsx(Label, { children: "\u041F\u043E\u0440\u0442" }), _jsx(Input, { type: "number", value: tgws?.port ?? 1443, onChange: (e) => patchAppConfig({ tgws: { ...tgws, port: Number(e.target.value) || 1443 } }) })] }), _jsxs("div", { className: "md:col-span-2 space-y-1.5", children: [_jsx(Label, { children: "\u0421\u0435\u043A\u0440\u0435\u0442\u043D\u044B\u0439 \u043A\u043B\u044E\u0447 (32-hex MTProto)" }), _jsx(Input, { value: tgws?.secret ?? '', onChange: (e) => patchAppConfig({ tgws: { ...tgws, secret: e.target.value.trim() } }), className: "font-mono text-xs" })] })] })] }), status.lastError && (_jsx(Card, { className: "border-red-500/50", children: _jsx(CardContent, { className: "pt-4", children: _jsx("p", { className: "text-sm text-red-500", children: status.lastError }) }) }))] }) }));
};
export default TelegramPage;
