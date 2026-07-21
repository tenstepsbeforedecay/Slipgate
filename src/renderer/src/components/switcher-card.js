import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Switch } from '@renderer/components/ui/switch';
import { cn } from '@renderer/lib/utils';
import { Loader2 } from 'lucide-react';
const stateText = {
    stopped: 'Off',
    starting: 'Starting',
    running: 'On',
    stopping: 'Stopping',
    error: 'Error'
};
const SwitcherCard = ({ icon: Icon, title, subtitle, status, onToggle, footer, onClick, className, version, disabled = false }) => {
    const [pending, setPending] = React.useState(null);
    const ipcRunning = status.state === 'running';
    const on = pending ?? ipcRunning;
    const ipcTransitioning = status.state === 'starting' || status.state === 'stopping';
    const transitioning = ipcTransitioning || pending !== null;
    const errored = status.state === 'error';
    const locked = transitioning || disabled;
    const handleChange = async (next) => {
        if (locked)
            return;
        setPending(next);
        try {
            await Promise.resolve(onToggle(next));
        }
        finally {
            setPending(null);
        }
    };
    return (_jsxs("div", { onClick: onClick, className: cn('relative overflow-hidden rounded-xl border p-4 transition-all', 'flex flex-col gap-3', onClick && 'cursor-pointer hover:-translate-y-0.5', on &&
            'border-stroke-power-on bg-gradient-to-br from-gradient-start-power-on/55 to-gradient-end-power-on/55 text-white shadow-lg shadow-gradient-end-power-on/20', !on && !errored &&
            'border-stroke bg-card/50 backdrop-blur-xl', errored &&
            'border-stroke-power-off bg-gradient-to-br from-gradient-start-power-off/45 to-gradient-end-power-off/45 text-white', className), children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: cn('size-10 rounded-lg flex items-center justify-center shrink-0', on && 'bg-white/20', !on && !errored && 'bg-muted/60', errored && 'bg-white/20'), children: _jsx(Icon, { className: "size-5" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-base font-semibold truncate", children: title }), subtitle && (_jsx("div", { className: cn('text-xs truncate mt-0.5', on ? 'text-white/85' : errored ? 'text-white/85' : 'text-muted-foreground'), children: subtitle }))] }), _jsxs("div", { className: "shrink-0 flex flex-col items-end gap-1", onClick: (e) => e.stopPropagation(), children: [_jsx(Switch, { checked: on, disabled: locked, onCheckedChange: handleChange }), version && (_jsxs("div", { className: cn('text-[10px] tabular-nums leading-none', on ? 'text-white/80' : errored ? 'text-white/80' : 'text-muted-foreground'), children: ["v", version] }))] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: cn('flex items-center gap-1.5 text-xs font-medium', on ? 'text-white/90' : errored ? 'text-white/90' : 'text-muted-foreground'), children: [transitioning && _jsx(Loader2, { className: "size-3 animate-spin" }), _jsx("span", { children: stateText[status.state] })] }), footer && (_jsx("div", { className: cn('text-xs', on ? 'text-white/80' : errored ? 'text-white/80' : 'text-muted-foreground'), children: footer }))] }), errored && status.lastError && (_jsx("div", { className: "text-[11px] text-white/90 bg-black/20 rounded-md px-2 py-1.5 truncate", children: status.lastError }))] }));
};
export default SwitcherCard;
