import { devices } from '../data/devices'
import { incidents } from '../data/incidents'
import { regressionTests } from '../data/regression'
import { scenarios } from '../data/scenarios'
import { validations } from '../data/validation'
import type { Device, Evidence, Incident, RegressionTest, ReproductionScenario, ValidationResult } from '../types/domain'
import { DemoExecutionEngine } from './execution/demoEngine'
import type { ExecutionEngine } from './execution/types'

/**
 * Boundary between the dashboard and a future Revora backend.
 *
 * Suggested REST mapping:
 *   GET  /incidents                 listIncidents
 *   POST /incidents/:id/evidence    addEvidence (multipart upload)
 *   POST /incidents/:id/scenarios   generateScenario
 *   GET  /scenarios/:id             getScenario
 *   POST /executions                ExecutionEngine.run (stream via SSE)
 *   POST /regression-tests          saveRegressionTest
 */
export interface RevoraApi {
  isDemo: boolean
  listIncidents(): Promise<Incident[]>
  listDevices(): Promise<Device[]>
  listScenarios(): Promise<ReproductionScenario[]>
  listValidations(): Promise<ValidationResult[]>
  listRegressionTests(): Promise<RegressionTest[]>
  /** In the demo, files are read in the browser and kept in memory only. */
  addEvidence(incidentId: string, file: File): Promise<Evidence>
  executionEngine: ExecutionEngine
}

const clone = <T,>(v: T): T => structuredClone(v)

export const ACCEPTED_EVIDENCE = ['.log', '.txt', '.json'] as const
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024

export async function readEvidenceFile(file: File): Promise<Evidence> {
  const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
  if (!ACCEPTED_EVIDENCE.includes(ext as (typeof ACCEPTED_EVIDENCE)[number])) {
    throw new Error(`Unsupported file type "${ext}". Accepted: .log, .txt, .json`)
  }
  if (file.size > MAX_EVIDENCE_BYTES) throw new Error('File exceeds the 5 MB demo limit')
  const text = await file.text()
  let note: string | undefined
  if (ext === '.json') {
    try {
      JSON.parse(text)
      note = 'Valid JSON'
    } catch {
      note = 'Could not parse as JSON — stored as text'
    }
  }
  const lines = text.split(/\r?\n/)
  const maxStoredChars = 128_000
  return {
    id: `upl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    kind: ext === '.json' ? 'device_config' : 'device_log',
    name: file.name,
    source: 'browser-upload',
    sizeBytes: file.size,
    lineCount: lines.length,
    addedAt: new Date().toISOString(),
    preview: lines.slice(0, 6).join('\n'),
    rawText: text.slice(0, maxStoredChars),
    note: [note, text.length > maxStoredChars ? 'Only the first 128,000 characters are retained locally; keep the original log for full analysis.' : undefined].filter(Boolean).join(' · ') || undefined,
  }
}

export const demoApi: RevoraApi = {
  isDemo: true,
  listIncidents: async () => clone(incidents),
  listDevices: async () => clone(devices),
  listScenarios: async () => clone(scenarios),
  listValidations: async () => clone(validations),
  listRegressionTests: async () => clone(regressionTests),
  addEvidence: (_incidentId, file) => readEvidenceFile(file),
  executionEngine: new DemoExecutionEngine(),
}
