import { create } from 'zustand';
import { zapretStatus } from '@renderer/utils/ipc';
export const useZapretStore = create((set) => ({
    status: { state: 'stopped' },
    setStatus: (status) => set({ status })
}));
let listener = null;
export const attachZapretStore = () => {
    // Hard-reset to dodge HMR/StrictMode duplicate listeners.
    window.electron.ipcRenderer.removeAllListeners('zapret:status');
    listener = (_e, payload) => useZapretStore.getState().setStatus(payload);
    window.electron.ipcRenderer.on('zapret:status', listener);
    zapretStatus().then((s) => useZapretStore.getState().setStatus(s)).catch(() => void 0);
    return () => {
        if (listener) {
            window.electron.ipcRenderer.removeListener('zapret:status', listener);
            listener = null;
        }
    };
};
