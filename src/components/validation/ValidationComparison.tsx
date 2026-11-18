import clsx from 'clsx'
import { ArrowRight, Check, Minus, X } from 'lucide-react'
import { outcomeFor } from '../../lib/validation'
import type { StepOutcome, StepResult, ValidationCheck } from '../../types/domain'


function Cell({ outcome, pending }: { outcome?: StepOutcome; pending: boolean }) {
  if (!outcome)
    return (
      <span className={clsx('inline-flex items-center gap-1 text-[12px]', pending ? 'text-sky-300/70' : 'text-faint')}>
        <Minus className="size-3.5" /> {pending ? 'running' : 'not run'}
      </span>
    )
  return (
    <span
      className={clsx(
        'animate-in inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-mono text-[11.5px] font-semibold',
        outcome === 'pass' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-500/15 text-rose-300',
      )}
    >
      {outcome === 'pass' ? <Check className="size-3" /> : <X className="size-3" />}
      {outcome.toUpperCase()}
    </span>
  )
}

export function ValidationComparison({
  checks,
  original,
  corrected,
  running,
}: {
  checks: ValidationCheck[]
  original: Record<string, StepResult>
  corrected: Record<string, StepResult>
  running: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-[13px]">
        <thead>
          <tr className="border-b border-line text-left text-[11px] tracking-[0.06em] text-faint uppercase">
            <th className="px-4 py-2.5 font-medium">Check</th>
            <th className="px-4 py-2.5 font-medium">Original firmware</th>
            <th className="w-6" />
            <th className="px-4 py-2.5 font-medium">Corrected firmware</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((c) => {
            const o = outcomeFor(c.name, original)
            const n = outcomeFor(c.name, corrected)
            const changed = o && n && o !== n
            return (
              <tr key={c.name} className={clsx('border-b border-line/60 last:border-0 transition-colors', changed && 'bg-emerald-400/[0.04]')}>
                <td className="px-4 py-2.5 text-fg">
                  {c.name}
                  {changed && <span className="ml-2 text-[11px] text-emerald-300/80">recovered</span>}
                </td>
                <td className="px-4 py-2.5">
                  <Cell outcome={o} pending={running} />
                </td>
                <td className="text-faint">
                  <ArrowRight className="size-3.5" />
                </td>
                <td className="px-4 py-2.5">
                  <Cell outcome={n} pending={running} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
