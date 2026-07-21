import { jsx as _jsx } from "react/jsx-runtime";
import { CircleCheckIcon, InfoIcon, Loader2Icon, OctagonXIcon, TriangleAlertIcon, } from "lucide-react";
import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";
const Toaster = ({ ...props }) => {
    // 'system' was removed as a user-facing option, but next-themes can still
    // briefly hand us undefined / a stale value during the first render. Fall
    // back to 'dark' to match the app's default theme.
    const { resolvedTheme } = useTheme();
    const theme = resolvedTheme === "light" ? "light" : "dark";
    return (_jsx(Sonner, { theme: theme, className: "toaster group", icons: {
            success: _jsx(CircleCheckIcon, { className: "size-4" }),
            info: _jsx(InfoIcon, { className: "size-4" }),
            warning: _jsx(TriangleAlertIcon, { className: "size-4" }),
            error: _jsx(OctagonXIcon, { className: "size-4" }),
            loading: _jsx(Loader2Icon, { className: "size-4 animate-spin" }),
        }, style: {
            "--normal-bg": "var(--popover)",
            "--normal-text": "var(--popover-foreground)",
            "--normal-border": "var(--border)",
            "--border-radius": "var(--radius)",
            "--error-bg": "radial-gradient(at 30% 45%, color-mix(in oklab, var(--gradient-start-power-off) 60%, transparent), color-mix(in oklab, var(--gradient-end-power-off) 60%, transparent)), var(--popover)",
            "--error-border": "var(--stroke-power-off)",
            "--error-text": "var(--foreground)",
        }, ...props }));
};
export { Toaster };
