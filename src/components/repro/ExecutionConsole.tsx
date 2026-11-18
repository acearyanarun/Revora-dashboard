import clsx from 'clsx'
import { useEffect, useRef } from 'react'
import type { RunStatus } from '../../hooks/useExecution'
import type { ExecutionLogLine } from '../../types/domain'

const levelCls: Record<ExecutionLogLine['level'], string> = {
  info: 'text-slate-300',
  warn: 'text-amber-200',
  error: 'text-rose-300',
  system: 'text-slate-500',
  result: 'font-semibold',
}

export function ExecutionConsole({
  log,
  status,
  height = 'h-[300px]',
  title = 'Execution console',
  progress,
  resultTone,
}: {
  log: ExecutionLogLine[]
  status: RunStatus
  height?: string
  title?: string
  progress?: number
  /** How to color the final RESULT line. A failing original run is the desired outcome. */
  resultTone?: 'reproduced' | 'pass' | 'neutral'
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (el) el.scrollTop = el.scrollHeight
  }, [log.length])

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-line bg-[#05080f]">
      <div className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-[#1e293b]" />
          <span className="size-2.5 rounded-full bg-[#1e293b]" />
          <span className="size-2.5 rounded-full bg-[#1e293b]" />
        </span>
        <span className="ml-1 text-[11.5px] text-muted">{title}</span>
        <span
          className={clsx(
            'ml-auto inline-flex items-center gap-1.5 text-[11px]',
            status === 'running' ? 'text-sky-300' : status === 'done' ? 'text-muted' : status === 'error' ? 'text-rose-300' : status === 'aborted' ? 'text-amber-300' : 'text-faint',
          )}
        >
          <span className={clsx('size-1.5 rounded-full', status === 'running' ? 'animate-pulse bg-sky-400' : status === 'aborted' ? 'bg-amber-400' : 'bg-slate-600')} />
          {status === 'running' ? 'Running' : status === 'done' ? 'Finished' : status === 'aborted' ? 'Stopped' : status === 'error' ? 'Runner error' : 'Idle'}
        </span>
      </div>
      {progress != null && (
        <div className="h-0.5 bg-line/60">
          <div className="h-full bg-sky-400 transition-[width] duration-300 ease-out" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      )}
      <div ref={ref} className={clsx('overflow-y-auto px-3 py-2.5 font-mono text-[12px] leading-[1.7]', height)} role="log" aria-live="polite">
        {log.length === 0 && status === 'idle' && <div className="text-slate-600">$ waiting for run…</div>}
        {log.map((l, i) => (
          <div
            key={i}
            className={clsx(
              'animate-in flex gap-2',
              levelCls[l.level],
              l.level === 'result' && 'mt-2 border-t border-line pt-2',
              l.level === 'result' && (resultTone === 'reproduced' ? 'text-rose-300' : resultTone === 'pass' ? 'text-emerald-300' : 'text-fg'),
            )}
          >
            {l.level !== 'result' && <span className="shrink-0 text-slate-600 select-none">[{l.ts}]</span>}
            <span className="break-words">{l.message}</span>
          </div>
        ))}
        {status === 'running' && <span className="inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse bg-sky-400/80" aria-hidden />}
      </div>
    </div>
  )
}
