import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { useLogsStore, formatLogTime } from '@renderer/store/logs-store';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Separator } from '@renderer/components/ui/separator';
import { MapPin, Trash2 } from 'lucide-react';
import { cn } from '@renderer/lib/utils';
import BasePage from '@renderer/components/base/base-page';
const sourceColor = {
    tgws: 'text-sky-500',
    zapret: 'text-violet-500',
    app: 'text-muted-foreground'
};
const sourceLabels = {
    all: 'все',
    tgws: 'telegram',
    zapret: 'zapret',
    app: 'система'
};
const Logs = () => {
    const clearLogs = useLogsStore((s) => s.clear);
    const [logs, setLogs] = useState(() => useLogsStore.getState().logs);
    const [filter, setFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('all');
    const [trace, setTrace] = useState(true);
    const traceRef = useRef(trace);
    const virtuosoRef = useRef(null);
    const filteredLogs = useMemo(() => {
        const fl = filter.toLowerCase();
        return logs.filter((log) => {
            if (sourceFilter !== 'all' && log.source !== sourceFilter)
                return false;
            if (!fl)
                return true;
            return log.payload.toLowerCase().includes(fl) || log.type.toLowerCase().includes(fl);
        });
    }, [logs, filter, sourceFilter]);
    const toggleTrace = useCallback(() => {
        setTrace((prev) => {
            const next = !prev;
            traceRef.current = next;
            if (next)
                setLogs([...useLogsStore.getState().logs]);
            return next;
        });
    }, []);
    useEffect(() => {
        if (!trace)
            return;
        virtuosoRef.current?.scrollToIndex({
            index: filteredLogs.length - 1,
            behavior: 'smooth',
            align: 'end'
        });
    }, [filteredLogs, trace]);
    useEffect(() => {
        return useLogsStore.subscribe((state) => {
            if (traceRef.current)
                setLogs([...state.logs]);
        });
    }, []);
    return (_jsx(BasePage, { title: "\u041B\u043E\u0433\u0438", contentClassName: "flex flex-col", header: _jsx("button", { type: "button", title: "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043B\u043E\u0433\u0438", "aria-label": "\u041E\u0447\u0438\u0441\u0442\u0438\u0442\u044C \u043B\u043E\u0433\u0438", className: "cursor-pointer p-1.5 rounded-md text-destructive transition-all duration-150 active:scale-[0.9] active:duration-75 hover:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-stroke", onClick: () => {
                clearLogs();
                setLogs([]);
            }, children: _jsx(Trash2, { className: "size-4" }) }), children: _jsxs("div", { className: "flex flex-col h-full", children: [_jsxs("div", { className: "px-4 py-2 flex items-center gap-2", children: [_jsx(Input, { className: "h-8 text-sm", value: filter, placeholder: "\u0424\u0438\u043B\u044C\u0442\u0440...", onChange: (e) => setFilter(e.target.value) }), ['all', 'tgws', 'zapret', 'app'].map((s) => (_jsx(Button, { size: "sm", variant: sourceFilter === s ? 'default' : 'outline', onClick: () => setSourceFilter(s), children: sourceLabels[s] }, s))), _jsx(Button, { size: "icon-sm", className: cn('p-0', trace && 'bg-primary text-primary-foreground'), variant: trace ? 'default' : 'outline', title: "\u0421\u043B\u0435\u0434\u043E\u0432\u0430\u0442\u044C \u0437\u0430 \u0445\u0432\u043E\u0441\u0442\u043E\u043C", onClick: toggleTrace, children: _jsx(MapPin, { className: "size-4" }) })] }), _jsx(Separator, {}), _jsx("div", { className: "flex-1 min-h-0 font-mono text-xs", children: _jsx(Virtuoso, { ref: virtuosoRef, data: filteredLogs, initialTopMostItemIndex: filteredLogs.length - 1, followOutput: trace, itemContent: (_i, log) => (_jsxs("div", { className: "px-4 py-0.5 flex gap-2 items-baseline hover:bg-accent/20", children: [_jsx("span", { className: "text-muted-foreground shrink-0", children: formatLogTime(log.time) }), _jsx("span", { className: cn('shrink-0 font-semibold w-14', sourceColor[log.source]), children: log.source }), _jsx("span", { className: cn('shrink-0 w-10', log.type === 'error' && 'text-red-500', log.type === 'warn' && 'text-yellow-500'), children: log.type }), _jsx("span", { className: "break-all whitespace-pre-wrap", children: log.payload })] })) }) })] }) }));
};
export default Logs;
