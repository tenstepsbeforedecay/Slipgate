// Globals injected by `electron.vite.config.ts` via Rollup's `define`. They
// are hard-coded string literals at compile time, so no runtime overhead.

/** Unique identifier of the build that produced this main bundle. Format:
 *  `<unix-millis>-<8-char-base36-rand>`. Regenerated on every `pnpm build`,
 *  so every installer (and every dev rebuild) gets its own value. The TG WS
 *  secret regeneration logic in `src/main/config/app.ts` keys off this. */
declare const __BUILD_ID__: string
