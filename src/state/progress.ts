import type { Incident, InvestigationProgress, ReproductionStatus } from '../types/domain'

const p = (o: Partial<InvestigationProgress>): InvestigationProgress => ({
  evidenceReceived: false,
  analysisComplete: false,
  scenarioGenerated: false,
  reproduction: 'not_run',
  validation: 'not_run',
  regressionSaved: false,
  ...o,
})

/** DEMONSTRATION DATA — initial workflow progress per incident. */
export const initialProgress: Record<string, InvestigationProgress> = {
  'INC-001': p({ evidenceReceived: true, analysisComplete: true }),
  'INC-002': p({}),
  'INC-003': p({ evidenceReceived: true, analysisComplete: true, scenarioGenerated: true, reproduction: 'reproduced', validation: 'validated', regressionSaved: true }),
  'INC-004': p({ evidenceReceived: true }),
  'INC-005': p({ evidenceReceived: true, analysisComplete: true, scenarioGenerated: true, reproduction: 'not_reproduced' }),
  'INC-006': p({}),
}

/** Incident status shown in tables, derived from live workflow progress when available. */
export function deriveStatus(incident: Incident, progress?: InvestigationProgress): ReproductionStatus {
  if (!progress) return incident.status
  if (progress.validation === 'validated' && incident.id === 'INC-001') return 'fix_validated'
  if (progress.reproduction === 'reproduced') return incident.status === 'fix_validated' ? 'fix_validated' : 'reproduction_confirmed'
  if (progress.reproduction === 'not_reproduced') return 'reproduction_failed'
  return incident.status
}

