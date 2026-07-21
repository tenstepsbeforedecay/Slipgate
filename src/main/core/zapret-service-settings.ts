import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { zapretBundleDir } from '../utils/dirs'
import { getAppConfig, patchAppConfig } from '../config'

/**
 * These two settings mirror `service.bat`'s own "Game Filter" and "IPset
 * Filter" menu items. Both are driven entirely by files inside the Zapret
 * bundle (utils/game_filter.enabled, lists/ipset-all.txt) that
 * general.bat itself reads on every launch — we don't reimplement any
 * winws.exe argument logic here, we just manage the same files
 * service.bat would, so running it manually afterwards stays in sync and
 * nothing about the actual filtering behaviour changes underneath us.
 *
 * A running winws.exe reads these once at launch, so changes only take
 * effect after Zapret is restarted — same as service.bat's own
 * "Restart the zapret to apply the changes" note.
 */

export type GameFilterMode = 'off' | 'all' | 'tcp' | 'udp'
export type IpsetFilterMode = 'none' | 'loaded' | 'any'

// ---- Game Filter ----------------------------------------------------------

function gameFilterFlagFile(): string {
  return path.join(zapretBundleDir(), 'utils', 'game_filter.enabled')
}

/** Reads current mode straight from disk — source of truth, not config. */
export function getGameFilterMode(): GameFilterMode {
  const file = gameFilterFlagFile()
  if (!existsSync(file)) return 'off'
  try {
    const firstLine = readFileSync(file, 'utf-8').split(/\r?\n/)[0]?.trim().toLowerCase()
    if (firstLine === 'all' || firstLine === 'tcp' || firstLine === 'udp') return firstLine
    return 'off'
  } catch {
    return 'off'
  }
}

export async function setGameFilterMode(mode: GameFilterMode): Promise<GameFilterMode> {
  const file = gameFilterFlagFile()
  try {
    if (mode === 'off') {
      if (existsSync(file)) unlinkSync(file)
    } else {
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, `${mode}\r\n`, 'utf-8')
    }
  } catch (e) {
    throw new Error(`Не удалось изменить Game Filter: ${e instanceof Error ? e.message : String(e)}`)
  }
  const cfg = await getAppConfig()
  await patchAppConfig({ zapret: { ...(cfg.zapret as ZapretConfig), gameFilterMode: mode } })
  return mode
}

// ---- IPset Filter -----------------------------------------------------------
//
// service.bat cycles lists/ipset-all.txt through three states:
//   loaded  — real curated IP ranges; filter targets only those IPs
//   none    — file holds only a dummy documentation-only IP
//             (203.0.113.113/32), so the filter never matches anything
//   any     — file is empty, so the filter matches every destination IP
//             on the affected ports (broadest, least selective)
// Switching away from "loaded" backs the real list up to
// ipset-all.txt.backup first; switching back restores it.

const DUMMY_IP = '203.0.113.113/32'

function ipsetListFile(): string {
  return path.join(zapretBundleDir(), 'lists', 'ipset-all.txt')
}
function ipsetBackupFile(): string {
  return `${ipsetListFile()}.backup`
}

function nonEmptyLines(content: string): string[] {
  return content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
}

export function getIpsetFilterMode(): IpsetFilterMode {
  const file = ipsetListFile()
  if (!existsSync(file)) return 'any'
  let content: string
  try {
    content = readFileSync(file, 'utf-8')
  } catch {
    return 'loaded'
  }
  const lines = nonEmptyLines(content)
  if (lines.length === 0) return 'any'
  return lines.every((l) => l === DUMMY_IP) ? 'none' : 'loaded'
}

export interface IpsetFilterSnapshot {
  mode: IpsetFilterMode
  lines: number
  hasBackup: boolean
}

export function getIpsetFilterSnapshot(): IpsetFilterSnapshot {
  const file = ipsetListFile()
  let lines = 0
  try {
    if (existsSync(file)) lines = nonEmptyLines(readFileSync(file, 'utf-8')).length
  } catch { /* ignore */ }
  return {
    mode: getIpsetFilterMode(),
    lines,
    hasBackup: existsSync(ipsetBackupFile())
  }
}

export async function setIpsetFilterMode(mode: IpsetFilterMode): Promise<IpsetFilterSnapshot> {
  const file = ipsetListFile()
  const backup = ipsetBackupFile()
  const current = getIpsetFilterMode()

  try {
    mkdirSync(path.dirname(file), { recursive: true })

    if (mode !== current) {
      if (mode === 'loaded') {
        if (!existsSync(backup)) {
          throw new Error(
            'Нет сохранённого списка для восстановления. Сначала загрузите ipset-список кнопкой «Обновить список».'
          )
        }
        if (existsSync(file)) unlinkSync(file)
        renameSync(backup, file)
      } else {
        // Leaving "loaded" for "none" or "any" — stash the real list first
        // (if we're not already stashed) so "loaded" can restore it later.
        if (current === 'loaded' && existsSync(file)) {
          if (existsSync(backup)) unlinkSync(backup)
          renameSync(file, backup)
        }
        writeFileSync(file, mode === 'none' ? `${DUMMY_IP}\r\n` : '', 'utf-8')
      }
    }
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('Нет сохранённого списка')) throw e
    throw new Error(`Не удалось переключить IPset Filter: ${e instanceof Error ? e.message : String(e)}`)
  }

  const cfg = await getAppConfig()
  await patchAppConfig({ zapret: { ...(cfg.zapret as ZapretConfig), ipsetMode: mode } })
  return getIpsetFilterSnapshot()
}

// Same source service.bat's own "Update IPSet List" menu item pulls from.
const IPSET_URL =
  'https://raw.githubusercontent.com/Flowseal/zapret-discord-youtube/refs/heads/main/.service/ipset-service.txt'

/**
 * Downloads the latest curated ipset list and installs it as the active
 * ("loaded") list, discarding any stale backup — a freshly downloaded
 * list is now the thing "loaded" should mean.
 */
export async function updateIpsetList(): Promise<IpsetFilterSnapshot> {
  let text: string
  try {
    const res = await fetch(IPSET_URL, { headers: { 'User-Agent': 'Slipgate-Updater' } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    text = await res.text()
  } catch (e) {
    throw new Error(`Не удалось скачать ipset-список: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!text.trim()) throw new Error('Скачанный ipset-список пуст')

  const file = ipsetListFile()
  const backup = ipsetBackupFile()
  mkdirSync(path.dirname(file), { recursive: true })
  writeFileSync(file, text, 'utf-8')
  if (existsSync(backup)) {
    try { unlinkSync(backup) } catch { /* best-effort */ }
  }

  const cfg = await getAppConfig()
  await patchAppConfig({ zapret: { ...(cfg.zapret as ZapretConfig), ipsetMode: 'loaded' } })
  return getIpsetFilterSnapshot()
}
