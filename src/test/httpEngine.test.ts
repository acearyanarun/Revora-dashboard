import { describe, expect, it, vi } from 'vitest'
import { scenarios } from '../data/scenarios'
import { HttpExecutionEngine } from '../services/execution/httpEngine'
import type { TestExecution } from '../types/domain'

const scenario = scenarios[0]
const request = { scenario, variant: 'original' as const, firmwareRef: 'abc123' }

function response(overrides: Partial<TestExecution> = {}): TestExecution {
  return {
    id: 'execution-1', scenarioId: scenario.id, variant: 'original', firmwareRef: 'abc123',
    startedAt: '2026-11-18T00:00:00Z', engine: 'remote-runner', verdict: 'failed', interpretation: 'target_failure_reproduced',
    log: [{ ts: '12:00:00', level: 'error', message: 'Broker saw zero publications after recovery' }],
    stepResults: scenario.steps.map((s) => ({ stepId: s.id, outcome: s.id === 's9' ? 'fail' : 'pass', durationMs: 1000 })),
    measurements: { boardId: 'esp32-test-01', brokerMessagesReceived: 0, brokerCaptureArtifact: '/artifacts/mqtt.pcap' },
    ...overrides,
  }
}

async function runOnce(value: TestExecution) {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => value }))
  const onComplete = vi.fn()
  const onError = vi.fn()
  new HttpExecutionEngine('http://localhost:8000').run(request, { onComplete, onError })
  await vi.waitFor(() => expect(onError.mock.calls.length + onComplete.mock.calls.length).toBe(1))
  vi.unstubAllGlobals()
  return { onComplete, onError }
}

describe('physical-runner result verification', () => {
  it('accepts a matching measured failure with broker capture and a failed assertion', async () => {
    const { onComplete, onError } = await runOnce(response())
    expect(onError).not.toHaveBeenCalled()
    expect(onComplete).toHaveBeenCalledOnce()
  })

  it('rejects hardware-independent or unsubstantiated results', async () => {
    const { onComplete, onError } = await runOnce(response({ measurements: undefined }))
    expect(onComplete).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('broker-side capture'))
  })

  it('rejects infrastructure failures mislabeled as a reproduced bug', async () => {
    const { onComplete, onError } = await runOnce(response({ stepResults: [] }))
    expect(onComplete).not.toHaveBeenCalled()
    expect(onError).toHaveBeenCalledWith(expect.stringContaining('without a failed recovery assertion'))
  })
})
