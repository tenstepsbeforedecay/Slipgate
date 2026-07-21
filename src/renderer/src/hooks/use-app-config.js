import { jsx as _jsx } from "react/jsx-runtime";
import React, { createContext, useContext } from 'react';
import { toast } from 'sonner';
import useSWR from 'swr';
import { getAppConfig, patchAppConfig as patch } from '@renderer/utils/ipc';
const AppConfigContext = createContext(undefined);
export const AppConfigProvider = ({ children }) => {
    const { data: appConfig, mutate: mutateAppConfig } = useSWR('getConfig', () => getAppConfig());
    const patchAppConfig = async (value) => {
        try {
            await patch(value);
        }
        catch (e) {
            toast.error(`${e}`);
        }
        finally {
            mutateAppConfig();
        }
    };
    React.useEffect(() => {
        window.electron.ipcRenderer.on('appConfigUpdated', () => {
            mutateAppConfig();
        });
        return () => {
            window.electron.ipcRenderer.removeAllListeners('appConfigUpdated');
        };
    }, []);
    return (_jsx(AppConfigContext.Provider, { value: { appConfig, mutateAppConfig, patchAppConfig }, children: children }));
};
export const useAppConfig = () => {
    const context = useContext(AppConfigContext);
    if (context === undefined) {
        throw new Error('useAppConfig must be used within an AppConfigProvider');
    }
    return context;
};
