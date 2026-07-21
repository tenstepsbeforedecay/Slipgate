import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate } from 'react-router-dom';
import Home from '@renderer/pages/home';
import Telegram from '@renderer/pages/telegram';
import Zapret from '@renderer/pages/zapret';
import Logs from '@renderer/pages/logs';
import Settings from '@renderer/pages/settings';
import About from '@renderer/pages/about';
const routes = [
    { path: '/', element: _jsx(Navigate, { to: "/home", replace: true }) },
    { path: '/home', element: _jsx(Home, {}) },
    { path: '/telegram', element: _jsx(Telegram, {}) },
    { path: '/zapret', element: _jsx(Zapret, {}) },
    { path: '/logs', element: _jsx(Logs, {}) },
    { path: '/settings', element: _jsx(Settings, {}) },
    { path: '/about', element: _jsx(About, {}) }
];
export default routes;
