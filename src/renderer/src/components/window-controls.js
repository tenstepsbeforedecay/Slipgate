import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { platform } from '@renderer/utils/init';
const WindowControls = () => {
    const [isMaximized, setIsMaximized] = useState(false);
    const [isFocused, setIsFocused] = useState(document.hasFocus());
    const [suppressHover, setSuppressHover] = useState(null);
    const isMac = platform === 'darwin';
    useEffect(() => {
        window.electron.ipcRenderer.invoke('windowIsMaximized').then(setIsMaximized);
        const onMaximize = () => setIsMaximized(true);
        const onUnmaximize = () => setIsMaximized(false);
        window.electron.ipcRenderer.on('window-maximized', onMaximize);
        window.electron.ipcRenderer.on('window-unmaximized', onUnmaximize);
        const onFocus = () => setIsFocused(true);
        const onBlur = () => setIsFocused(false);
        window.addEventListener('focus', onFocus);
        window.addEventListener('blur', onBlur);
        const onAnyPointerMove = () => setSuppressHover(null);
        document.addEventListener('pointermove', onAnyPointerMove, { passive: true });
        return () => {
            window.electron.ipcRenderer.removeAllListeners('window-maximized');
            window.electron.ipcRenderer.removeAllListeners('window-unmaximized');
            window.removeEventListener('focus', onFocus);
            window.removeEventListener('blur', onBlur);
            document.removeEventListener('pointermove', onAnyPointerMove);
        };
    }, []);
    const handleMinimize = (e) => {
        setSuppressHover('minimize');
        e.currentTarget.blur();
        window.electron.ipcRenderer.invoke('windowMinimize');
    };
    const handleMaximize = () => {
        window.electron.ipcRenderer.invoke('windowMaximize');
    };
    const handleClose = (e) => {
        setSuppressHover('close');
        e.currentTarget.blur();
        window.electron.ipcRenderer.invoke('windowClose');
    };
    // Cleared when the cursor actually leaves the button — at that point real
    // :hover is gone too and we can re-enable the normal hover styling.
    const clearSuppressed = () => setSuppressHover(null);
    const closeBtn = (_jsx("button", { className: `wc-btn wc-close${suppressHover === 'close' ? ' wc-suppress-hover' : ''}`, onClick: handleClose, onPointerLeave: clearSuppressed, onPointerMove: clearSuppressed, children: _jsx("svg", { viewBox: "0 0 10 10", fill: "none", children: _jsx("path", { d: "M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" }) }) }, "close"));
    const minimizeBtn = (_jsx("button", { className: `wc-btn wc-minimize${suppressHover === 'minimize' ? ' wc-suppress-hover' : ''}`, onClick: handleMinimize, onPointerLeave: clearSuppressed, onPointerMove: clearSuppressed, children: _jsx("svg", { viewBox: "0 0 10 10", fill: "none", children: _jsx("path", { d: "M1.5 5H8.5", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" }) }) }, "minimize"));
    const maximizeBtn = (_jsx("button", { className: "wc-btn wc-maximize", onClick: handleMaximize, children: isMaximized ? (_jsxs("svg", { viewBox: "0 0 10 10", fill: "none", children: [_jsx("path", { d: "M3 1H8.5A.5.5 0 0 1 9 1.5V7", stroke: "currentColor", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" }), _jsx("rect", { x: "1", y: "3", width: "6", height: "6", rx: "0.5", stroke: "currentColor", strokeWidth: "1.2" })] })) : (_jsx("svg", { viewBox: "0 0 10 10", fill: "none", children: _jsx("rect", { x: "1.5", y: "1.5", width: "7", height: "7", rx: "0.5", stroke: "currentColor", strokeWidth: "1.3" }) })) }, "maximize"));
    const buttons = isMac
        ? [closeBtn, minimizeBtn, maximizeBtn]
        : [minimizeBtn, maximizeBtn, closeBtn];
    return (_jsx("div", { className: `wc-group app-nodrag ${isMac ? `wc-mac${!isFocused ? ' wc-blurred' : ''}` : 'wc-win'}`, children: buttons }));
};
export default WindowControls;
