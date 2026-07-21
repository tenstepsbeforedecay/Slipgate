import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import NumberFlow from '@number-flow/react';
import BasePage from '@renderer/components/base/base-page';
import { Spinner } from '@renderer/components/ui/spinner';
import { CharacterMorph } from '@renderer/components/ui/character-morph';
import { useTgwsStore } from '@renderer/store/tgws-store';
import { useZapretStore } from '@renderer/store/zapret-store';
import { useZapretTestStore } from '@renderer/store/zapret-test-store';
import { useAppConfig } from '@renderer/hooks/use-app-config';
import { tgwsStart, tgwsStop, tgwsRestart, zapretStart, zapretStop, zapretRestart, zapretCheckUpdate, tgwsCheckUpdate, getAppVersion } from '@renderer/utils/ipc';
import { Button } from '@renderer/components/ui/button';
import { POWER_ON_BANNER_STYLE, BUNDLED_TGWS_VERSION, BUNDLED_ZAPRET_VERSION } from '@renderer/lib/utils';
import { RotateCw, Sparkles, X } from 'lucide-react';
import Power from '@renderer/assets/on_icon.svg';
import Pause from '@renderer/assets/pause_icon.svg';
const PowerToggle = ({ label, status, onToggle, version, disabled = false, disabledReason }) => {
    const { t } = useTranslation();
    const [pending, setPending] = useState(null);
    const isSelected = pending ?? status.state === 'running';
    const ipcLoading = status.state === 'starting' || status.state === 'stopping';
    const loading = ipcLoading || pending !== null;
    const loadingDirection = status.state === 'stopping' || pending === false ? 'disconnecting' : 'connecting';
    const handleClick = async () => {
        if (loading || disabled)
            return;
        const next = !isSelected;
        setPending(next);
        try {
            await onToggle(next);
        }
        finally {
            setPending(null);
        }
    };
    const [elapsed, setElapsed] = useState(0);
    useEffect(() => {
        if (!isSelected || !status.startedAt) {
            setElapsed(0);
            return;
        }
        const tick = () => setElapsed(Math.floor((Date.now() - status.startedAt) / 1000));
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [isSelected, status.startedAt]);
    const statusText = loading
        ? loadingDirection === 'connecting'
            ? t('pages.home.connecting', { defaultValue: 'ПОДКЛЮЧЕНИЕ' })
            : t('pages.home.disconnecting', { defaultValue: 'ОТКЛЮЧЕНИЕ' })
        : isSelected
            ? t('pages.home.connected', { defaultValue: 'ПОДКЛЮЧЕНО' })
            : t('pages.home.disconnected', { defaultValue: 'ОТКЛЮЧЕНО' });
    const reserveTexts = [
        t('pages.home.connecting', { defaultValue: 'ПОДКЛЮЧЕНИЕ' }),
        t('pages.home.disconnecting', { defaultValue: 'ОТКЛЮЧЕНИЕ' }),
        t('pages.home.connected', { defaultValue: 'ПОДКЛЮЧЕНО' }),
        t('pages.home.disconnected', { defaultValue: 'ОТКЛЮЧЕНО' })
    ];
    const showTimer = !loading && isSelected;
    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;
    return (_jsxs("div", { className: "flex flex-col items-center justify-center min-w-0", children: [_jsx("div", { className: "mb-1 text-sm font-medium text-foreground/80 uppercase tracking-wider", children: label }), _jsx("div", { className: "mb-3 flex h-6 items-center justify-center", children: _jsx(CharacterMorph, { texts: [statusText], reserveTexts: reserveTexts, interval: 3000, className: "h-6 leading-none text-foreground font-semibold uppercase" }) }), _jsx("button", { disabled: loading || disabled, onClick: handleClick, title: disabled ? disabledReason : undefined, className: `relative group transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed ${disabled ? 'opacity-60' : ''}`, children: _jsx("div", { className: `w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 bg-radial-[at_30%_45%] backdrop-blur-xl border-2 ${isSelected
                        ? 'from-gradient-start-power-on/60 to-gradient-end-power-on/60 border-stroke-power-on'
                        : 'from-gradient-start-power-off/60 to-gradient-end-power-off/60 border-stroke-power-off'}`, children: _jsxs("div", { className: "relative size-16", children: [_jsx(Spinner, { className: `absolute inset-0 m-auto size-16 text-[#FAFAFA] transition-all duration-300 ease-out ${loading ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}` }), _jsx("img", { src: Pause, alt: "", className: `absolute inset-0 size-16 fill-foreground transition-all duration-300 ease-out ${!loading && isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}` }), _jsx("img", { src: Power, alt: "", className: `absolute inset-0 size-16 fill-foreground transition-all duration-300 ease-out ${!loading && !isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}` })] }) }) }), _jsx("div", { className: "mt-3 h-8 flex items-center justify-center", children: _jsxs("div", { "aria-hidden": !showTimer, className: `inline-flex items-center gap-0.5 text-base font-bold text-foreground tabular-nums transition-all duration-300 ease-out ${showTimer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'}`, children: [_jsx(NumberFlow, { value: h, format: { minimumIntegerDigits: 2, useGrouping: false } }), _jsx("span", { children: ":" }), _jsx(NumberFlow, { value: m, format: { minimumIntegerDigits: 2, useGrouping: false } }), _jsx("span", { children: ":" }), _jsx(NumberFlow, { value: s, format: { minimumIntegerDigits: 2, useGrouping: false } })] }) }), version && (_jsxs("div", { className: "mt-1 text-[11px] text-foreground/60 text-center tabular-nums", children: ["v", version] })), disabled && disabledReason && (_jsx("div", { className: "mt-1 max-w-[180px] text-[11px] text-foreground/70 text-center leading-tight", children: disabledReason })), status.lastError && (_jsx("div", { className: "mt-2 text-[11px] text-stroke-power-off text-center max-w-xs truncate", children: status.lastError }))] }));
};
const UpdateNotice = ({ title, subtitle, onDetails, onDismiss }) => (_jsxs("div", { className: "relative flex items-center gap-3 rounded-lg border border-stroke bg-card/70 backdrop-blur-xl px-4 py-2.5", children: [_jsx("div", { className: "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary", children: _jsx(Sparkles, { className: "h-4 w-4" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-sm font-medium truncate text-foreground", children: title }), _jsx("div", { className: "text-xs text-muted-foreground truncate", children: subtitle })] }), _jsxs("div", { className: "flex shrink-0 items-center gap-1", children: [_jsx(Button, { size: "sm", onClick: onDetails, children: "\u041F\u043E\u0434\u0440\u043E\u0431\u043D\u0435\u0435" }), _jsx(Button, { variant: "ghost", size: "icon", className: "size-8", onClick: onDismiss, title: "\u0421\u043A\u0440\u044B\u0442\u044C", children: _jsx(X, { className: "h-3.5 w-3.5" }) })] })] }));
const Home = () => {
    const navigate = useNavigate();
    const tgws = useTgwsStore((s) => s.status);
    const zapret = useZapretStore((s) => s.status);
    // Block the Zapret toggle while the strategy tester is iterating —
    // a click here would race the lock held by zapret-tester.ts in main
    // and queue silently behind the test, which feels like a stuck button.
    const isZapretTesting = useZapretTestStore((s) => s.isRunning);
    const { appConfig } = useAppConfig();
    const zapretStrategy = appConfig?.zapret?.activeStrategy;
    // ---- Update notices (Zapret + TgWsProxy)
    const [zapretUpdate, setZapretUpdate] = useState(null);
    const [tgwsUpdate, setTgwsUpdate] = useState(null);
    const [zapretSessionDismissed, setZapretSessionDismissed] = useState(false);
    const [tgwsSessionDismissed, setTgwsSessionDismissed] = useState(false);
    useEffect(() => {
        zapretCheckUpdate(false).then(setZapretUpdate).catch(() => setZapretUpdate(null));
        tgwsCheckUpdate(false).then(setTgwsUpdate).catch(() => setTgwsUpdate(null));
    }, []);
    const showZapretBanner = !!zapretUpdate &&
        zapretUpdate.hasUpdate &&
        !zapretUpdate.dismissed &&
        !!zapretUpdate.assetUrl &&
        !zapretSessionDismissed;
    const showTgwsBanner = !!tgwsUpdate &&
        tgwsUpdate.hasUpdate &&
        !tgwsUpdate.dismissed &&
        !!tgwsUpdate.assetUrl &&
        !tgwsSessionDismissed;
    const toggleTgws = async (next) => {
        try {
            if (next)
                await tgwsStart();
            else
                await tgwsStop();
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(next ? 'Не удалось запустить Telegram' : 'Не удалось остановить Telegram', {
                description: msg
            });
        }
    };
    const toggleZapret = async (next) => {
        if (next && !zapretStrategy) {
            navigate('/zapret', { state: { autoStart: true } });
            return;
        }
        try {
            if (next)
                await zapretStart();
            else
                await zapretStop();
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toast.error(next ? 'Не удалось запустить Zapret' : 'Не удалось остановить Zapret', {
                description: msg
            });
        }
    };
    // App version pulled from main via IPC (electron's app.getVersion()
    const [appVersion, setAppVersion] = useState(null);
    useEffect(() => {
        getAppVersion().then(setAppVersion).catch(() => setAppVersion(null));
    }, []);
    const [reloading, setReloading] = useState(false);
    const handleReloadAll = async () => {
        if (reloading)
            return;
        setReloading(true);
        try {
            const tasks = [];
            if (tgws.state === 'running' || tgws.state === 'error')
                tasks.push(tgwsRestart());
            if (zapret.state === 'running' || zapret.state === 'error')
                tasks.push(zapretRestart());
            if (tasks.length === 0) {
                // Style the toast with the same red radial gradient + power-off
                // border that the big disabled power buttons use, so the visual
                // language stays consistent: red = "nothing is running".
                toast.info('Нет запущенных процессов для перезагрузки', {
                    style: {
                        background: 'radial-gradient(at 30% 45%, color-mix(in oklab, var(--gradient-start-power-off) 60%, transparent), color-mix(in oklab, var(--gradient-end-power-off) 60%, transparent))',
                        borderColor: 'var(--stroke-power-off)',
                        color: 'var(--foreground)'
                    }
                });
                return;
            }
            await Promise.allSettled(tasks);
            // Mirror the green radial-gradient look of the active power buttons so
            // the success toast reads as "everything is on" at a glance.
            toast.success('Процессы перезагружены', {
                style: POWER_ON_BANNER_STYLE
            });
        }
        catch (e) {
            toast.error('Не удалось перезагрузить процессы', {
                description: e instanceof Error ? e.message : String(e)
            });
        }
        finally {
            setReloading(false);
        }
    };
    return (_jsx(BasePage, { children: _jsxs("div", { className: "relative flex flex-col h-full", children: [(showZapretBanner || showTgwsBanner) && (_jsxs("div", { className: "px-4 pt-2 space-y-2", children: [showZapretBanner && zapretUpdate && (_jsx(UpdateNotice, { title: `Доступно обновление Zapret — v${zapretUpdate.latest}`, subtitle: `Текущая версия: v${zapretUpdate.installed ?? '?'}`, onDetails: () => navigate('/zapret'), onDismiss: () => setZapretSessionDismissed(true) })), showTgwsBanner && tgwsUpdate && (_jsx(UpdateNotice, { title: `Доступно обновление TgWsProxy — v${tgwsUpdate.latest}`, subtitle: `Текущая версия: v${tgwsUpdate.installed ?? '?'}`, onDetails: () => navigate('/telegram'), onDismiss: () => setTgwsSessionDismissed(true) }))] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 px-4 flex-1 items-center", children: [_jsx(PowerToggle, { label: "Telegram", status: tgws, onToggle: toggleTgws, version: appConfig?.tgws?.installedVersion ?? tgwsUpdate?.installed ?? BUNDLED_TGWS_VERSION }), _jsx(PowerToggle, { label: "Zapret", status: zapret, onToggle: toggleZapret, version: appConfig?.zapret?.installedVersion ?? zapretUpdate?.installed ?? BUNDLED_ZAPRET_VERSION, disabled: isZapretTesting, disabledReason: isZapretTesting
                                ? 'Идёт тестирование стратегий — переключатель заблокирован'
                                : undefined })] }), _jsx("div", { className: "flex justify-center pt-8 pb-8", children: _jsxs(Button, { variant: "outline", size: "sm", onClick: handleReloadAll, disabled: reloading, title: "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u044B", children: [_jsx(RotateCw, { className: `size-4 mr-1 ${reloading ? 'animate-spin' : ''}` }), "\u041F\u0435\u0440\u0435\u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044C \u043F\u0440\u043E\u0446\u0435\u0441\u0441\u044B"] }) }), appVersion && (_jsxs("div", { className: "pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground/70 select-none", children: ["\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F \u043F\u0440\u0438\u043B\u043E\u0436\u0435\u043D\u0438\u044F ", _jsxs("span", { className: "font-mono", children: ["v", appVersion] })] }))] }) }));
};
export default Home;
