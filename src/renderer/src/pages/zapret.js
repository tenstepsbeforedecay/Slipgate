import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Download, Loader2, Sparkles, FlaskConical, CheckCircle2, XCircle } from 'lucide-react';
import { useZapretStore } from '@renderer/store/zapret-store';
import { useZapretTestStore } from '@renderer/store/zapret-test-store';
import { zapretListStrategies, zapretStart, zapretStop, zapretCheckUpdate, zapretInstallUpdate, zapretDismissUpdate, zapretRunStrategyTest } from '@renderer/utils/ipc';
import { useAppConfig } from '@renderer/hooks/use-app-config';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import ZapretIcon from '@renderer/components/zapret-icon';
import { cn, BUNDLED_ZAPRET_VERSION, POWER_ON_BANNER_STYLE, POWER_OFF_BANNER_STYLE } from '@renderer/lib/utils';
import BasePage from '@renderer/components/base/base-page';
import SwitcherCard from '@renderer/components/switcher-card';
import ZapretIpListCard from '@renderer/components/zapret-iplist-card';
import ZapretServiceSettingsCard from '@renderer/components/zapret-service-settings-card';
const Zapret = () => {
    const status = useZapretStore((s) => s.status);
    const { appConfig, patchAppConfig } = useAppConfig();
    const [strategies, setStrategies] = useState([]);
    const zapret = appConfig?.zapret;
    const active = zapret?.activeStrategy;
    const location = useLocation();
    const navigate = useNavigate();
    const autoStartRef = useRef(Boolean(location.state?.autoStart));
    // ---- Auto-update banner
    const [updateInfo, setUpdateInfo] = useState(null);
    const [installing, setInstalling] = useState(false);
    const installingRef = useRef(false);
    // ---- Strategy test
    const testProgress = useZapretTestStore((s) => s.progress);
    const testReport = useZapretTestStore((s) => s.report);
    const isTestRunning = useZapretTestStore((s) => s.isRunning);
    const autoTestStartedRef = useRef(false);
    const refreshStrategies = () => {
        zapretListStrategies().then(setStrategies).catch(() => setStrategies([]));
    };
    const runCheckUpdate = async (force = false) => {
        // Don't await; banner just stays hidden if the API call fails (rate-
        // limit, offline, etc.) — surfacing a network error here would be
        // noise for users who never asked to check.
        const info = await zapretCheckUpdate(force).catch(() => null);
        setUpdateInfo(info);
        // Manual trigger (the "Проверить сейчас" button) — give explicit
        // feedback either way, since silence would look broken when the
        // user just pressed a button.
        if (force) {
            if (!info) {
                toast.error('Не удалось проверить обновления Zapret');
            }
            else if (info.hasUpdate) {
                toast.info(`Доступна новая версия Zapret — v${info.latest}`);
            }
            else {
                toast.success('У вас последняя версия Zapret');
            }
        }
    };
    const startTest = () => {
        if (useZapretTestStore.getState().isRunning)
            return;
        // Optimistically flip isRunning so the UI dims immediately — the
        // first 'starting' IPC tick will arrive within ~100ms and reconcile.
        useZapretTestStore.getState().set({
            isRunning: true,
            progress: { phase: 'starting' }
        });
        zapretRunStrategyTest().catch((e) => {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error('Тест стратегий не выполнен', { description: msg });
            useZapretTestStore.getState().set({
                isRunning: false,
                progress: { phase: 'error', message: msg }
            });
        });
    };
    useEffect(() => {
        refreshStrategies();
        if (zapret?.autoUpdateCheck !== false) {
            void runCheckUpdate(false);
        }
        const t = setTimeout(() => {
            if (autoTestStartedRef.current)
                return;
            const s = useZapretTestStore.getState();
            if (s.report || s.isRunning)
                return;
            autoTestStartedRef.current = true;
            zapretListStrategies()
                .then((list) => {
                if (list.length > 0)
                    startTest();
            })
                .catch(() => void 0);
        }, 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const showBanner = !!updateInfo && updateInfo.hasUpdate && !updateInfo.dismissed && !!updateInfo.assetUrl;
    const installUpdate = async () => {
        if (installingRef.current || !updateInfo?.assetUrl)
            return;
        installingRef.current = true;
        setInstalling(true);
        const tId = toast.loading('Скачиваем сборку Zapret…', {
            description: updateInfo.assetName ?? `v${updateInfo.latest}`
        });
        try {
            const res = await zapretInstallUpdate(updateInfo.assetUrl, updateInfo.latest);
            toast.success('Zapret обновлён', {
                id: tId,
                description: `Версия ${res.installedVersion ?? updateInfo.latest} — стратегий: ${res.strategies}`,
                // Same vivid power-on green as the other success toasts (copy-link,
                // regenerate-key, processes-reloaded) and the active home-page
                // power-on disc, so success feedback across the app is one colour.
                style: POWER_ON_BANNER_STYLE
            });
            // If the active strategy no longer exists in the new bundle, drop it
            // so the user is forced to pick a fresh one before next start.
            refreshStrategies();
            if (zapret && active) {
                const fresh = await zapretListStrategies().catch(() => []);
                if (!fresh.some((s) => s.file === active)) {
                    await patchAppConfig({ zapret: { ...zapret, activeStrategy: undefined } });
                }
            }
            // Re-check so the banner disappears immediately.
            const fresh = await zapretCheckUpdate(true).catch(() => null);
            setUpdateInfo(fresh);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error('Не удалось обновить Zapret', { id: tId, description: msg });
        }
        finally {
            setInstalling(false);
            installingRef.current = false;
        }
    };
    const dismissUpdate = () => {
        if (!updateInfo?.latest)
            return;
        void zapretDismissUpdate(updateInfo.latest).catch(() => void 0);
        setUpdateInfo({ ...updateInfo, dismissed: true });
    };
    const pickStrategy = async (file) => {
        // Defensive: if the user manages to click a disabled strategy via
        // keyboard or a stale render, drop the request silently.
        const r = testReport?.results[file];
        if (r && r.tested && !r.passed)
            return;
        if (isTestRunning)
            return;
        await patchAppConfig({ zapret: { ...zapret, activeStrategy: file } });
        if (!autoStartRef.current)
            return;
        // One-shot: drop the flag so re-clicking another strategy on this page
        // doesn't keep auto-starting and ping-ponging back to Home.
        autoStartRef.current = false;
        try {
            await zapretStart();
            navigate('/home');
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error('Не удалось запустить Zapret', { description: msg });
        }
    };
    return (_jsx(BasePage, { title: "Zapret", children: _jsxs("div", { className: "px-4 pb-6 space-y-4", children: [showBanner && updateInfo && (_jsxs("div", { className: cn('relative flex items-center gap-3 rounded-lg border border-stroke bg-card/70 backdrop-blur-xl px-4 py-3 transition', installing && 'pointer-events-none opacity-80'), children: [_jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary", children: installing
                                ? _jsx(Loader2, { className: "h-4 w-4 animate-spin" })
                                : _jsx(Sparkles, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium text-foreground", children: installing
                                        ? 'Устанавливаем Zapret…'
                                        : `Доступно обновление Zapret — v${updateInfo.latest}` }), _jsx("div", { className: "text-xs text-muted-foreground truncate", children: installing
                                        ? 'Останавливаем winws.exe, распаковываем архив…'
                                        : `Текущая версия: v${updateInfo.installed ?? '?'}` })] }), !installing && (_jsxs("div", { className: "flex shrink-0 items-center gap-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: dismissUpdate, children: "\u041F\u043E\u0437\u0436\u0435" }), _jsxs(Button, { size: "sm", onClick: () => { void installUpdate(); }, children: [_jsx(Download, { className: "h-3.5 w-3.5" }), "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C"] })] }))] })), _jsx(SwitcherCard, { icon: ZapretIcon, title: "\u041E\u0431\u0445\u043E\u0434 DPI (Zapret)", subtitle: active ?? 'Выберите стратегию ниже', version: zapret?.installedVersion ?? updateInfo?.installed ?? BUNDLED_ZAPRET_VERSION, status: status, disabled: isTestRunning, onToggle: (v) => {
                        if (v && !active)
                            return;
                        if (isTestRunning)
                            return;
                        // Return the promise so SwitcherCard awaits the IPC roundtrip and
                        // keeps the switch optimistically flipped/locked until done.
                        return (v ? zapretStart() : zapretStop()).catch(() => void 0);
                    }, footer: isTestRunning
                        ? 'Идёт тестирование стратегий — переключатель временно недоступен'
                        : active
                            ? null
                            : 'Нужна стратегия' }), _jsx(ZapretIpListCard, { disabled: isTestRunning || status.state === 'starting' || status.state === 'stopping', disabledReason: isTestRunning
                        ? 'Идёт тестирование стратегий — управление списком временно недоступно'
                        : 'Подождите завершения переключения Zapret' }), _jsx(ZapretServiceSettingsCard, { disabled: isTestRunning || status.state === 'starting' || status.state === 'stopping', disabledReason: isTestRunning
                        ? 'Идёт тестирование стратегий — настройки временно недоступны'
                        : 'Подождите завершения переключения Zapret', autoUpdateCheck: zapret?.autoUpdateCheck !== false, onAutoUpdateCheckChange: (v) => {
                        if (!zapret)
                            return;
                        void patchAppConfig({ zapret: { ...zapret, autoUpdateCheck: v } });
                    }, onManualCheckUpdate: () => runCheckUpdate(true) }), _jsxs(Card, { children: [_jsx(CardHeader, { className: cn('flex flex-row items-center justify-between gap-3 space-y-0', isTestRunning && 'flex-col items-stretch gap-3 sm:flex-row sm:items-center'), children: isTestRunning ? (
                            // Inline progress bar replacing the title row during testing.
                            _jsxs("div", { className: "flex flex-1 min-w-0 items-center gap-3", children: [_jsx(Loader2, { className: "h-4 w-4 shrink-0 animate-spin text-primary" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium leading-tight", children: "\u0418\u0434\u0451\u0442 \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u0435 \u0441\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0439 \u043F\u043E\u0434 \u0432\u0430\u0441. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430 \u043F\u043E\u0434\u043E\u0436\u0434\u0438\u0442\u0435..." }), _jsxs("div", { className: "text-xs text-muted-foreground mt-0.5", children: ["\u041F\u043E\u0441\u043B\u0435 \u0437\u0430\u0432\u0435\u0440\u0448\u0435\u043D\u0438\u044F \u0442\u0435\u0441\u0442\u0438\u0440\u043E\u0432\u0430\u043D\u0438\u044F \u043F\u0440\u0438\u0434\u0451\u0442 \u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u0435 \u0432 \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u0438.", testProgress && testProgress.total ? (_jsxs(_Fragment, { children: [' ', "\u0421\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u044F", ' ', _jsxs("span", { className: "font-mono", children: [testProgress.current ?? 0, "/", testProgress.total] }), testProgress.strategy ? (_jsxs(_Fragment, { children: [' — ', _jsx("span", { className: "font-mono", children: testProgress.strategy })] })) : null] })) : null] })] })] })) : (_jsxs(_Fragment, { children: [_jsxs(CardTitle, { className: "flex items-center gap-2", children: ["\u0421\u0442\u0440\u0430\u0442\u0435\u0433\u0438\u0438", testReport ? (_jsxs("span", { className: "text-xs font-normal text-muted-foreground", children: [Object.values(testReport.results).filter((r) => r.passed).length, ' / ', Object.keys(testReport.results).length, " \u0440\u0430\u0431\u043E\u0447\u0438\u0445"] })) : null] }), _jsxs(Button, { variant: "outline", size: "sm", onClick: startTest, disabled: strategies.length === 0, className: "shrink-0", children: [_jsx(FlaskConical, { className: "h-3.5 w-3.5" }), testReport ? 'Перетестировать' : 'Запустить тест'] })] })) }), _jsxs(CardContent, { className: "space-y-2", children: [strategies.length === 0 && (_jsxs("p", { className: "text-sm text-muted-foreground", children: ["\u0421\u0431\u043E\u0440\u043A\u0430 Zapret \u043D\u0435 \u043D\u0430\u0439\u0434\u0435\u043D\u0430. \u0421\u043A\u043E\u043F\u0438\u0440\u0443\u0439\u0442\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435", ' ', _jsx("code", { className: "text-xs", children: "Flowseal/zapret-discord-youtube" }), " \u0432", ' ', _jsx("code", { className: "text-xs", children: "%APPDATA%\\slipgate\\runtime\\zapret" }), " \u0438\u043B\u0438 \u0432\u0441\u0442\u0440\u043E\u0435\u043D\u043D\u0443\u044E \u043F\u0430\u043F\u043A\u0443", ' ', _jsx("code", { className: "text-xs", children: "resources\\zapret" }), "."] })), strategies.map((s) => {
                                    const result = testReport?.results[s.file];
                                    // tested && !passed → strategy is dead on this user's network
                                    const isFailed = !!result && result.tested && !result.passed;
                                    const isPassed = !!result && result.tested && result.passed;
                                    const isBest = testReport?.bestStrategy === s.file;
                                    const disabled = isFailed || isTestRunning;
                                    return (_jsx("button", { onClick: () => { void pickStrategy(s.file); }, disabled: disabled, "aria-disabled": disabled, title: isFailed
                                            ? `Не прошла тест (${result?.okCount ?? 0}/${result?.totalCount ?? 0} целей доступны). Нажмите «Перетестировать», чтобы повторить проверку.`
                                            : isTestRunning
                                                ? 'Тестирование стратегий — подождите окончания.'
                                                : undefined, className: cn('group relative w-full text-left p-3 rounded-md border transition', active === s.file
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border hover:bg-accent/30', disabled && 'opacity-40 grayscale cursor-not-allowed pointer-events-none hover:bg-transparent'), children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "font-medium text-sm flex items-center gap-2", children: [_jsx("span", { className: "truncate", children: s.title }), isBest && (_jsx("span", { className: "shrink-0 text-[10px] uppercase tracking-wide font-semibold rounded px-1.5 py-0.5 bg-primary/20 text-primary", children: "\u043B\u0443\u0447\u0448\u0430\u044F" }))] }), s.description && (_jsx("div", { className: "text-xs text-muted-foreground mt-0.5", children: s.description }))] }), isFailed ? (_jsxs("span", { className: "shrink-0 inline-flex items-center gap-1 text-[11px] text-red-400", children: [_jsx(XCircle, { className: "h-3.5 w-3.5" }), result?.okCount ?? 0, "/", result?.totalCount ?? 0] })) : isPassed ? (_jsxs("span", { className: "shrink-0 inline-flex items-center gap-1 text-[11px] text-emerald-400", children: [_jsx(CheckCircle2, { className: "h-3.5 w-3.5" }), result?.okCount ?? 0, "/", result?.totalCount ?? 0] })) : null] }) }, s.file));
                                })] })] }), status.lastError && (_jsx(Card, { className: "border", style: POWER_OFF_BANNER_STYLE, children: _jsx(CardContent, { className: "pt-4", children: _jsx("p", { className: "text-sm", children: status.lastError }) }) }))] }) }));
};
export default Zapret;
