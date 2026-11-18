import clsx from 'clsx'
import { Check, X } from 'lucide-react'
import type { WorkflowStage } from '../../lib/status'

export function WorkflowStepper({ stages, compact }: { stages: WorkflowStage[]; compact?: boolean }) {
  return (
    <ol className={clsx('grid gap-2', compact ? 'grid-cols-6' : 'grid-cols-2 sm:grid-cols-3 xl:grid-cols-6')} aria-label="Investigation workflow">
      {stages.map((s, i) => (
        <li key={s.key} className="relative min-w-0">
          <div
            className={clsx(
              'h-1 rounded-full transition-colors duration-500',
              s.state === 'complete' && 'bg-emerald-400/80',
              s.state === 'current' && 'bg-sky-400',
              s.state === 'pending' && 'bg-line-strong',
              s.state === 'failed' && 'bg-rose-400',
            )}
          />
          {!compact && (
            <div className="mt-2.5 flex items-start gap-2">
              <span
                className={clsx(
                  'mt-px flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ring-1 ring-inset',
                  s.state === 'complete' && 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/30',
                  s.state === 'current' && 'pulse-ring bg-sky-400/15 text-sky-300 ring-sky-400/40',
                  s.state === 'pending' && 'bg-raised text-faint ring-line-strong',
                  s.state === 'failed' && 'bg-rose-400/15 text-rose-300 ring-rose-400/30',
                )}
              >
                {s.state === 'complete' ? <Check className="size-3" /> : s.state === 'failed' ? <X className="size-3" /> : i + 1}
              </span>
              <div className="min-w-0">
                <div className={clsx('truncate text-[12.5px] font-medium', s.state === 'pending' ? 'text-muted' : 'text-fg')}>{s.label}</div>
                <div
                  className={clsx(
                    'truncate text-[11.5px]',
                    s.state === 'current' ? 'text-sky-300/90' : s.state === 'failed' ? 'text-rose-300/90' : 'text-faint',
                  )}
                >
                  {s.detail}
                </div>
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
