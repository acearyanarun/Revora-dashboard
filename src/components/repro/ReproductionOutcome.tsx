import clsx from 'clsx'
import { ArrowRight, Bug, CheckCircle2, CircleSlash, OctagonX } from 'lucide-react'
import type { ReproductionScenario, TestExecution } from '../../types/domain'
import { LinkButton } from '../ui/primitives'

export function ReproductionOutcome({ execution, scenario, nextHref }: { execution: TestExecution; scenario: ReproductionScenario; nextHref?: string }) {
  if (execution.interpretation === 'aborted') {
    return (
      <div className="animate-in flex items-center gap-3 rounded-lg border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-[13px] text-amber-100">
        <CircleSlash className="size-4 text-amber-300" />
        Execution stopped before completion. No conclusion can be drawn — run the reproduction again.
      </div>
    )
  }

  const reproduced = execution.interpretation === 'target_failure_reproduced'
  const demo = execution.engine === 'demo-simulation'
  const failedStep = scenario.steps.find((s) => execution.stepResults.find((r) => r.stepId === s.id)?.outcome === 'fail' && s.kind === 'assertion')

  return (
    <div
      className={clsx(
        'animate-in overflow-hidden rounded-xl border',
        reproduced ? 'border-emerald-400/30 bg-gradient-to-br from-emerald-400/[0.08] to-transparent' : 'border-line-strong bg-raised',
      )}
    >
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start">
        <div className={clsx('flex size-10 shrink-0 items-center justify-center rounded-lg', reproduced ? 'bg-emerald-400/15 text-emerald-300' : 'bg-line text-muted')}>
          {reproduced ? <Bug className="size-5" /> : <OctagonX className="size-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={clsx('text-[17px] font-semibold tracking-tight', reproduced ? 'text-emerald-200' : 'text-fg')}>
              {reproduced ? demo ? 'Simulated Target Failure' : 'Target Failure Reproduced' : 'Target failure not reproduced'}
            </h3>
            <span className="mono rounded bg-rose-500/15 px-1.5 py-0.5 text-[11px] text-rose-300">
              harness verdict: {execution.verdict.toUpperCase()}
            </span>
          </div>
          {reproduced ? (
            <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-muted">
              {demo ? 'This is a scripted browser demonstration, not evidence that real firmware failed. Connect a physical runner to confirm the scenario.' : <>
                The runner reported a failed recovery assertion on <span className="mono text-fg">{execution.firmwareRef}</span>. Compare the raw serial and broker captures with the original incident before accepting the reproduction.
              </>}
            </p>
          ) : (
            <p className="mt-1.5 text-[13px] text-muted">All assertions passed on the original firmware, so this scenario does not recreate the field failure.</p>
          )}

          {reproduced && (
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              {scenario.targetFailureSignature.map((sig) => (
                <div key={sig} className="flex items-start gap-2 rounded-md border border-line bg-surface/70 px-2.5 py-2 text-[12px]">
                  <CheckCircle2 className="mt-px size-3.5 shrink-0 text-emerald-300" />
                  <div>
                    <div className="text-fg">{sig}</div>
                    <div className="text-[11px] text-faint">Signature to cross-check against source evidence</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {failedStep && (
            <p className="mt-3 text-[11.5px] text-faint">
              Failed at step {failedStep.order}: <span className="text-rose-300">{failedStep.title}</span> · Engine: {demo ? 'Demo simulation (no firmware executed)' : 'Physical test runner'}
            </p>
          )}
          {!demo && execution.measurements && (
            <div className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted">
              {execution.measurements.boardId && <span>Board: <span className="mono text-fg">{execution.measurements.boardId}</span></span>}
              {execution.measurements.brokerMessagesReceived != null && <span>Broker received: <strong className="text-fg">{execution.measurements.brokerMessagesReceived}</strong></span>}
              {execution.measurements.recoveryTimeMs != null && <span>Recovery: <strong className="text-fg">{execution.measurements.recoveryTimeMs} ms</strong></span>}
              {execution.measurements.attempts != null && <span>Reproduced: <strong className="text-fg">{execution.measurements.reproducedAttempts ?? '—'}/{execution.measurements.attempts}</strong></span>}
              {execution.measurements.serialLogArtifact && <span>Serial artifact: <span className="mono text-fg">{execution.measurements.serialLogArtifact}</span></span>}
              {execution.measurements.brokerCaptureArtifact && <span>Broker capture: <span className="mono text-fg">{execution.measurements.brokerCaptureArtifact}</span></span>}
            </div>
          )}
        </div>
        {reproduced && nextHref && (
          <LinkButton to={nextHref} variant="primary" className="shrink-0" icon={<ArrowRight className="size-4" />}>
            Evaluate a fix
          </LinkButton>
        )}
      </div>
    </div>
  )
}
