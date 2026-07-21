import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '@renderer/components/ui/button';
import { ErrorBoundary } from 'react-error-boundary';
import { useTranslation } from 'react-i18next';
const ErrorFallback = ({ error }) => {
    const { t } = useTranslation();
    const err = error instanceof Error ? error : new Error(String(error));
    return (_jsxs("div", { className: "p-4", children: [_jsx("h2", { className: "my-2 text-lg font-bold", children: t('errorBoundary.title') }), _jsx(Button, { size: "sm", variant: "secondary", className: "ml-2", onClick: () => navigator.clipboard.writeText('```\n' + err.message + '\n' + err.stack + '\n```'), children: t('errorBoundary.copyErrorInfo') }), _jsx("p", { className: "my-2", children: err.message }), _jsxs("details", { title: "Error Stack", children: [_jsx("summary", { children: "Error Stack" }), _jsx("pre", { children: err.stack })] })] }));
};
const BaseErrorBoundary = (props) => {
    return _jsx(ErrorBoundary, { FallbackComponent: ErrorFallback, children: props.children });
};
export default BaseErrorBoundary;
