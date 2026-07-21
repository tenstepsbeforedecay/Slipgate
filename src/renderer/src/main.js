import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { init, platform } from '@renderer/utils/init';
import '@renderer/assets/main.css';
import App from '@renderer/App';
import BaseErrorBoundary from './components/base/base-error-boundary';
import { Toaster } from './components/ui/sonner';
import { appQuit } from './utils/ipc';
import { AppConfigProvider } from './hooks/use-app-config';
init().then(() => {
    document.addEventListener('keydown', (e) => {
        if (platform !== 'darwin' && e.ctrlKey && e.key === 'q') {
            e.preventDefault();
            appQuit();
        }
        if (platform === 'darwin' && e.metaKey && e.key === 'q') {
            e.preventDefault();
            appQuit();
        }
    });
});
ReactDOM.createRoot(document.getElementById('root')).render(_jsx(React.StrictMode, { children: _jsx(NextThemesProvider, { attribute: "class", enableSystem: true, defaultTheme: "dark", children: _jsx(BaseErrorBoundary, { children: _jsx(HashRouter, { children: _jsxs(AppConfigProvider, { children: [_jsx(App, {}), _jsx(Toaster, { richColors: true, position: "bottom-right" })] }) }) }) }) }));
