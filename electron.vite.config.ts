import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// NOTE: vite-plugin-monaco-editor was removed together with base-editor.tsx —
// nothing in the renderer imports Monaco anymore, so emitting its ~10 MB of
// language workers into every build was pure dead weight.

// A fresh BUILD_ID is baked into the compiled main bundle on every `pnpm build`.
// `getAppConfig` compares it against the value persisted in the user's config
// and, when it differs, regenerates the TG WS secret + URL. That guarantees
// every installed build (and every rebuild during dev/QA) gets a unique
// secret instead of inheriting whatever the previous installer wrote.
const BUILD_ID = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: {
      __BUILD_ID__: JSON.stringify(BUILD_ID)
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()]
  },
  renderer: {
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html')
        }
      }
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [
      react(),
      tailwindcss()
    ]
  }
})
