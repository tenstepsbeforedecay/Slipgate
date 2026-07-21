/**
 * Trigger an immediate tray-menu rebuild from outside this module. Used by
 * `mainWindow.on('show'/'hide'/'minimize'/'restore')` in src/main/index.ts
 * so the «Показать/Скрыть окно» label always reflects reality without
 * waiting for the 2-second background rebuildInterval. No-op if tray is
 * disabled / destroyed.
 */
export declare function refreshTray(): Promise<void>;
export declare function createTray(): Promise<void>;
export declare function destroyTray(): void;
/** Used by the close handler to verify the tray is actually alive before
 * hiding the window into it — otherwise the user would be stranded with a
 * hidden window and no way to restore it. */
export declare function isTrayActive(): boolean;
