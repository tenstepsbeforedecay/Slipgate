import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, Gamepad2, Loader2, RefreshCw, Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Switch } from '@renderer/components/ui/switch';
import { cn, POWER_ON_BANNER_STYLE } from '@renderer/lib/utils';
import { zapretGetGameFilter, zapretSetGameFilter, zapretGetIpsetFilter, zapretSetIpsetFilter, zapretUpdateIpsetList } from '@renderer/utils/ipc';
const GAME_FILTER_OPTIONS = [
    { value: 'off', label: 'Выкл', title: 'Не расширять диапазон портов 1024-65535' },
    { value: 'all', label: 'TCP + UDP', title: 'Расширить фильтр на TCP и UDP порты 1024-65535' },
    { value: 'tcp', label: 'TCP', title: 'Расширить фильтр только на TCP порты 1024-65535' },
    { value: 'udp', label: 'UDP', title: 'Расширить фильтр только на UDP порты 1024-65535 (голос в играх/Discord)' }
];
const IPSET_FILTER_OPTIONS = [
    { value: 'loaded', label: 'Список', title: 'Фильтр применяется только к загруженным IP из списка' },
    { value: 'none', label: 'Выкл', title: 'Фильтр не применяется — как будто список пуст из заглушки' },
    { value: 'any', label: 'Все IP', title: 'Фильтр применяется ко всем IP без ограничений (самый широкий режим)' }
];
const ZapretServiceSettingsCard = ({ disabled = false, disabledReason, autoUpdateCheck, onAutoUpdateCheckChange, onManualCheckUpdate }) => {
    const [open, setOpen] = useState(false);
    const [gameFilter, setGameFilterState] = useState(null);
    const [ipset, setIpset] = useState(null);
    const [busyGame, setBusyGame] = useState(false);
    const [busyIpset, setBusyIpset] = useState(null);
    const [checkingUpdate, setCheckingUpdate] = useState(false);
    const loadedRef = useRef(false);
    const refresh = async () => {
        try {
            const [gf, ip] = await Promise.all([zapretGetGameFilter(), zapretGetIpsetFilter()]);
            setGameFilterState(gf);
            setIpset(ip);
        }
        catch {
            setGameFilterState(null);
            setIpset(null);
        }
    };
    useEffect(() => {
        if (loadedRef.current)
            return;
        loadedRef.current = true;
        void refresh();
    }, []);
    const pickGameFilter = async (mode) => {
        if (busyGame || mode === gameFilter)
            return;
        setBusyGame(true);
        try {
            const next = await zapretSetGameFilter(mode);
            setGameFilterState(next);
            toast.success('Game Filter обновлён', {
                description: 'Изменения применятся после перезапуска Zapret',
                style: POWER_ON_BANNER_STYLE
            });
        }
        catch (e) {
            toast.error('Не удалось изменить Game Filter', {
                description: e instanceof Error ? e.message : String(e)
            });
        }
        finally {
            setBusyGame(false);
        }
    };
    const pickIpsetFilter = async (mode) => {
        if (busyIpset || mode === ipset?.mode)
            return;
        setBusyIpset(mode);
        try {
            const next = await zapretSetIpsetFilter(mode);
            setIpset(next);
            toast.success('IPset Filter обновлён', {
                description: 'Изменения применятся после перезапуска Zapret',
                style: POWER_ON_BANNER_STYLE
            });
        }
        catch (e) {
            toast.error('Не удалось изменить IPset Filter', {
                description: e instanceof Error ? e.message : String(e)
            });
        }
        finally {
            setBusyIpset(null);
        }
    };
    const updateList = async () => {
        if (busyIpset)
            return;
        setBusyIpset('update');
        const tId = toast.loading('Скачиваем ipset-список…');
        try {
            const next = await zapretUpdateIpsetList();
            setIpset(next);
            toast.success(`Список обновлён — ${next.lines} записей`, { id: tId, style: POWER_ON_BANNER_STYLE });
        }
        catch (e) {
            toast.error('Не удалось обновить ipset-список', {
                id: tId,
                description: e instanceof Error ? e.message : String(e)
            });
        }
        finally {
            setBusyIpset(null);
        }
    };
    const runManualCheck = async () => {
        if (checkingUpdate)
            return;
        setCheckingUpdate(true);
        try {
            await onManualCheckUpdate();
        }
        finally {
            setCheckingUpdate(false);
        }
    };
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between gap-3 space-y-0", children: [_jsx("div", { className: "min-w-0 flex-1", children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(Settings2, { className: "h-4 w-4 text-muted-foreground" }), "\u041D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 Zapret"] }) }), _jsx(Button, { variant: open ? 'secondary' : 'outline', size: "sm", disabled: disabled, title: disabled ? disabledReason : undefined, onClick: () => setOpen((v) => !v), className: "shrink-0", children: open
                            ? _jsxs(_Fragment, { children: [_jsx(ChevronDown, { className: "h-3.5 w-3.5" }), " \u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C"] })
                            : _jsxs(_Fragment, { children: [_jsx(ChevronRight, { className: "h-3.5 w-3.5" }), " \u041E\u0442\u043A\u0440\u044B\u0442\u044C"] }) })] }), open && (_jsxs(CardContent, { className: "space-y-5 pt-0", children: [_jsxs("div", { children: [_jsxs("div", { className: "mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground", children: [_jsx(Gamepad2, { className: "h-3.5 w-3.5" }), "Game Filter"] }), _jsx("p", { className: "mb-2 text-xs text-muted-foreground", children: "\u0420\u0430\u0441\u0448\u0438\u0440\u044F\u0435\u0442 \u0444\u0438\u043B\u044C\u0442\u0440\u0430\u0446\u0438\u044E \u043D\u0430 \u043F\u043E\u0440\u0442\u044B 1024-65535 \u2014 \u043F\u043E\u043C\u043E\u0433\u0430\u0435\u0442 \u0441 \u0438\u0433\u0440\u0430\u043C\u0438 \u0438 \u0433\u043E\u043B\u043E\u0441\u043E\u043C \u0432 Discord, \u043A\u043E\u0442\u043E\u0440\u044B\u0435 \u0438\u0441\u043F\u043E\u043B\u044C\u0437\u0443\u044E\u0442 \u0441\u043B\u0443\u0447\u0430\u0439\u043D\u044B\u0435 \u043F\u043E\u0440\u0442\u044B." }), gameFilter === null ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0443." })) : (_jsx("div", { className: "flex flex-wrap gap-1.5", children: GAME_FILTER_OPTIONS.map((opt) => {
                                    const active = gameFilter === opt.value;
                                    return (_jsx("button", { onClick: () => { void pickGameFilter(opt.value); }, disabled: disabled || busyGame, title: opt.title, className: cn('rounded-md border px-2.5 py-1 text-xs font-medium transition', active ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-accent/30 text-muted-foreground', (disabled || busyGame) && 'pointer-events-none opacity-50'), children: busyGame && active ? _jsx(Loader2, { className: "h-3 w-3 animate-spin inline" }) : opt.label }, opt.value));
                                }) }))] }), _jsxs("div", { children: [_jsxs("div", { className: "mb-2 text-xs uppercase tracking-wide text-muted-foreground", children: ["IPset Filter", ipset && (_jsxs("span", { className: "ml-1.5 normal-case font-normal", children: ["(", ipset.lines, " IP \u0432 \u0441\u043F\u0438\u0441\u043A\u0435)"] }))] }), _jsx("p", { className: "mb-2 text-xs text-muted-foreground", children: "\u041E\u043F\u0440\u0435\u0434\u0435\u043B\u044F\u0435\u0442, \u043A \u043A\u0430\u043A\u0438\u043C IP \u043F\u0440\u0438\u043C\u0435\u043D\u044F\u0435\u0442\u0441\u044F game-\u0444\u0438\u043B\u044C\u0442\u0440: \u0442\u043E\u043B\u044C\u043A\u043E \u043A \u0441\u043F\u0438\u0441\u043A\u0443 \u043D\u0438\u0436\u0435, \u043D\u0438 \u043A \u043E\u0434\u043D\u043E\u043C\u0443, \u0438\u043B\u0438 \u043A\u043E \u0432\u0441\u0435\u043C." }), ipset === null ? (_jsx("p", { className: "text-sm text-muted-foreground", children: "\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C lists/ipset-all.txt." })) : (_jsxs("div", { className: "flex flex-wrap items-center gap-1.5", children: [IPSET_FILTER_OPTIONS.map((opt) => {
                                        const active = ipset.mode === opt.value;
                                        const busy = busyIpset === opt.value;
                                        return (_jsx("button", { onClick: () => { void pickIpsetFilter(opt.value); }, disabled: disabled || !!busyIpset || (opt.value === 'loaded' && !ipset.hasBackup && ipset.mode !== 'loaded'), title: opt.value === 'loaded' && !ipset.hasBackup && ipset.mode !== 'loaded'
                                                ? 'Сначала загрузите список кнопкой «Обновить список»'
                                                : opt.title, className: cn('rounded-md border px-2.5 py-1 text-xs font-medium transition', active ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-accent/30 text-muted-foreground', (disabled || !!busyIpset) && 'pointer-events-none opacity-50'), children: busy ? _jsx(Loader2, { className: "h-3 w-3 animate-spin inline" }) : opt.label }, opt.value));
                                    }), _jsxs(Button, { size: "sm", variant: "ghost", onClick: () => { void updateList(); }, disabled: disabled || !!busyIpset, className: "ml-1", title: "\u0421\u043A\u0430\u0447\u0430\u0442\u044C \u0441\u0432\u0435\u0436\u0438\u0439 ipset-\u0441\u043F\u0438\u0441\u043E\u043A \u0443 Flowseal \u0438 \u0441\u0434\u0435\u043B\u0430\u0442\u044C \u0435\u0433\u043E \u0430\u043A\u0442\u0438\u0432\u043D\u044B\u043C", children: [busyIpset === 'update' ? _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : _jsx(RefreshCw, { className: "h-3.5 w-3.5" }), "\u041E\u0431\u043D\u043E\u0432\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A"] })] }))] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs uppercase tracking-wide text-muted-foreground", children: "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430 \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0439 Zapret" }), _jsxs("div", { className: "flex items-center justify-between gap-3 rounded-md border border-border p-2.5", children: [_jsxs("div", { className: "min-w-0", children: [_jsx("div", { className: "text-sm font-medium", children: "\u041F\u0440\u043E\u0432\u0435\u0440\u044F\u0442\u044C \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438" }), _jsx("div", { className: "text-xs text-muted-foreground", children: "\u041F\u0440\u0438 \u043E\u0442\u043A\u0440\u044B\u0442\u0438\u0438 \u044D\u0442\u043E\u0439 \u0441\u0442\u0440\u0430\u043D\u0438\u0446\u044B Slipgate \u0441\u0430\u043C \u043F\u0440\u043E\u0432\u0435\u0440\u0438\u0442, \u0432\u044B\u0448\u043B\u0430 \u043B\u0438 \u043D\u043E\u0432\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F Zapret" })] }), _jsx(Switch, { checked: autoUpdateCheck, disabled: disabled, onCheckedChange: onAutoUpdateCheckChange })] }), _jsxs(Button, { size: "sm", variant: "outline", onClick: () => { void runManualCheck(); }, disabled: disabled || checkingUpdate, className: "mt-2", children: [checkingUpdate ? _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : _jsx(RefreshCw, { className: "h-3.5 w-3.5" }), "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u0441\u0435\u0439\u0447\u0430\u0441"] })] })] }))] }));
};
export default ZapretServiceSettingsCard;
