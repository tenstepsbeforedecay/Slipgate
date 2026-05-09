import { copyFile, readdir, readFile, writeFile } from 'fs/promises'
import { themesDir } from '../utils/dirs'
import { nativeTheme } from 'electron'
import path from 'path'
import { existsSync } from 'fs'
import { mainWindow } from '..'

let insertedCSSKeyMain: string | undefined

export function setNativeTheme(theme: AppTheme): void {
  nativeTheme.themeSource = theme
}

export async function resolveThemes(): Promise<{ key: string; label: string }[]> {
  if (!existsSync(themesDir())) return [{ key: 'default.css', label: 'Default' }]
  const files = await readdir(themesDir())
  const themes = await Promise.all(
    files
      .filter((file) => file.endsWith('.css'))
      .map(async (file) => {
        const css = (await readFile(path.join(themesDir(), file), 'utf-8')) || ''
        let name = file
        if (css.startsWith('/*')) {
          name = css.split('\n')[0].replace('/*', '').replace('*/', '').trim() || file
        }
        return { key: file, label: name }
      })
  )
  if (themes.find((t) => t.key === 'default.css')) return themes
  return [{ key: 'default.css', label: 'Default' }, ...themes]
}

export async function importThemes(files: string[]): Promise<void> {
  for (const file of files) {
    if (existsSync(file)) {
      await copyFile(
        file,
        path.join(themesDir(), `${new Date().getTime().toString(16)}-${path.basename(file)}`)
      )
    }
  }
}

export async function readTheme(theme: string): Promise<string> {
  const full = path.join(themesDir(), theme)
  if (!existsSync(full)) return ''
  return await readFile(full, 'utf-8')
}

export async function writeTheme(theme: string, css: string): Promise<void> {
  await writeFile(path.join(themesDir(), theme), css)
}

export async function applyTheme(theme: string): Promise<void> {
  const css = await readTheme(theme)
  try {
    if (insertedCSSKeyMain) {
      await mainWindow?.webContents.removeInsertedCSS(insertedCSSKeyMain)
    }
    insertedCSSKeyMain = await mainWindow?.webContents.insertCSS(css) ?? undefined
  } catch { /* noop */ }
}