import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { Loader2, Download, Sparkles, X } from 'lucide-react';
import { appCheckUpdate, appInstallUpdate, appDismissUpdate } from '@renderer/utils/ipc';
import { Button } from '@renderer/components/ui/button';
const POLL_INTERVAL_MS = 60 * 60 * 1000; // 1 h
export default function AppUpdateOverlay() {
    const [info, setInfo] = useState(null);
    const [installing, setInstalling] = useState(false);
    const [error, setError] = useState(null);
    const [closing, setClosing] = useState(false);
    useEffect(() => {
        let cancelled = false;
        const check = async (force = false) => {
            try {
                const next = await appCheckUpdate(force);
                if (cancelled)
                    return;
                setInfo(next);
            }
            catch {
                /* noop — silent in background */
            }
        };
        check(false);
        const id = window.setInterval(() => check(true), POLL_INTERVAL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, []);
    const visible = !!info &&
        info.hasUpdate &&
        !!info.assetUrl &&
        !info.dismissed &&
        !closing;
    const handleInstall = async () => {
        if (!info?.assetUrl)
            return;
        setInstalling(true);
        setError(null);
        try {
            await appInstallUpdate(info.assetUrl, info.latest);
            // Main process will quit Slipgate within ~1 s. We just keep the
            // spinner up; user perceives "downloading… closing…".
        }
        catch (e) {
            setInstalling(false);
            setError(e instanceof Error ? e.message : String(e));
        }
    };
    const handleLater = async () => {
        if (!info?.tag) {
            setClosing(true);
            return;
        }
        setClosing(true);
        try {
            await appDismissUpdate(info.tag);
        }
        catch {
            /* noop — dismissal is a soft signal */
        }
    };
    if (!visible || !info)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-[200] flex items-center justify-center", style: {
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
        }, children: _jsxs("div", { className: "relative w-[min(560px,92vw)] rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl p-6 sm:p-8", children: [_jsx("button", { type: "button", onClick: handleLater, disabled: installing, "aria-label": "\u0417\u0430\u043A\u0440\u044B\u0442\u044C", className: "absolute top-3 right-3 size-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed", children: _jsx(X, { className: "size-4" }) }), _jsxs("div", { className: "flex items-start gap-4", children: [_jsx("div", { className: "shrink-0 size-12 rounded-xl bg-accent inline-flex items-center justify-center text-foreground", children: _jsx(Sparkles, { className: "size-6" }) }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "text-xl sm:text-2xl font-semibold leading-tight", children: "\u0414\u043E\u0441\u0442\u0443\u043F\u043D\u043E \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435 Slipgate" }), _jsxs("div", { className: "mt-1 text-sm text-muted-foreground", children: ["\u0422\u0435\u043A\u0443\u0449\u0430\u044F \u0432\u0435\u0440\u0441\u0438\u044F: ", _jsxs("span", { className: "font-mono", children: ["v", info.installed] }), info.latest ? (_jsxs(_Fragment, { children: ['  →  ', _jsxs("span", { className: "font-mono font-semibold text-foreground", children: ["v", info.latest] })] })) : null] }), info.releaseNotes ? (_jsx("div", { className: "mt-4 max-h-44 overflow-y-auto rounded-lg border border-border bg-muted/50 p-3 text-sm whitespace-pre-wrap leading-relaxed", children: info.releaseNotes })) : null, error ? (_jsxs("div", { className: "mt-3 text-sm text-destructive", children: ["\u041D\u0435 \u0443\u0434\u0430\u043B\u043E\u0441\u044C \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C \u043E\u0431\u043D\u043E\u0432\u043B\u0435\u043D\u0438\u0435: ", error] })) : null] })] }), _jsxs("div", { className: "mt-6 flex items-center justify-end gap-2", children: [_jsx(Button, { variant: "ghost", onClick: handleLater, disabled: installing, children: "\u041F\u043E\u0437\u0436\u0435" }), _jsx(Button, { onClick: handleInstall, disabled: installing, children: installing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "size-4 mr-2 animate-spin" }), "\u0417\u0430\u0433\u0440\u0443\u0437\u043A\u0430\u2026"] })) : (_jsxs(_Fragment, { children: [_jsx(Download, { className: "size-4 mr-2" }), "\u0423\u0441\u0442\u0430\u043D\u043E\u0432\u0438\u0442\u044C"] })) })] }), _jsx("div", { className: "mt-3 text-[11px] text-muted-foreground leading-relaxed", children: "Slipgate \u0437\u0430\u043A\u0440\u043E\u0435\u0442\u0441\u044F \u043D\u0430 5\u201310 \u0441\u0435\u043A\u0443\u043D\u0434 \u0434\u043B\u044F \u0443\u0441\u0442\u0430\u043D\u043E\u0432\u043A\u0438 \u0438 \u0437\u0430\u043F\u0443\u0441\u0442\u0438\u0442\u0441\u044F \u0441\u043D\u043E\u0432\u0430 \u0430\u0432\u0442\u043E\u043C\u0430\u0442\u0438\u0447\u0435\u0441\u043A\u0438. \u0412\u0441\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0438 \u0438 \u043A\u043E\u043D\u0444\u0438\u0433\u0438 \u0441\u043E\u0445\u0440\u0430\u043D\u044F\u044E\u0442\u0441\u044F." })] }) }));
}
