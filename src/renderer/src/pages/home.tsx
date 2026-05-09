import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import NumberFlow from '@number-flow/react'
import BasePage from '@renderer/components/base/base-page'
import { Spinner } from '@renderer/components/ui/spinner'
import { CharacterMorph } from '@renderer/components/ui/character-morph'
import { useTgwsStore } from '@renderer/store/tgws-store'
import { useZapretStore } from '@renderer/store/zapret-store'
import { useZapretTestStore } from '@renderer/store/zapret-test-store'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import {
  tgwsStart, tgwsStop, tgwsRestart,
  zapretStart, zapretStop, zapretRestart,
  zapretCheckUpdate, tgwsCheckUpdate,
  getAppVersion,
  type ZapretUpdateInfo, type TgwsUpdateInfo
} from '@renderer/utils/ipc'
import { Button } from '@renderer/components/ui/button'
import { POWER_ON_BANNER_STYLE, BUNDLED_TGWS_VERSION, BUNDLED_ZAPRET_VERSION } from '@renderer/lib/utils'
import { RotateCw, Sparkles, X } from 'lucide-react'
import Power from '@renderer/assets/on_icon.svg'
import Pause from '@renderer/assets/pause_icon.svg'

interface PowerToggleProps {
  label: string
  status: CoreStatus
  onToggle: (next: boolean) => Promise<void> | void
  // Currently-installed upstream version of the underlying binary (e.g.
  version?: string
  disabled?: boolean
  disabledReason?: string
}

