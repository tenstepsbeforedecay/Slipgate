import { BrowserWindow } from 'electron';
export declare let mainWindow: BrowserWindow | null;
/** Legacy re-export, kept minimal. */
export declare function showError(title: string, message: string): void;
export declare function createWindow(appConfig?: AppConfig): Promise<void>;
export declare function showMainWindow(): Promise<void>;
export declare function closeMainWindow(): void;
export declare function triggerMainWindow(): Promise<void>;
