import { useCallback, useEffect, useRef, useState } from 'react'
import type { ExecutionEngine, ExecutionHandle, ExecutionRequest } from '../services/execution/types'
import type { ExecutionLogLine, StepResult, TestExecution } from '../types/domain'

export type RunStatus = 'idle' | 'running' | 'done' | 'aborted'

export interface ExecutionState {
  status: RunStatus
  activeStepId?: string
  results: Record<string, StepResult>
  log: ExecutionLogLine[]
  execution?: TestExecution
}

const initial: ExecutionState = { status: 'idle', results: {}, log: [] }

/** Drives an ExecutionEngine and exposes UI-friendly state. Engine-agnostic. */
export function useExecution(engine: ExecutionEngine, seed?: TestExecution) {
  const [state, setState] = useState<ExecutionState>(() =>
    seed
      ? {
          status: seed.verdict === 'aborted' ? 'aborted' : 'done',
          results: Object.fromEntries(seed.stepResults.map((r) => [r.stepId, r])),
          log: seed.log,
          execution: seed,
        }
      : initial,
  )
  const handle = useRef<ExecutionHandle | null>(null)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      handle.current?.stop()
    }
  }, [])

  const run = useCallback(
    (request: ExecutionRequest, onComplete?: (e: TestExecution) => void) => {
      handle.current?.stop()
      setState({ ...initial, status: 'running' })
      handle.current = engine.run(request, {
        onStepStart: (stepId) => mounted.current && setState((s) => ({ ...s, activeStepId: stepId })),
        onLog: (line) => mounted.current && setState((s) => ({ ...s, log: [...s.log, line] })),
        onStepComplete: (r) => mounted.current && setState((s) => ({ ...s, results: { ...s.results, [r.stepId]: r } })),
        onComplete: (execution) => {
          handle.current = null
          if (!mounted.current) return
          setState((s) => ({ ...s, status: execution.verdict === 'aborted' ? 'aborted' : 'done', activeStepId: undefined, execution }))
          onComplete?.(execution)
        },
      })
    },
    [engine],
  )

  const stop = useCallback(() => handle.current?.stop(), [])
  const reset = useCallback(() => {
    handle.current?.stop()
    setState(initial)
  }, [])

  return { state, run, stop, reset }
}
