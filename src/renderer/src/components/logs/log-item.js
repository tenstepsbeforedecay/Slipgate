import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, CardContent, CardHeader } from '@renderer/components/ui/card';
const colorMap = {
    error: 'text-destructive',
    warning: 'text-warning',
    info: 'text-primary',
    debug: 'text-muted-foreground'
};
const LogItem = (props) => {
    const { type, payload, time, index } = props;
    return (_jsx("div", { className: `select-text px-2 pb-2 ${index === 0 ? 'pt-2' : ''}`, children: _jsxs(Card, { className: "gap-0 py-0", children: [_jsxs(CardHeader, { className: "pb-0 pt-1 px-3 gap-1", children: [_jsx("div", { className: `mr-2 text-lg font-bold ${colorMap[type]}`, children: props.type.toUpperCase() }), _jsx("small", { className: "text-muted-foreground", children: time })] }), _jsx(CardContent, { className: "flag-emoji pt-0 text-sm px-3 pb-2", children: payload })] }) }));
};
export default LogItem;
