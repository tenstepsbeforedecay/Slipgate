import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTgwsStore } from '@renderer/store/tgws-store'
import {
  tgwsGetLink, tgwsStart, tgwsStop, tgwsRestart,
  writeClipboard, openTelegramLink,
  tgwsCheckUpdate, tgwsInstallUpdate, tgwsDismissUpdate,
  type TgwsUpdateInfo
} from '@renderer/utils/ipc'
import { useAppConfig } from '@renderer/hooks/use-app-config'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Label } from '@renderer/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@renderer/components/ui/card'
import { Copy, ExternalLink, MoreVertical, Download, Loader2, Sparkles } from 'lucide-react'
import TelegramIcon from '@renderer/components/telegram-icon'
import ReloadTgwsIcon from '@renderer/components/reload-tgws-icon'
import BasePage from '@renderer/components/base/base-page'
import SwitcherCard from '@renderer/components/switcher-card'
import { cn, POWER_ON_BANNER_STYLE, BUNDLED_TGWS_VERSION } from '@renderer/lib/utils'

// Re-export the shared banner style under the legacy name so the
// existing toast.success({ style: POWER_ON_TOAST_STYLE }) call sites
// don't need touching. Source of truth lives in lib/utils.ts.
const POWER_ON_TOAST_STYLE = POWER_ON_BANNER_STYLE

