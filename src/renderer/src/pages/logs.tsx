import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
import { useLogsStore, formatLogTime } from '@renderer/store/logs-store'
import { Button } from '@renderer/components/ui/button'
import { Input } from '@renderer/components/ui/input'
import { Separator } from '@renderer/components/ui/separator'
import { MapPin, Trash2 } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import BasePage from '@renderer/components/base/base-page'

const sourceColor: Record<CoreSource, string> = {
  tgws: 'text-sky-500',
  zapret: 'text-violet-500',
  app: 'text-muted-foreground'
}

const sourceLabels: Record<'all' | CoreSource, string> = {
  all: 'все',
  tgws: 'telegram',
  zapret: 'zapret',
  app: 'система'
}

const Logs: React.FC = () => {
  const clearLogs = useLogsStore((s) => s.clear)
  const [logs, setLogs] = useState<ControllerLog[]>(() => useLogsStore.getState().logs)
  const [filter, setFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState<CoreSource | 'all'>('all')
  const [trace, setTrace] = useState(true)
  const traceRef = useRef(trace)
  const virtuosoRef = useRef<VirtuosoHandle>(null)

  const filteredLogs = useMemo(() => {
    const fl = filter.toLowerCase()
    return logs.filter((log) => {
      if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
      if (!fl) return true
      return log.payload.toLowerCase().includes(fl) || log.type.toLowerCase().includes(fl)
    })
  }, [logs, filter, sourceFilter])

  const toggleTrace = useCallback(() => {
    setTrace((prev) => {
      const next = !prev
      traceRef.current = next
      if (next) setLogs([...useLogsStore.getState().logs])
      return next
    })
  }, [])

  useEffect(() => {
    if (!trace) return
    virtuosoRef.current?.scrollToIndex({
      index: filteredLogs.length - 1,
      behavior: 'smooth',
      align: 'end'
    })
  }, [filteredLogs, trace])

  useEffect(() => {
    return useLogsStore.subscribe((state) => {
      if (traceRef.current) setLogs([...state.logs])
    })
  }, [])

  return (
    <BasePage
      title="Логи"
      contentClassName="flex flex-col"
      header={
        <button
          type="button"
          title="Очистить логи"
          aria-label="Очистить логи"
          className="cursor-pointer p-1.5 rounded-md text-destructive transition-all duration-150 active:scale-[0.9] active:duration-75 hover:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-stroke"
          onClick={() => {
            clearLogs()
            setLogs([])
          }}
        >
          <Trash2 className="size-4" />
        </button>
      }
    >
      <div className="flex flex-col h-full">
      <div className="px-4 py-2 flex items-center gap-2">
        <Input
          className="h-8 text-sm"
          value={filter}
          placeholder="Фильтр..."
          onChange={(e) => setFilter(e.target.value)}
        />
        {(['all', 'tgws', 'zapret', 'app'] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={sourceFilter === s ? 'default' : 'outline'}
            onClick={() => setSourceFilter(s)}
          >
            {sourceLabels[s]}
          </Button>
        ))}
        <Button
          size="icon-sm"
          className={cn('p-0', trace && 'bg-primary text-primary-foreground')}
          variant={trace ? 'default' : 'outline'}
          title="Следовать за хвостом"
          onClick={toggleTrace}
        >
          <MapPin className="size-4" />
        </Button>
      </div>
      <Separator />
      <div className="flex-1 min-h-0 font-mono text-xs">
        <Virtuoso
          ref={virtuosoRef}
          data={filteredLogs}
          initialTopMostItemIndex={filteredLogs.length - 1}
          followOutput={trace}
          itemContent={(_i, log) => (
            <div className="px-4 py-0.5 flex gap-2 items-baseline hover:bg-accent/20">
              <span className="text-muted-foreground shrink-0">{formatLogTime(log.time)}</span>
              <span className={cn('shrink-0 font-semibold w-14', sourceColor[log.source])}>
                {log.source}
              </span>
              <span
                className={cn(
                  'shrink-0 w-10',
                  log.type === 'error' && 'text-red-500',
                  log.type === 'warn' && 'text-yellow-500'
                )}
              >
                {log.type}
              </span>
              <span className="break-all whitespace-pre-wrap">{log.payload}</span>
            </div>
          )}
        />
      </div>
      </div>
    </BasePage>
  )
}

export default Logs
