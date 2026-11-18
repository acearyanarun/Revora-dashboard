import type {
  ExecutionLogLine,
  FirmwareVariant,
  ReproductionScenario,
  StepResult,
  TestExecution,
} from '../../types/domain'

/**
 * Contract for anything that can execute a reproduction scenario.
 *
 * The prototype ships `DemoExecutionEngine`, a deterministic browser-side
 * simulation. A production engine would submit the job to a test-runner
 * service (host harness / QEMU / HIL) and stream events back over SSE or a
 * WebSocket, calling the same listener methods.
 */
export interface ExecutionRequest {
  scenario: ReproductionScenario
  variant: FirmwareVariant
  firmwareRef: string
}

export interface ExecutionListener {
  onStepStart?(stepId: string): void
  onLog?(line: ExecutionLogLine): void
  onStepComplete?(result: StepResult): void
  onComplete?(execution: TestExecution): void
  onError?(message: string): void
}

export interface ExecutionHandle {
  /** Abort a running execution. Listener receives `onComplete` with verdict `aborted`. */
  stop(): void
}

export interface ExecutionEngine {
  readonly kind: 'demo-simulation' | 'remote-runner'
  readonly label: string
  run(request: ExecutionRequest, listener: ExecutionListener): ExecutionHandle
}