function generateTgwsSecret(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

const TelegramPage: React.FC = () => {
  const status = useTgwsStore((s) => s.status)
  const { appConfig, patchAppConfig } = useAppConfig()
  const [link, setLink] = useState('')
  const tgws = appConfig?.tgws

  useEffect(() => {
    tgwsGetLink().then(setLink).catch(() => setLink(''))
  }, [tgws?.host, tgws?.port, tgws?.secret, status.state])

  const running = status.state === 'running'

  // ---- Auto-update banner
  const [updateInfo, setUpdateInfo] = useState<TgwsUpdateInfo | null>(null)
  const [installing, setInstalling] = useState(false)
  const installingRef = useRef(false)

  useEffect(() => {
    tgwsCheckUpdate(false).then(setUpdateInfo).catch(() => setUpdateInfo(null))
  }, [])

  const showBanner = !!updateInfo && updateInfo.hasUpdate && !updateInfo.dismissed && !!updateInfo.assetUrl

  const installUpdate = async (): Promise<void> => {
    if (installingRef.current || !updateInfo?.assetUrl) return
    installingRef.current = true
    setInstalling(true)
    const tId = toast.loading('Скачиваем TgWsProxy…', {
      description: updateInfo.assetName ?? `v${updateInfo.latest}`
    })
    try {
      const res = await tgwsInstallUpdate(updateInfo.assetUrl, updateInfo.latest)
      const mb = (res.sizeBytes / (1024 * 1024)).toFixed(1)
      toast.success('TgWsProxy обновлён', {
        id: tId,
        description: `Версия ${res.installedVersion ?? updateInfo.latest} — ${mb} МБ`,
        // Same vivid power-on green as the other success toasts (copy-link,
        // regenerate-key, processes-reloaded) and the active home-page
        // power-on disc, so success feedback across the app is one colour.
        style: POWER_ON_TOAST_STYLE
      })
      // Re-check so the banner disappears immediately.
      const fresh = await tgwsCheckUpdate(true).catch(() => null)
      setUpdateInfo(fresh)
      // If the proxy was running we already stopped it server-side to free
      // the .exe write lock; restart it so the user doesn't have to.
      if (running) {
        try { await tgwsStart() } catch { /* user can retry from the toggle */ }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      toast.error('Не удалось обновить TgWsProxy', { id: tId, description: msg })
    } finally {
      setInstalling(false)
      installingRef.current = false
    }
  }

  const dismissUpdate = (): void => {
    if (!updateInfo?.latest) return
    void tgwsDismissUpdate(updateInfo.latest).catch(() => void 0)
    setUpdateInfo({ ...updateInfo, dismissed: true })
  }

  const regeneratingRef = useRef(false)
  const [regenerating, setRegenerating] = useState(false)
  const handleRegenerateLink = async (): Promise<void> => {
    if (regeneratingRef.current || !tgws) return
    regeneratingRef.current = true
    setRegenerating(true)
    try {
      const newSecret = generateTgwsSecret()
      await patchAppConfig({ tgws: { ...tgws, secret: newSecret } })
      try {
        const updated = await tgwsGetLink()
        setLink(updated)
      } catch {
        setLink('')
      }
      if (running) {
        await tgwsRestart().catch(() => void 0)
      }
      toast.success('Ключ и ссылка изменены', { style: POWER_ON_TOAST_STYLE })
    } finally {
      setRegenerating(false)
      regeneratingRef.current = false
    }
  }

  return (
    <BasePage title="Telegram">
      <div className="px-4 pb-6 space-y-4">
        {showBanner && updateInfo && (
          <div className={cn(
            'relative flex items-center gap-3 rounded-lg border border-stroke bg-card/70 backdrop-blur-xl px-4 py-3 transition',
            installing && 'pointer-events-none opacity-80'
          )}>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/15 text-primary">
              {installing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Sparkles className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-foreground">
                {installing
                  ? 'Устанавливаем TgWsProxy…'
                  : `Доступно обновление TgWsProxy — v${updateInfo.latest}`}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {installing
                  ? 'Останавливаем прокси, перезаписываем бинарник…'
                  : `Текущая версия: v${updateInfo.installed ?? '?'}`}
              </div>
            </div>
            {!installing && (
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="ghost" size="sm" onClick={dismissUpdate}>
                  Позже
                </Button>
                <Button size="sm" onClick={() => { void installUpdate() }}>
                  <Download className="h-3.5 w-3.5" />
                  Обновить
                </Button>
              </div>
            )}
          </div>
        )}

        <SwitcherCard
          icon={TelegramIcon}
          title="Telegram"
          subtitle={`${tgws?.host ?? '127.0.0.1'}:${tgws?.port ?? 1443}`}
          version={tgws?.installedVersion ?? updateInfo?.installed ?? BUNDLED_TGWS_VERSION}
          status={status}
          onToggle={(v) => (v ? tgwsStart() : tgwsStop()).catch(() => void 0)}
          footer={running ? null : 'Нажмите для запуска'}
        />

      <Card>
        <CardHeader>
          <CardTitle>Подключение</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Input readOnly value={link} className="font-mono text-xs" />
            <Button
              size="icon-sm"
              variant="outline"
              onClick={async () => {
                if (!link) return
                await writeClipboard(link)
                toast.success('Ссылка скопирована', { style: POWER_ON_TOAST_STYLE })
              }}
              title="Копировать ссылку"
            >
              <Copy className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={() => link && openTelegramLink(link).catch(() => void 0)}
              title="Открыть в Telegram"
            >
              <ExternalLink className="size-4" />
            </Button>
            <Button
              size="icon-sm"
              variant="outline"
              onClick={handleRegenerateLink}
              disabled={regenerating}
              title="Сменить ключ и ссылку"
            >
              {regenerating
                ? <Loader2 className="size-4 animate-spin" />
                : <ReloadTgwsIcon className="size-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground inline-flex flex-wrap items-center gap-x-1 gap-y-0.5">
            Вставьте ссылку в Telegram
            <span className="opacity-70">&rarr;</span>
            Настройки
            <span className="opacity-70">&rarr;</span>
            Продвинутые настройки
            <span className="opacity-70">&rarr;</span>
            Тип соединения
            <span className="opacity-70">&rarr;</span>
            <MoreVertical className="size-3.5 translate-y-px -mx-1.5" />
            <span>или нажмите на</span>
            <ExternalLink className="size-3.5 translate-y-px" />
            <span>для автоматического подключения.</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Параметры</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-4">
          <div className="space-y-1.5">
            <Label>Хост</Label>
            <Input
              value={tgws?.host ?? ''}
              onChange={(e) => patchAppConfig({ tgws: { ...tgws!, host: e.target.value } })}
              placeholder="127.0.0.1"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Порт</Label>
            <Input
              type="number"
              value={tgws?.port ?? 1443}
              onChange={(e) =>
                patchAppConfig({ tgws: { ...tgws!, port: Number(e.target.value) || 1443 } })
              }
            />
          </div>
          <div className="md:col-span-2 space-y-1.5">
            <Label>Секретный ключ (32-hex MTProto)</Label>
            <Input
              value={tgws?.secret ?? ''}
              onChange={(e) => patchAppConfig({ tgws: { ...tgws!, secret: e.target.value.trim() } })}
              className="font-mono text-xs"
            />
          </div>
        </CardContent>
      </Card>

      {status.lastError && (
        <Card className="border-red-500/50">
          <CardContent className="pt-4">
            <p className="text-sm text-red-500">{status.lastError}</p>
          </CardContent>
        </Card>
      )}
      </div>
    </BasePage>
  )
}

export default TelegramPage
