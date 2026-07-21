"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";
import { cn } from "@renderer/lib/utils";
function TooltipProvider({ delayDuration = 0, ...props }) {
    return (_jsx(TooltipPrimitive.Provider, { "data-slot": "tooltip-provider", delayDuration: delayDuration, ...props }));
}
const windowFocusSuppress = {
    suppressed: false,
    init: false,
    anchorX: -1,
    anchorY: -1,
};
function initWindowFocusTracking() {
    if (windowFocusSuppress.init)
        return;
    windowFocusSuppress.init = true;
    window.addEventListener("blur", () => {
        windowFocusSuppress.suppressed = true;
        windowFocusSuppress.anchorX = -1;
        windowFocusSuppress.anchorY = -1;
    });
    window.addEventListener("pointermove", (e) => {
        if (!windowFocusSuppress.suppressed)
            return;
        if (windowFocusSuppress.anchorX === -1) {
            windowFocusSuppress.anchorX = e.clientX;
            windowFocusSuppress.anchorY = e.clientY;
        }
        else if (e.clientX !== windowFocusSuppress.anchorX ||
            e.clientY !== windowFocusSuppress.anchorY) {
            windowFocusSuppress.suppressed = false;
        }
    }, { passive: true });
}
function Tooltip({ open: openProp, onOpenChange: onOpenChangeProp, ...props }) {
    const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
    const isControlled = openProp !== undefined;
    const open = isControlled ? openProp : uncontrolledOpen;
    React.useEffect(() => {
        initWindowFocusTracking();
    }, []);
    const onOpenChange = React.useCallback((value) => {
        if (value && windowFocusSuppress.suppressed) {
            return;
        }
        if (!isControlled) {
            setUncontrolledOpen(value);
        }
        onOpenChangeProp?.(value);
    }, [isControlled, onOpenChangeProp]);
    React.useEffect(() => {
        if (!open)
            return;
        const handleBlur = () => {
            if (!isControlled) {
                setUncontrolledOpen(false);
            }
            onOpenChangeProp?.(false);
        };
        window.addEventListener("blur", handleBlur);
        return () => {
            window.removeEventListener("blur", handleBlur);
        };
    }, [open, isControlled, onOpenChangeProp]);
    return (_jsx(TooltipProvider, { children: _jsx(TooltipPrimitive.Root, { "data-slot": "tooltip", open: open, onOpenChange: onOpenChange, ...props }) }));
}
function TooltipTrigger({ ...props }) {
    return _jsx(TooltipPrimitive.Trigger, { "data-slot": "tooltip-trigger", ...props });
}
function TooltipContent({ className, sideOffset = 0, children, ...props }) {
    return (_jsx(TooltipPrimitive.Portal, { children: _jsxs(TooltipPrimitive.Content, { "data-slot": "tooltip-content", sideOffset: sideOffset, className: cn("bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance", className), ...props, children: [children, _jsx(TooltipPrimitive.Arrow, { className: "bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" })] }) }));
}
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
