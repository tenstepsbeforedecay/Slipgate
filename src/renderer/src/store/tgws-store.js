import { create } from 'zustand';
import { tgwsStatus } from '@renderer/utils/ipc';
export const useTgwsStore = create((set) => ({
    status: { state: 'stopped' },
    setStatus: (status) => set({ status })
}));
let listener = null;
export const attachTgwsStore = () => {
    // Hard-reset to dodge HMR/StrictMode duplicate listeners.
    window.electron.ipcRenderer.removeAllListeners('tgws:status');
    listener = (_e, payload) => useTgwsStore.getState().setStatus(payload);
    window.electron.ipcRenderer.on('tgws:status', listener);
    tgwsStatus().then((s) => useTgwsStore.getState().setStatus(s)).catch(() => void 0);
    return () => {
        if (listener) {
            window.electron.ipcRenderer.removeListener('tgws:status', listener);
            listener = null;
        }
    };
};
