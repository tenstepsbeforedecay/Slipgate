import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChevronDown, ChevronRight, ListChecks, Loader2, PlusCircle, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { cn, POWER_ON_BANNER_STYLE } from '@renderer/lib/utils';
import { zapretGetCuratedIpSets, zapretGetIpList, zapretApplyIpListPatch, zapretClearIpList, zapretRestoreIpListBackup } from '@renderer/utils/ipc';
const ZapretIpListCard = ({ disabled = false, disabledReason }) => {
    const [open, setOpen] = useState(false);
    const [snapshot, setSnapshot] = useState(null);
    const [sets, setSets] = useState([]);
    const [picked, setPicked] = useState(new Set());
    const [custom, setCustom] = useState('');
    const [busy, setBusy] = useState(false);
    const loadedRef = useRef(false);
    const refresh = async () => {
        try {
            const [snap, list] = await Promise.all([
                zapretGetIpList(),
                zapretGetCuratedIpSets()
            ]);
            setSnapshot(snap);
            setSets(list);
        }
        catch {
            // Bundle may not be installed yet — leave snapshot null.
            setSnapshot(null);
            setSets([]);
        }
    };
    useEffect(() => {
        if (loadedRef.current)
            return;
        loadedRef.current = true;
        void refresh();
    }, []);
    const togglePicked = (id) => {
        setPicked((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    };
    const apply = async (mode) => {
        if (busy)
            return;
        if (picked.size === 0 && custom.trim() === '') {
            toast.warning('Нечего применять — выбери набор или впиши IP вручную');
            return;
        }
        setBusy(true);
        const tId = toast.loading(mode === 'replace' ? 'Перезаписываем список IP…' : 'Добавляем IP в список…');
        try {
            const snap = await zapretApplyIpListPatch({
                setIds: [...picked],
                customCidrs: custom.length ? [custom] : [],
                replace: mode === 'replace'
            });
            setSnapshot(snap);
            setPicked(new Set());
            setCustom('');
            toast.success(`Готово — в списке ${snap.total} запис${endingFor(snap.total)}`, {
                id: tId,
                style: POWER_ON_BANNER_STYLE
            });
        }
        catch (e) {
            toast.error('Не удалось обновить список IP', {
                id: tId,
                description: e instanceof Error ? e.message : String(e)
            });
        }
        finally {
            setBusy(false);
        }
    };
    const clearAll = async () => {
        if (busy)
            return;
        setBusy(true);
        const tId = toast.loading('Очищаем список IP…');
        try {
            const snap = await zapretClearIpList();
            setSnapshot(snap);
            toast.success('Список IP очищен', { id: tId });
        }
        catch (e) {
            toast.error('Не удалось очистить список', {
                id: tId,
                description: e instanceof Error ? e.message : String(e)
            });
        }
        finally {
            setBusy(false);
        }
    };
    const restore = async () => {
        if (busy)
            return;
        setBusy(true);
        const tId = toast.loading('Восстанавливаем список из бэкапа…');
        try {
            const snap = await zapretRestoreIpListBackup();
            setSnapshot(snap);
            toast.success(`Восстановлено — ${snap.total} запис${endingFor(snap.total)}`, {
                id: tId,
                style: POWER_ON_BANNER_STYLE
            });
        }
        catch (e) {
            toast.error('Не удалось восстановить', {
                id: tId,
                description: e instanceof Error ? e.message : String(e)
            });
        }
        finally {
            setBusy(false);
        }
    };
    const pickedCount = useMemo(() => picked.size, [picked]);
    return (_jsxs(Card, { children: [_jsxs(CardHeader, { className: "flex flex-row items-center justify-between gap-3 space-y-0", children: [_jsx("div", { className: "min-w-0 flex-1", children: _jsxs(CardTitle, { className: "flex items-center gap-2", children: [_jsx(ListChecks, { className: "h-4 w-4 text-muted-foreground" }), "\u0421\u043F\u0438\u0441\u043E\u043A \u0445\u043E\u0441\u0442\u043E\u0432 \u0438 IP", snapshot && (_jsxs("span", { className: "text-xs font-normal text-muted-foreground", children: [snapshot.total, " \u0437\u0430\u043F\u0438\u0441", endingFor(snapshot.total), " \u0432 list-general.txt"] }))] }) }), _jsx(Button, { variant: open ? 'secondary' : 'outline', size: "sm", disabled: disabled, title: disabled ? disabledReason : undefined, onClick: () => setOpen((v) => !v), className: "shrink-0", children: open
                            ? _jsxs(_Fragment, { children: [_jsx(ChevronDown, { className: "h-3.5 w-3.5" }), " \u0421\u0432\u0435\u0440\u043D\u0443\u0442\u044C"] })
                            : _jsxs(_Fragment, { children: [_jsx(ChevronRight, { className: "h-3.5 w-3.5" }), " \u0423\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u0438\u0435 \u0441\u043F\u0438\u0441\u043A\u043E\u043C"] }) })] }), open && (_jsx(CardContent, { className: "space-y-4 pt-0", children: !snapshot ? (_jsxs("p", { className: "text-sm text-muted-foreground", children: ["\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u043F\u0440\u043E\u0447\u0438\u0442\u0430\u0442\u044C ", _jsx("code", { className: "text-xs", children: "lists/list-general.txt" }), ". \u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u0435 \u0438\u043B\u0438 \u043E\u0431\u043D\u043E\u0432\u0438\u0442\u0435 Zapret-\u0431\u0430\u043D\u0434\u043B."] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs uppercase tracking-wide text-muted-foreground", children: "\u0413\u043E\u0442\u043E\u0432\u044B\u0435 \u043D\u0430\u0431\u043E\u0440\u044B" }), _jsx("div", { className: "grid gap-2 sm:grid-cols-2", children: sets.map((s) => {
                                        const checked = picked.has(s.id);
                                        return (_jsxs("label", { className: cn('flex cursor-pointer select-none items-start gap-2 rounded-md border p-2.5 transition', checked
                                                ? 'border-primary bg-primary/10'
                                                : 'border-border hover:bg-accent/30', (disabled || busy) && 'pointer-events-none opacity-50'), children: [_jsx("input", { type: "checkbox", checked: checked, onChange: () => togglePicked(s.id), className: "mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-primary" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center justify-between gap-2", children: [_jsx("span", { className: "text-sm font-medium", children: s.name }), _jsxs("span", { className: "shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground", children: [s.cidrs.length, " \u0437\u0430\u043F."] })] }), _jsx("p", { className: "mt-0.5 text-xs text-muted-foreground", children: s.description })] })] }, s.id));
                                    }) })] }), _jsxs("div", { children: [_jsx("div", { className: "mb-2 text-xs uppercase tracking-wide text-muted-foreground", children: "\u0421\u0432\u043E\u0438 \u0445\u043E\u0441\u0442\u044B / IP" }), _jsx("textarea", { value: custom, onChange: (e) => setCustom(e.target.value), disabled: disabled || busy, placeholder: 'example.com\n*.example.org\n1.2.3.4\n2606:4700::/32', rows: 4, spellCheck: false, className: cn('w-full rounded-md border border-border bg-background/60 p-2 font-mono text-xs', 'placeholder:text-muted-foreground/60 focus:border-primary focus:outline-none', (disabled || busy) && 'pointer-events-none opacity-50') }), _jsx("p", { className: "mt-1 text-[11px] text-muted-foreground", children: "\u041F\u043E \u043E\u0434\u043D\u043E\u043C\u0443 \u0432 \u0441\u0442\u0440\u043E\u043A\u0435. \u041F\u043E\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0442\u0441\u044F \u0434\u043E\u043C\u0435\u043D\u044B, IPv4/IPv6 \u0438 CIDR. \u041D\u0435\u0432\u0430\u043B\u0438\u0434\u043D\u044B\u0435 \u0441\u0442\u0440\u043E\u043A\u0438 \u0438\u0433\u043D\u043E\u0440\u0438\u0440\u0443\u044E\u0442\u0441\u044F." })] }), snapshot.preview.length > 0 && (_jsxs("div", { children: [_jsxs("div", { className: "mb-2 text-xs uppercase tracking-wide text-muted-foreground", children: ["\u0422\u0435\u043A\u0443\u0449\u0438\u0439 \u0441\u043F\u0438\u0441\u043E\u043A (\u043F\u0435\u0440\u0432\u044B\u0435 ", snapshot.preview.length, " \u0438\u0437 ", snapshot.total, ")"] }), _jsxs("pre", { className: "max-h-32 overflow-auto rounded-md border border-border bg-background/40 p-2 font-mono text-[11px] leading-snug", children: [snapshot.preview.join('\n'), snapshot.total > snapshot.preview.length ? '\n…' : ''] })] })), _jsxs("div", { className: "flex flex-wrap items-center gap-2 pt-1", children: [_jsxs(Button, { size: "sm", onClick: () => { void apply('append'); }, disabled: disabled || busy || (pickedCount === 0 && custom.trim() === ''), children: [busy ? _jsx(Loader2, { className: "h-3.5 w-3.5 animate-spin" }) : _jsx(PlusCircle, { className: "h-3.5 w-3.5" }), "\u0414\u043E\u0431\u0430\u0432\u0438\u0442\u044C \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u043E\u0435"] }), _jsx(Button, { size: "sm", variant: "outline", onClick: () => { void apply('replace'); }, disabled: disabled || busy || (pickedCount === 0 && custom.trim() === ''), title: "\u041F\u0435\u0440\u0435\u0437\u0430\u043F\u0438\u0441\u0430\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A \u0432\u044B\u0431\u0440\u0430\u043D\u043D\u044B\u043C\u0438 \u043D\u0430\u0431\u043E\u0440\u0430\u043C\u0438 \u0438 \u0441\u0432\u043E\u0438\u043C\u0438 IP \u2014 \u0442\u0435\u043A\u0443\u0449\u0435\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u043C\u043E\u0435 \u0431\u0443\u0434\u0435\u0442 \u0443\u0434\u0430\u043B\u0435\u043D\u043E", children: "\u0417\u0430\u043C\u0435\u043D\u0438\u0442\u044C \u0441\u043F\u0438\u0441\u043E\u043A" }), _jsxs("div", { className: "ml-auto flex items-center gap-2", children: [snapshot.hasBackup && (_jsxs(Button, { size: "sm", variant: "ghost", onClick: () => { void restore(); }, disabled: disabled || busy, title: "\u0412\u043E\u0441\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u0438\u0441\u0445\u043E\u0434\u043D\u044B\u0439 list-general.txt (\u0431\u044D\u043A\u0430\u043F \u0441\u043E\u0437\u0434\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u0438 \u043F\u0435\u0440\u0432\u043E\u043C \u0438\u0437\u043C\u0435\u043D\u0435\u043D\u0438\u0438)", children: [_jsx(RotateCcw, { className: "h-3.5 w-3.5" }), "\u0418\u0437 \u0431\u044D\u043A\u0430\u043F\u0430"] })), _jsxs(Button, { size: "sm", variant: "ghost", onClick: () => { void clearAll(); }, disabled: disabled || busy || snapshot.total === 0, className: "text-red-400 hover:text-red-300", children: [_jsx(Trash2, { className: "h-3.5 w-3.5" }), "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C"] })] })] })] })) }))] }));
};
function endingFor(n) {
    // Russian noun ending: 1 → ь, 2-4 → и, 5+ / 0 / 11-14 → ей
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11)
        return 'ь';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
        return 'и';
    return 'ей';
}
export default ZapretIpListCard;
