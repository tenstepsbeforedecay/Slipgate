import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@renderer/components/ui/button';
import { platform } from '@renderer/utils/init';
import WindowControls from '@renderer/components/window-controls';
import { forwardRef, useImperativeHandle, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
const sidebarPaths = new Set(['/home', '/profiles', '/proxies', '/connections', '/rules', '/logs', '/settings', '/about']);
const isMac = platform === 'darwin';
const BasePage = forwardRef((props, ref) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isSubPage = !sidebarPaths.has(location.pathname);
    const contentRef = useRef(null);
    useImperativeHandle(ref, () => {
        return contentRef.current;
    });
    return (_jsxs("div", { ref: contentRef, className: "w-full h-full", children: [_jsx("div", { className: "sticky top-0 z-40 h-14.25 w-full", children: _jsxs("div", { className: "app-drag px-2 pt-3 pb-2 flex justify-between h-14.25", children: [_jsxs("div", { className: "title h-full text-lg leading-8 flex items-center gap-1", children: [(isSubPage || props.showBackButton) && (_jsx(Button, { size: "icon-sm", variant: "ghost", className: "app-nodrag", onClick: () => navigate(-1), children: _jsx(ChevronLeft, { className: "size-5" }) })), props.title] }), _jsxs("div", { className: "header flex gap-1 h-full items-center app-nodrag", children: [props.header, !isMac && _jsx(WindowControls, {})] })] }) }), _jsx("div", { className: "content h-[calc(100vh-57px)] overflow-y-auto custom-scrollbar", children: props.children })] }));
});
BasePage.displayName = 'BasePage';
export default BasePage;
