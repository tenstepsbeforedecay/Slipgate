/**
 * Returns true if the current config dictates that the main window should be
 * hidden from the Windows taskbar. Guarded against the "tray is off" edge
 * case — without a tray icon we must keep the taskbar entry so the user can
 * always reach the window.
 */
export declare function shouldSkipTaskbar(): boolean;
/**
 * Pushes the current `shouldSkipTaskbar()` value onto the live BrowserWindow.
 * Safe to call repeatedly — Electron's `setSkipTaskbar` is idempotent.
 */
export declare function applySkipTaskbar(): void;
