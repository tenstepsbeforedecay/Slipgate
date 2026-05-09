import React from 'react'
import { Switch } from '@renderer/components/ui/switch'
import { cn } from '@renderer/lib/utils'
import { Loader2 } from 'lucide-react'

interface SwitcherCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  subtitle?: React.ReactNode
  status: CoreStatus
  onToggle: (next: boolean) => void | Promise<void>
  footer?: React.ReactNode
  onClick?: () => void
  className?: string
  version?: string
  disabled?: boolean
}

const stateText: Record<CoreStatusState, string> = {
  stopped:  'Off',
  starting: 'Starting',
  running:  'On',
  stopping: 'Stopping',
  error:    'Error'
}

const SwitcherCard: React.FC<SwitcherCardProps> = ({
  icon: Icon,
  title,
  subtitle,
  status,
  onToggle,
  footer,
  onClick,
  className,
  version,
  disabled = false
}) => {
  const [pending, setPending] = React.useState<null | boolean>(null)
  const ipcRunning = status.state === 'running'
  const on = pending ?? ipcRunning
  const ipcTransitioning = status.state === 'starting' || status.state === 'stopping'
  const transitioning = ipcTransitioning || pending !== null
  const errored = status.state === 'error'
  const locked = transitioning || disabled

  const handleChange = async (next: boolean): Promise<void> => {
    if (locked) return
    setPending(next)
    try {
      await Promise.resolve(onToggle(next))
    } finally {
      setPending(null)
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'relative overflow-hidden rounded-xl border p-4 transition-all',
        'flex flex-col gap-3',
        onClick && 'cursor-pointer hover:-translate-y-0.5',
        on &&
          'border-stroke-power-on bg-gradient-to-br from-gradient-start-power-on/55 to-gradient-end-power-on/55 text-white shadow-lg shadow-gradient-end-power-on/20',
        !on && !errored &&
          'border-stroke bg-card/50 backdrop-blur-xl',
        errored &&
          'border-stroke-power-off bg-gradient-to-br from-gradient-start-power-off/45 to-gradient-end-power-off/45 text-white',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'size-10 rounded-lg flex items-center justify-center shrink-0',
            on && 'bg-white/20',
            !on && !errored && 'bg-muted/60',
            errored && 'bg-white/20'
          )}
        >
          <Icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold truncate">{title}</div>
          {subtitle && (
            <div
              className={cn(
                'text-xs truncate mt-0.5',
                on ? 'text-white/85' : errored ? 'text-white/85' : 'text-muted-foreground'
              )}
            >
              {subtitle}
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Switch
            checked={on}
            disabled={locked}
            onCheckedChange={handleChange}
          />
          {version && (
            <div
              className={cn(
                'text-[10px] tabular-nums leading-none',
                on ? 'text-white/80' : errored ? 'text-white/80' : 'text-muted-foreground'
              )}
            >
              v{version}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium',
            on ? 'text-white/90' : errored ? 'text-white/90' : 'text-muted-foreground'
          )}
        >
          {transitioning && <Loader2 className="size-3 animate-spin" />}
          <span>{stateText[status.state]}</span>
        </div>
        {footer && (
          <div
            className={cn(
              'text-xs',
              on ? 'text-white/80' : errored ? 'text-white/80' : 'text-muted-foreground'
            )}
          >
            {footer}
          </div>
        )}
      </div>

      {errored && status.lastError && (
        <div className="text-[11px] text-white/90 bg-black/20 rounded-md px-2 py-1.5 truncate">
          {status.lastError}
        </div>
      )}
    </div>
  )
}

export default SwitcherCard
