import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { ChevronDown, ChevronRight, Gamepad2, Loader2, RefreshCw, Settings2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Button } from '@renderer/components/ui/button'
import { Switch } from '@renderer/components/ui/switch'
import { cn, POWER_ON_BANNER_STYLE } from '@renderer/lib/utils'
import {
  zapretGetGameFilter,
  zapretSetGameFilter,
  zapretGetIpsetFilter,
  zapretSetIpsetFilter,
  zapretUpdateIpsetList,
  type GameFilterMode,
  type IpsetFilterMode,
  type IpsetFilterSnapshot
} from '@renderer/utils/ipc'

interface Props {
  disabled?: boolean
  disabledReason?: string
  autoUpdateCheck: boolean
  onAutoUpdateCheckChange: (v: boolean) => void
  onManualCheckUpdate: () => Promise<void>
}

const GAME_FILTER_OPTIONS: { value: GameFilterMode; label: string; title: string }[] = [
  { value: 'off', label: 'Выкл', title: 'Не расширять диапазон портов 1024-65535' },
  { value: 'all', label: 'TCP + UDP', title: 'Расширить фильтр на TCP и UDP порты 1024-65535' },
  { value: 'tcp', label: 'TCP', title: 'Расширить фильтр только на TCP порты 1024-65535' },
  { value: 'udp', label: 'UDP', title: 'Расширить фильтр только на UDP порты 1024-65535 (голос в играх/Discord)' }
]

const IPSET_FILTER_OPTIONS: { value: IpsetFilterMode; label: string; title: string }[] = [
  { value: 'loaded', label: 'Список', title: 'Фильтр применяется только к загруженным IP из списка' },
  { value: 'none', label: 'Выкл', title: 'Фильтр не применяется — как будто список пуст из заглушки' },
  { value: 'any', label: 'Все IP', title: 'Фильтр применяется ко всем IP без ограничений (самый широкий режим)' }
]

