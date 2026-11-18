import { demoScripts } from '../../data/scenarios'
import type { ExecutionLogLine, StepResult, TestExecution } from '../../types/domain'
import type { ExecutionEngine, ExecutionListener, ExecutionRequest } from './types'

/**
 * DEMO SIMULATION — does not execute firmware.
 *
 * Replays a fixed, deterministic script for each firmware variant with
 * realistic pacing so the UI can be exercised end-to-end. Swap this for a
 * remote runner by implementing `ExecutionEngine`.
 */
export interface DemoEngineOptions {
  /** Milliseconds between log lines. Tests pass 0. */
  lineDelayMs?: number
}

const pad = (n: number) => String(n).padStart(2, '0')
/** Simulated harness clock starting at 10:00:00, one second per log line. */
const simClock = (tick: number) => `10:${pad(Math.floor(tick / 60))}:${pad(tick % 60)}`

export function interpret(
  variant: TestExecution['variant'],
  verdict: TestExecution['verdict'],
): TestExecution['interpretation'] {
  if (verdict === 'aborted') return 'aborted'
  if (variant === 'original') return verdict === 'failed' ? 'target_failure_reproduced' : 'target_not_reproduced'
  return verdict === 'passed' ? 'recovery_verified' : 'target_failure_reproduced'
}

export class DemoExecutionEngine implements ExecutionEngine {
  readonly kind = 'demo-simulation' as const
  readonly label = 'Demo Simulation'
  private readonly lineDelayMs: number

  constructor(opts: DemoEngineOptions = {}) {
    this.lineDelayMs = opts.lineDelayMs ?? 380
  }

  run(request: ExecutionRequest, listener: ExecutionListener) {
    const script = demoScripts[request.variant]
    const startedAt = new Date().toISOString()
    const log: ExecutionLogLine[] = []
    const stepResults: StepResult[] = []
    const timers: ReturnType<typeof setTimeout>[] = []
    let done = false
    let tick = 0

    const emit = (line: Omit<ExecutionLogLine, 'ts'>) => {
      // System and result lines annotate the run and do not advance the simulated clock.
      const advances = line.level !== 'system' && line.level !== 'result'
      const full = { ...line, ts: simClock(advances ? tick++ : Math.max(0, tick - 1)) }
      log.push(full)
      listener.onLog?.(full)
    }

    const finish = (verdict: TestExecution['verdict']) => {
      if (done) return
      done = true
      timers.forEach(clearTimeout)
      if (verdict === 'aborted') emit({ level: 'system', message: 'Execution stopped by user.' })
      const execution: TestExecution = {
        id: `exec-${Date.now().toString(36)}`,
        scenarioId: request.scenario.id,
        variant: request.variant,
        firmwareRef: request.firmwareRef,
        startedAt,
        finishedAt: new Date().toISOString(),
        engine: this.kind,
        stepResults,
        log,
        verdict,
        interpretation: interpret(request.variant, verdict),
      }
      if (verdict !== 'aborted') {
        emit({ level: 'result', message: `REPRODUCTION RESULT: ${verdict === 'failed' ? 'FAILED' : 'PASSED'}` })
      }
      listener.onComplete?.(execution)
    }

    // Build a flat schedule of events.
    // Log lines take a full tick; step boundaries are quick so pacing tracks the console.
    type Op = { run: () => void; weight: number }
    const ops: Op[] = []
    const op = (run: () => void, weight = 1) => ops.push({ run, weight })
    op(() => emit({ level: 'system', message: `Demo Simulation · ${request.scenario.testName} · ${request.firmwareRef}` }))
    for (const step of script) {
      op(() => listener.onStepStart?.(step.stepId), 0.35)
      step.logs.forEach((l) => op(() => emit({ ...l, stepId: step.stepId })))
      op(() => {
        const r: StepResult = { stepId: step.stepId, outcome: step.outcome, durationMs: step.logs.length * 1000 }
        stepResults.push(r)
        listener.onStepComplete?.(r)
      }, 0.25)
    }
    const failed = script.some((s) => s.outcome === 'fail')
    op(() => finish(failed ? 'failed' : 'passed'))

    if (this.lineDelayMs === 0) {
      ops.forEach((o) => !done && o.run())
    } else {
      let at = 0
      ops.forEach((o) => {
        timers.push(setTimeout(() => !done && o.run(), at))
        at += this.lineDelayMs * o.weight
      })
    }

    return { stop: () => finish('aborted') }
  }
}