const PowerToggle: React.FC<PowerToggleProps> = ({
  label, status, onToggle, version, disabled = false, disabledReason
}) => {
  const { t } = useTranslation()
  const [pending, setPending] = useState<null | boolean>(null)
  const isSelected = pending ?? status.state === 'running'
  const ipcLoading = status.state === 'starting' || status.state === 'stopping'
  const loading = ipcLoading || pending !== null
  const loadingDirection: 'connecting' | 'disconnecting' =
    status.state === 'stopping' || pending === false ? 'disconnecting' : 'connecting'

  const handleClick = async (): Promise<void> => {
    if (loading || disabled) return
    const next = !isSelected
    setPending(next)
    try {
      await onToggle(next)
    } finally {
      setPending(null)
    }
  }

  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    if (!isSelected || !status.startedAt) {
      setElapsed(0)
      return
    }
    const tick = (): void => setElapsed(Math.floor((Date.now() - status.startedAt!) / 1000))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [isSelected, status.startedAt])

  const statusText = loading
    ? loadingDirection === 'connecting'
      ? t('pages.home.connecting', { defaultValue: 'ПОДКЛЮЧЕНИЕ' })
      : t('pages.home.disconnecting', { defaultValue: 'ОТКЛЮЧЕНИЕ' })
    : isSelected
      ? t('pages.home.connected', { defaultValue: 'ПОДКЛЮЧЕНО' })
      : t('pages.home.disconnected', { defaultValue: 'ОТКЛЮЧЕНО' })
  const reserveTexts = [
    t('pages.home.connecting', { defaultValue: 'ПОДКЛЮЧЕНИЕ' }),
    t('pages.home.disconnecting', { defaultValue: 'ОТКЛЮЧЕНИЕ' }),
    t('pages.home.connected', { defaultValue: 'ПОДКЛЮЧЕНО' }),
    t('pages.home.disconnected', { defaultValue: 'ОТКЛЮЧЕНО' })
  ]

  const showTimer = !loading && isSelected
  const h = Math.floor(elapsed / 3600)
  const m = Math.floor((elapsed % 3600) / 60)
  const s = elapsed % 60

  return (
    <div className="flex flex-col items-center justify-center min-w-0">
      {/* Service label */}
      <div className="mb-1 text-sm font-medium text-foreground/80 uppercase tracking-wider">
        {label}
      </div>

      {/* Status text — animated character morph */}
      <div className="mb-3 flex h-6 items-center justify-center">
        <CharacterMorph
          texts={[statusText]}
          reserveTexts={reserveTexts}
          interval={3000}
          className="h-6 leading-none text-foreground font-semibold uppercase"
        />
      </div>

      {/* The disc */}
      <button
        disabled={loading || disabled}
        onClick={handleClick}
        title={disabled ? disabledReason : undefined}
        className={`relative group transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
          disabled ? 'opacity-60' : ''
        }`}
      >
        <div
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 bg-radial-[at_30%_45%] backdrop-blur-xl border-2 ${
            isSelected
              ? 'from-gradient-start-power-on/60 to-gradient-end-power-on/60 border-stroke-power-on'
              : 'from-gradient-start-power-off/60 to-gradient-end-power-off/60 border-stroke-power-off'
          }`}
        >
          <div className="relative size-16">
            <Spinner
              className={`absolute inset-0 m-auto size-16 text-[#FAFAFA] transition-all duration-300 ease-out ${
                loading ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            />
            <img
              src={Pause}
              alt=""
              className={`absolute inset-0 size-16 fill-foreground transition-all duration-300 ease-out ${
                !loading && isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            />
            <img
              src={Power}
              alt=""
              className={`absolute inset-0 size-16 fill-foreground transition-all duration-300 ease-out ${
                !loading && !isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
            />
          </div>
        </div>
      </button>

      {/* Animated uptime timer */}
      <div className="mt-3 h-8 flex items-center justify-center">
        <div
          aria-hidden={!showTimer}
          className={`inline-flex items-center gap-0.5 text-base font-bold text-foreground tabular-nums transition-all duration-300 ease-out ${
            showTimer ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1'
          }`}
        >
          <NumberFlow value={h} format={{ minimumIntegerDigits: 2, useGrouping: false }} />
          <span>:</span>
          <NumberFlow value={m} format={{ minimumIntegerDigits: 2, useGrouping: false }} />
          <span>:</span>
          <NumberFlow value={s} format={{ minimumIntegerDigits: 2, useGrouping: false }} />
        </div>
      </div>

      {version && (
        <div className="mt-1 text-[11px] text-foreground/60 text-center tabular-nums">
          v{version}
        </div>
      )}

      {disabled && disabledReason && (
        <div className="mt-1 max-w-[180px] text-[11px] text-foreground/70 text-center leading-tight">
          {disabledReason}
        </div>
      )}

      {status.lastError && (
        <div className="mt-2 text-[11px] text-stroke-power-off text-center max-w-xs truncate">
          {status.lastError}
        </div>
      )}
    </div>
  )
}

interface UpdateNoticeProps {
  title: string
  subtitle: string
  onDetails: () => void
  onDismiss: () => void
}
const UpdateNotice: React.FC<UpdateNoticeProps> = ({ title, subtitle, onDetails, onDismiss }) => (
  <div className="relative flex items-center gap-3 rounded-lg border border-stroke bg-card/70 backdrop-blur-xl px-4 py-2.5">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
      <Sparkles className="h-4 w-4" />
    </div>
    <div className="min-w-0 flex-1">
      <div className="text-sm font-medium truncate text-foreground">{title}</div>
      <div className="text-xs text-muted-foreground truncate">{subtitle}</div>
    </div>
    <div className="flex shrink-0 items-center gap-1">
      <Button size="sm" onClick={onDetails}>
        Подробнее
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={onDismiss}
        title="Скрыть"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  </div>
)

const Home: React.FC = () => {
  const navigate = useNavigate()
  const tgws = useTgwsStore((s) => s.status)
  const zapret = useZapretStore((s) => s.status)
  // Block the Zapret toggle while the strategy tester is iterating —
  // a click here would race the lock held by zapret-tester.ts in main
  // and queue silently behind the test, which feels like a stuck button.
  const isZapretTesting = useZapretTestStore((s) => s.isRunning)
  const { appConfig } = useAppConfig()

  const zapretStrategy = appConfig?.zapret?.activeStrategy

  // ---- Update notices (Zapret + TgWsProxy)
  const [zapretUpdate, setZapretUpdate] = useState<ZapretUpdateInfo | null>(null)
  const [tgwsUpdate, setTgwsUpdate] = useState<TgwsUpdateInfo | null>(null)
  const [zapretSessionDismissed, setZapretSessionDismissed] = useState(false)
  const [tgwsSessionDismissed, setTgwsSessionDismissed] = useState(false)
  useEffect(() => {
    zapretCheckUpdate(false).then(setZapretUpdate).catch(() => setZapretUpdate(null))
    tgwsCheckUpdate(false).then(setTgwsUpdate).catch(() => setTgwsUpdate(null))
  }, [])
  const showZapretBanner =
    !!zapretUpdate &&
    zapretUpdate.hasUpdate &&
    !zapretUpdate.dismissed &&
    !!zapretUpdate.assetUrl &&
    !zapretSessionDismissed
  const showTgwsBanner =
    !!tgwsUpdate &&
    tgwsUpdate.hasUpdate &&
    !tgwsUpdate.dismissed &&
    !!tgwsUpdate.assetUrl &&
    !tgwsSessionDismissed

  const toggleTgws = async (next: boolean): Promise<void> => {
    try {
      if (next) await tgwsStart()
      else await tgwsStop()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(next ? 'Не удалось запустить Telegram' : 'Не удалось остановить Telegram', {
        description: msg
      })
    }
  }
  const toggleZapret = async (next: boolean): Promise<void> => {
    if (next && !zapretStrategy) {
      navigate('/zapret', { state: { autoStart: true } })
      return
    }
    try {
      if (next) await zapretStart()
      else await zapretStop()
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error(next ? 'Не удалось запустить Zapret' : 'Не удалось остановить Zapret', {
        description: msg
      })
    }
  }

  // App version pulled from main via IPC (electron's app.getVersion()
  const [appVersion, setAppVersion] = useState<string | null>(null)
  useEffect(() => {
    getAppVersion().then(setAppVersion).catch(() => setAppVersion(null))
  }, [])

  const [reloading, setReloading] = useState(false)
  const handleReloadAll = async (): Promise<void> => {
    if (reloading) return
    setReloading(true)
    try {
      const tasks: Promise<unknown>[] = []
      if (tgws.state === 'running' || tgws.state === 'error') tasks.push(tgwsRestart())
      if (zapret.state === 'running' || zapret.state === 'error') tasks.push(zapretRestart())
      if (tasks.length === 0) {
        // Style the toast with the same red radial gradient + power-off
        // border that the big disabled power buttons use, so the visual
        // language stays consistent: red = "nothing is running".
        toast.info('Нет запущенных процессов для перезагрузки', {
          style: {
            background:
              'radial-gradient(at 30% 45%, color-mix(in oklab, var(--gradient-start-power-off) 60%, transparent), color-mix(in oklab, var(--gradient-end-power-off) 60%, transparent))',
            borderColor: 'var(--stroke-power-off)',
            color: 'var(--foreground)'
          }
        })
        return
      }
      await Promise.allSettled(tasks)
      // Mirror the green radial-gradient look of the active power buttons so
      // the success toast reads as "everything is on" at a glance.
      toast.success('Процессы перезагружены', {
        style: POWER_ON_BANNER_STYLE
      })
    } catch (e) {
      toast.error('Не удалось перезагрузить процессы', {
        description: e instanceof Error ? e.message : String(e)
      })
    } finally {
      setReloading(false)
    }
  }

  return (
    <BasePage>
      <div className="relative flex flex-col h-full">
        {(showZapretBanner || showTgwsBanner) && (
          <div className="px-4 pt-2 space-y-2">
            {showZapretBanner && zapretUpdate && (
              <UpdateNotice
                title={`Доступно обновление Zapret — v${zapretUpdate.latest}`}
                subtitle={`Текущая версия: v${zapretUpdate.installed ?? '?'}`}
                onDetails={() => navigate('/zapret')}
                onDismiss={() => setZapretSessionDismissed(true)}
              />
            )}
            {showTgwsBanner && tgwsUpdate && (
              <UpdateNotice
                title={`Доступно обновление TgWsProxy — v${tgwsUpdate.latest}`}
                subtitle={`Текущая версия: v${tgwsUpdate.installed ?? '?'}`}
                onDetails={() => navigate('/telegram')}
                onDismiss={() => setTgwsSessionDismissed(true)}
              />
            )}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-4 flex-1 items-center">
          <PowerToggle
            label="Telegram"
            status={tgws}
            onToggle={toggleTgws}
            version={appConfig?.tgws?.installedVersion ?? tgwsUpdate?.installed ?? BUNDLED_TGWS_VERSION}
          />
          <PowerToggle
            label="Zapret"
            status={zapret}
            onToggle={toggleZapret}
            version={appConfig?.zapret?.installedVersion ?? zapretUpdate?.installed ?? BUNDLED_ZAPRET_VERSION}
            disabled={isZapretTesting}
            disabledReason={
              isZapretTesting
                ? 'Идёт тестирование стратегий — переключатель заблокирован'
                : undefined
            }
          />
        </div>
        <div className="flex justify-center pt-8 pb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReloadAll}
            disabled={reloading}
            title="Перезагрузить процессы"
          >
            <RotateCw className={`size-4 mr-1 ${reloading ? 'animate-spin' : ''}`} />
            Перезагрузить процессы
          </Button>
        </div>
        {/* Bottom-right app version badge. Anchored to the home page's
            relative wrapper above so it doesn't drift when the BasePage
            scrollable content area resizes. The version string is pulled
            live from electron's app.getVersion() which mirrors
            package.json — auto-updater swaps it after each successful
            in-place upgrade. */}
        {appVersion && (
          <div className="pointer-events-none absolute bottom-2 right-3 text-[11px] text-muted-foreground/70 select-none">
            Текущая версия приложения <span className="font-mono">v{appVersion}</span>
          </div>
        )}
      </div>
    </BasePage>
  )
}

export default Home
