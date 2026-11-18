import type { Incident, InvestigationProgress, ReproductionStatus } from '../types/domain'

export const emptyProgress = (o: Partial<InvestigationProgress> = {}): InvestigationProgress => ({
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
  'INC-001': emptyProgress({ evidenceReceived: true, analysisComplete: true }),
  'INC-002': emptyProgress(),
  'INC-003': emptyProgress({ evidenceReceived: true, analysisComplete: true, scenarioGenerated: true, reproduction: 'reproduced', validation: 'validated', regressionSaved: true }),
  'INC-004': emptyProgress({ evidenceReceived: true }),
  'INC-005': emptyProgress({ evidenceReceived: true, analysisComplete: true, scenarioGenerated: true, reproduction: 'not_reproduced' }),
  'INC-006': emptyProgress(),
}

/** Incident status shown in tables, derived from live workflow progress when available. */
export function deriveStatus(incident: Incident, progress?: InvestigationProgress): ReproductionStatus {
  if (!progress) return incident.status
  if (progress.validation === 'validated') return 'fix_validated'
  if (progress.reproduction === 'reproduced') return incident.status === 'fix_validated' ? 'fix_validated' : 'reproduction_confirmed'
  if (progress.reproduction === 'not_reproduced') return 'reproduction_failed'
  if (progress.scenarioGenerated || (progress.analysisComplete && incident.scenarioId)) return 'ready_for_reproduction'
  if (progress.analysisComplete) return 'in_analysis'
  if (progress.evidenceReceived) return 'in_analysis'
  return incident.status
}

