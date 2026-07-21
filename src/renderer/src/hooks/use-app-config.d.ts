import React, { ReactNode } from 'react';
interface AppConfigContextType {
    appConfig: AppConfig | undefined;
    mutateAppConfig: () => void;
    patchAppConfig: (value: Partial<AppConfig>) => Promise<void>;
}
export declare const AppConfigProvider: React.FC<{
    children: ReactNode;
}>;
export declare const useAppConfig: () => AppConfigContextType;
export {};
