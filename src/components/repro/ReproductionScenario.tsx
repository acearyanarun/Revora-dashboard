import clsx from 'clsx'
import { Check, Link2, Loader2, X } from 'lucide-react'
import type { ReproductionScenario as Scenario, ScenarioStep, StepResult } from '../../types/domain'

const kindTag: Record<ScenarioStep['kind'], { label: string; cls: string } | null> = {
  setup: null,
  action: null,
  fault: { label: 'Fault injection', cls: 'bg-amber-400/10 text-amber-300 ring-amber-400/25' },
  assertion: { label: 'Assertion', cls: 'bg-sky-400/10 text-sky-300 ring-sky-400/25' },
}

export function ReproductionScenario({
  scenario,
  visibleSteps,
  activeStepId,
  results,
  failedStepLabel = 'Recovery assertion failed',
}: {
  scenario: Scenario
  visibleSteps: number
  activeStepId?: string
  results: Record<string, StepResult>
  failedStepLabel?: string
}) {
  return (
    <ol className="flex flex-col" aria-label="Reproduction steps">
      {scenario.steps.slice(0, visibleSteps).map((step, idx) => {
        const r = results[step.id]
        const active = activeStepId === step.id
        const tag = kindTag[step.kind]
        const last = idx === scenario.steps.length - 1
        return (
          <li key={step.id} className="animate-in relative flex gap-3">
            {!last && (
              <span
                aria-hidden
                className={clsx('absolute top-7 bottom-0 left-[13px] w-px transition-colors duration-500', r?.outcome === 'pass' ? 'bg-emerald-400/40' : 'bg-line-strong')}
              />
            )}
            <span
              className={clsx(
                'relative z-10 mt-1 flex size-[27px] shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset transition-all duration-300',
                !r && !active && 'bg-raised text-faint ring-line-strong',
                active && 'pulse-ring bg-sky-400/15 text-sky-300 ring-sky-400/50',
                r?.outcome === 'pass' && 'bg-emerald-400/15 text-emerald-300 ring-emerald-400/35',
                r?.outcome === 'fail' && 'bg-rose-500/20 text-rose-300 ring-rose-400/50',
              )}
            >
              {active ? <Loader2 className="size-3.5 animate-spin" /> : r?.outcome === 'pass' ? <Check className="size-3.5" /> : r?.outcome === 'fail' ? <X className="size-3.5" /> : step.order}
            </span>
            <div
              className={clsx(
                'mb-1 min-w-0 flex-1 rounded-md px-2.5 py-1 transition-colors duration-300',
                active && 'bg-sky-400/5',
                r?.outcome === 'fail' && 'bg-rose-500/[0.07] ring-1 ring-rose-400/30',
              )}
            >
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span className={clsx('text-[13px] font-medium', r?.outcome === 'fail' ? 'text-rose-200' : !r && !active ? 'text-fg/80' : 'text-fg')}>{step.title}</span>
                {tag && <span className={clsx('rounded px-1.5 py-px text-[10px] font-medium ring-1 ring-inset', tag.cls)}>{tag.label}</span>}
                {r?.outcome === 'fail' && step.kind === 'assertion' && (
                  <span className="rounded bg-rose-500/20 px-1.5 py-px text-[10px] font-semibold tracking-wide text-rose-200 uppercase">{failedStepLabel}</span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11.5px]">
                <span className="text-faint">{step.detail}</span>
                {step.derivedFrom && (
                  <span className="inline-flex max-w-full items-center gap-1 text-[10.5px] text-sky-300/70" title="Evidence this step was derived from">
                    <Link2 className="size-3 shrink-0" />
                    <span className="truncate">{step.derivedFrom}</span>
                  </span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
