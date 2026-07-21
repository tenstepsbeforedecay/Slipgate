import { create } from 'zustand';
import dayjs from 'dayjs';
const MAX_LOGS = 500;
export const useLogsStore = create((set) => ({
    logs: [],
    clear: () => set({ logs: [] })
}));
const handleIpcPayload = (log) => {
    const stamped = {
        ...log,
        time: typeof log.time === 'number' ? log.time : Date.now()
    };
    const prev = useLogsStore.getState().logs;
    const next = prev.length >= MAX_LOGS
        ? prev.slice(prev.length - MAX_LOGS + 1).concat(stamped)
        : prev.concat(stamped);
    useLogsStore.setState({ logs: next });
};
let ipcListener = null;
export const attachLogsStore = () => {
    window.electron.ipcRenderer.removeAllListeners('log');
    ipcListener = (_event, payload) => handleIpcPayload(payload);
    window.electron.ipcRenderer.on('log', ipcListener);
    return () => {
        if (ipcListener) {
            window.electron.ipcRenderer.removeListener('log', ipcListener);
            ipcListener = null;
        }
    };
};
// Helper for the Logs page: human-readable HH:MM:SS.
export const formatLogTime = (t) => typeof t === 'number' ? dayjs(t).format('HH:mm:ss') : String(t);
