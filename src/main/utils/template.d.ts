/**
 * Bump this any time we want to force a partial reset of fields that older
 * (dev / stale) configs may have polluted. The migration in `config/app.ts`
 * compares the saved version against this and resets the relevant subset
 * back to defaults — fresh secret, no preselected zapret strategy, all
 * autoStart switches off, etc.
 */
export declare const CONFIG_VERSION = 4;
/**
 * Default config written on first launch.
 * Production builds ship with EVERYTHING off — no autostart, no tray, no
 * silent start, no auto-launch. The user opts into each feature manually
 * from Settings. Keeps a clean blank-slate UX for first-time installs and
 * prevents dev/QA settings leaking into shipped builds.
 */
export declare const defaultConfig: AppConfig;
