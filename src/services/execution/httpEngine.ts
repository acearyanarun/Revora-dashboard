import type { TestExecution } from '../../types/domain'
import type { ExecutionEngine, ExecutionListener, ExecutionRequest } from './types'

/** Fail-closed bridge to a local, user-controlled ESP32 test runner. Never simulates a success. */
export class HttpExecutionEngine implements ExecutionEngine {
  readonly kind = 'remote-runner' as const
  readonly label = 'Physical test runner'
  readonly baseUrl: string
  constructor(baseUrl: string) { this.baseUrl = baseUrl }

  run(request: ExecutionRequest, listener: ExecutionListener) {
    const controller = new AbortController()
    let finished = false
    const run = async () => {
      try {
        const response = await fetch(`${this.baseUrl.replace(/\/$/, '')}/executions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(`Test runner HTTP ${response.status}: ${(await response.text()).slice(0, 300)}`)
        const result = (await response.json()) as TestExecution
        if (result.scenarioId !== request.scenario.id || result.variant !== request.variant || result.firmwareRef !== request.firmwareRef || !['passed', 'failed', 'aborted'].includes(result.verdict) || !Array.isArray(result.stepResults) || !Array.isArray(result.log)) {
          throw new Error('Test runner returned an invalid or mismatched execution. Result rejected.')
        }
        const expectedInterpretation = result.verdict === 'aborted'
          ? 'aborted'
          : request.variant === 'original'
            ? result.verdict === 'failed' ? 'target_failure_reproduced' : 'target_not_reproduced'
            : result.verdict === 'passed' ? 'recovery_verified' : 'target_failure_reproduced'
        if (result.interpretation !== expectedInterpretation) throw new Error('Test runner verdict and interpretation conflict. Result rejected.')
        if (result.verdict !== 'aborted') {
          const assertions = new Set(request.scenario.steps.filter((s) => s.kind === 'assertion').map((s) => s.id))
          const measured = result.measurements
          if (!measured?.boardId || !measured.brokerCaptureArtifact || !Number.isInteger(measured.brokerMessagesReceived) || (measured.brokerMessagesReceived ?? -1) < 0) {
            throw new Error('Test runner response lacks board identity or broker-side capture evidence. Result rejected.')
          }
          if (result.verdict === 'failed' && !result.stepResults.some((s) => assertions.has(s.stepId) && s.outcome === 'fail')) {
            throw new Error('Runner failed without a failed recovery assertion; this is not a proven reproduction.')
          }
          if (result.verdict === 'passed' && ![...assertions].every((id) => result.stepResults.some((s) => s.stepId === id && s.outcome === 'pass'))) {
            throw new Error('Runner reported PASS without all recovery assertions passing.')
          }
        }
        if (finished) return
        finished = true
        // The server must supply the actual firmware/board evidence. Do not infer a pass from UI state.
        for (const line of result.log) listener.onLog?.(line)
        for (const step of result.stepResults) listener.onStepComplete?.(step)
        listener.onComplete?.({ ...result, engine: 'remote-runner' })
      } catch (error) {
        if (finished) return
        finished = true
        if ((error as Error).name !== 'AbortError') listener.onError?.((error as Error).message)
      }
    }
    void run()
    return {
      stop() {
        if (finished) return
        finished = true
        controller.abort()
        listener.onComplete?.({
          id: `aborted-${Date.now()}`, scenarioId: request.scenario.id, variant: request.variant,
          firmwareRef: request.firmwareRef, startedAt: new Date().toISOString(), finishedAt: new Date().toISOString(),
          engine: 'remote-runner', stepResults: [], log: [], verdict: 'aborted', interpretation: 'aborted',
        })
      },
    }
  }
}
