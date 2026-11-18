import { describe, expect, it, vi } from 'vitest'
import { scenarios } from '../data/scenarios'
import { readEvidenceFile } from '../services/api'
import { DemoExecutionEngine, interpret } from '../services/execution/demoEngine'
import type { TestExecution } from '../types/domain'
import { workflowStages } from '../lib/status'
import { deriveStatus, initialProgress } from '../state/progress'
import { incidents } from '../data/incidents'

const scenario = scenarios[0]

function runSync(variant: 'original' | 'corrected') {
  const engine = new DemoExecutionEngine({ lineDelayMs: 0 })
  let result: TestExecution | undefined
  const steps: string[] = []
  engine.run({ scenario, variant, firmwareRef: variant }, { onStepStart: (s) => steps.push(s), onComplete: (e) => (result = e) })
  return { result: result!, steps }
}

describe('DemoExecutionEngine', () => {
  it('reproduces the target failure on the original firmware', () => {
    const { result, steps } = runSync('original')
    expect(steps).toEqual(scenario.steps.map((s) => s.id))
    expect(result.verdict).toBe('failed')
    expect(result.interpretation).toBe('target_failure_reproduced')
    expect(result.stepResults.find((r) => r.stepId === 's9')?.outcome).toBe('fail')
    expect(result.log.at(-1)?.message).toBe('REPRODUCTION RESULT: FAILED')
    expect(result.engine).toBe('demo-simulation')
  })

  it('verifies recovery on the corrected firmware', () => {
    const { result } = runSync('corrected')
    expect(result.verdict).toBe('passed')
    expect(result.interpretation).toBe('recovery_verified')
    expect(result.stepResults.every((r) => r.outcome === 'pass')).toBe(true)
  })

  it('uses a deterministic simulated clock starting at 10:00:00', () => {
    const { result } = runSync('original')
    const first = result.log.find((l) => l.level === 'info')!
    expect(first.ts).toBe('10:00:00')
    expect(first.message).toMatch(/Initializing firmware/)
  })

  it('can be stopped mid-run and reports an aborted execution', () => {
    vi.useFakeTimers()
    const engine = new DemoExecutionEngine({ lineDelayMs: 100 })
    const onComplete = vi.fn()
    const h = engine.run({ scenario, variant: 'original', firmwareRef: 'x' }, { onComplete })
    vi.advanceTimersByTime(350)
    h.stop()
    vi.runAllTimers()
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].verdict).toBe('aborted')
    vi.useRealTimers()
  })

  it('interprets verdicts relative to the targeted bug', () => {
    expect(interpret('original', 'passed')).toBe('target_not_reproduced')
    expect(interpret('corrected', 'failed')).toBe('target_failure_reproduced')
    expect(interpret('original', 'aborted')).toBe('aborted')
  })
})

describe('workflow', () => {
  it('marks the first incomplete stage as current', () => {
    const stages = workflowStages(initialProgress['INC-001'])
    expect(stages.map((s) => s.state)).toEqual(['complete', 'complete', 'current', 'pending', 'pending', 'pending'])
  })

  it('shows a failed reproduction stage when the field failure was not reproduced', () => {
    const stages = workflowStages(initialProgress['INC-005'])
    expect(stages[3].state).toBe('failed')
  })

  it('derives confirmed status once reproduced', () => {
    const inc = incidents[0]
    expect(deriveStatus(inc, initialProgress['INC-001'])).toBe('ready_for_reproduction')
    expect(deriveStatus(inc, { ...initialProgress['INC-001'], reproduction: 'reproduced' })).toBe('reproduction_confirmed')
  })
})

describe('evidence upload', () => {
  it('accepts .log files and counts lines', async () => {
    const f = new File(['I (1) wifi:connected\nE (2) mqtt: fail\n'], 'device.log')
    const e = await readEvidenceFile(f)
    expect(e.source).toBe('browser-upload')
    expect(e.lineCount).toBe(3)
  })

  it('rejects unsupported extensions', async () => {
    await expect(readEvidenceFile(new File(['x'], 'core.bin'))).rejects.toThrow(/Unsupported/)
  })

  it('flags invalid JSON without rejecting the file', async () => {
    const e = await readEvidenceFile(new File(['{not json'], 'cfg.json'))
    expect(e.note).toMatch(/Could not parse/)
  })
})