const ZapretServiceSettingsCard: React.FC<Props> = ({
  disabled = false,
  disabledReason,
  autoUpdateCheck,
  onAutoUpdateCheckChange,
  onManualCheckUpdate
}) => {
  const [open, setOpen] = useState(false)
  const [gameFilter, setGameFilterState] = useState<GameFilterMode | null>(null)
  const [ipset, setIpset] = useState<IpsetFilterSnapshot | null>(null)
  const [busyGame, setBusyGame] = useState(false)
  const [busyIpset, setBusyIpset] = useState<IpsetFilterMode | 'update' | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  const loadedRef = useRef(false)

  const refresh = async (): Promise<void> => {
    try {
      const [gf, ip] = await Promise.all([zapretGetGameFilter(), zapretGetIpsetFilter()])
      setGameFilterState(gf)
      setIpset(ip)
    } catch {
      setGameFilterState(null)
      setIpset(null)
    }
  }

  useEffect(() => {
    if (loadedRef.current) return
    loadedRef.current = true
    void refresh()
  }, [])

  const pickGameFilter = async (mode: GameFilterMode): Promise<void> => {
    if (busyGame || mode === gameFilter) return
    setBusyGame(true)
    try {
      const next = await zapretSetGameFilter(mode)
      setGameFilterState(next)
      toast.success('Game Filter обновлён', {
        description: 'Изменения применятся после перезапуска Zapret',
        style: POWER_ON_BANNER_STYLE
      })
    } catch (e) {
      toast.error('Не удалось изменить Game Filter', {
        description: e instanceof Error ? e.message : String(e)
      })
    } finally {
      setBusyGame(false)
    }
  }

  const pickIpsetFilter = async (mode: IpsetFilterMode): Promise<void> => {
    if (busyIpset || mode === ipset?.mode) return
    setBusyIpset(mode)
    try {
      const next = await zapretSetIpsetFilter(mode)
      setIpset(next)
      toast.success('IPset Filter обновлён', {
        description: 'Изменения применятся после перезапуска Zapret',
        style: POWER_ON_BANNER_STYLE
      })
    } catch (e) {
      toast.error('Не удалось изменить IPset Filter', {
        description: e instanceof Error ? e.message : String(e)
      })
    } finally {
      setBusyIpset(null)
    }
  }

  const updateList = async (): Promise<void> => {
    if (busyIpset) return
    setBusyIpset('update')
    const tId = toast.loading('Скачиваем ipset-список…')
    try {
      const next = await zapretUpdateIpsetList()
      setIpset(next)
      toast.success(`Список обновлён — ${next.lines} записей`, { id: tId, style: POWER_ON_BANNER_STYLE })
    } catch (e) {
      toast.error('Не удалось обновить ipset-список', {
        id: tId,
        description: e instanceof Error ? e.message : String(e)
      })
    } finally {
      setBusyIpset(null)
    }
  }

  const runManualCheck = async (): Promise<void> => {
    if (checkingUpdate) return
    setCheckingUpdate(true)
    try {
      await onManualCheckUpdate()
    } finally {
      setCheckingUpdate(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <div className="min-w-0 flex-1">
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            Настройки Zapret
          </CardTitle>
        </div>
        <Button
          variant={open ? 'secondary' : 'outline'}
          size="sm"
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          onClick={() => setOpen((v) => !v)}
          className="shrink-0"
        >
          {open
            ? <><ChevronDown className="h-3.5 w-3.5" /> Свернуть</>
            : <><ChevronRight className="h-3.5 w-3.5" /> Открыть</>}
        </Button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-5 pt-0">
          {/* ---- Game Filter ---- */}
          <div>
            <div className="mb-2 flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
              <Gamepad2 className="h-3.5 w-3.5" />
              Game Filter
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Расширяет фильтрацию на порты 1024-65535 — помогает с играми и голосом в Discord,
              которые используют случайные порты.
            </p>
            {gameFilter === null ? (
              <p className="text-sm text-muted-foreground">Не удалось прочитать настройку.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {GAME_FILTER_OPTIONS.map((opt) => {
                  const active = gameFilter === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { void pickGameFilter(opt.value) }}
                      disabled={disabled || busyGame}
                      title={opt.title}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                        active ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-accent/30 text-muted-foreground',
                        (disabled || busyGame) && 'pointer-events-none opacity-50'
                      )}
                    >
                      {busyGame && active ? <Loader2 className="h-3 w-3 animate-spin inline" /> : opt.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ---- IPset Filter ---- */}
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              IPset Filter
              {ipset && (
                <span className="ml-1.5 normal-case font-normal">
                  ({ipset.lines} IP в списке)
                </span>
              )}
            </div>
            <p className="mb-2 text-xs text-muted-foreground">
              Определяет, к каким IP применяется game-фильтр: только к списку ниже, ни к одному, или ко всем.
            </p>
            {ipset === null ? (
              <p className="text-sm text-muted-foreground">Не удалось прочитать lists/ipset-all.txt.</p>
            ) : (
              <div className="flex flex-wrap items-center gap-1.5">
                {IPSET_FILTER_OPTIONS.map((opt) => {
                  const active = ipset.mode === opt.value
                  const busy = busyIpset === opt.value
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { void pickIpsetFilter(opt.value) }}
                      disabled={disabled || !!busyIpset || (opt.value === 'loaded' && !ipset.hasBackup && ipset.mode !== 'loaded')}
                      title={
                        opt.value === 'loaded' && !ipset.hasBackup && ipset.mode !== 'loaded'
                          ? 'Сначала загрузите список кнопкой «Обновить список»'
                          : opt.title
                      }
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                        active ? 'border-primary bg-primary/10 text-foreground' : 'border-border hover:bg-accent/30 text-muted-foreground',
                        (disabled || !!busyIpset) && 'pointer-events-none opacity-50'
                      )}
                    >
                      {busy ? <Loader2 className="h-3 w-3 animate-spin inline" /> : opt.label}
                    </button>
                  )
                })}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { void updateList() }}
                  disabled={disabled || !!busyIpset}
                  className="ml-1"
                  title="Скачать свежий ipset-список у Flowseal и сделать его активным"
                >
                  {busyIpset === 'update' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Обновить список
                </Button>
              </div>
            )}
          </div>

          {/* ---- Auto-update ---- */}
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">
              Проверка обновлений Zapret
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border p-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">Проверять автоматически</div>
                <div className="text-xs text-muted-foreground">
                  При открытии этой страницы Slipgate сам проверит, вышла ли новая версия Zapret
                </div>
              </div>
              <Switch
                checked={autoUpdateCheck}
                disabled={disabled}
                onCheckedChange={onAutoUpdateCheckChange}
              />
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { void runManualCheck() }}
              disabled={disabled || checkingUpdate}
              className="mt-2"
            >
              {checkingUpdate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              Проверить сейчас
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  )
}

export default ZapretServiceSettingsCard
