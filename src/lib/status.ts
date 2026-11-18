import type { InvestigationProgress, RegressionTest, ReproductionStatus } from '../types/domain'

export type Tone = 'green' | 'yellow' | 'red' | 'gray' | 'cyan'

export const statusMeta: Record<ReproductionStatus, { label: string; tone: Tone }> = {
  awaiting_evidence: { label: 'Awaiting Evidence', tone: 'gray' },
  insufficient_evidence: { label: 'Insufficient Evidence', tone: 'gray' },
  in_analysis: { label: 'Investigation in Progress', tone: 'yellow' },
  ready_for_reproduction: { label: 'Ready for Reproduction', tone: 'yellow' },
  reproduction_confirmed: { label: 'Reproduction Confirmed', tone: 'green' },
  fix_validated: { label: 'Fix Validated', tone: 'green' },
  reproduction_failed: { label: 'Reproduction Failed', tone: 'red' },
}

export type StageState = 'complete' | 'current' | 'pending' | 'failed'

export interface WorkflowStage {
  key: string
  label: string
  state: StageState
  detail: string
}

export const WORKFLOW_LABELS = [
  'Evidence Received',
  'Incident Analysis',
  'Test Generated',
  'Reproduction',
  'Fix Validation',
  'Regression Saved',
] as const

export function workflowStages(p: InvestigationProgress): WorkflowStage[] {
  const raw: { done: boolean; failed?: boolean; detail: [string, string] }[] = [
    { done: p.evidenceReceived, detail: ['Evidence attached', 'Waiting for logs'] },
    { done: p.analysisComplete, detail: ['Findings recorded', 'Not started'] },
    { done: p.scenarioGenerated, detail: ['Scenario ready', 'Not generated'] },
    { done: p.reproduction === 'reproduced', failed: p.reproduction === 'not_reproduced', detail: ['Target failure reproduced', 'Not run'] },
    { done: p.validation === 'validated', failed: p.validation === 'not_validated', detail: ['Correction passes scenario', 'Not run'] },
    { done: p.regressionSaved, detail: ['Saved to library', 'Not saved'] },
  ]
  let currentAssigned = false
  return raw.map((r, i) => {
    let state: StageState
    if (r.failed) {
      state = 'failed'
      currentAssigned = true
    } else if (r.done) state = 'complete'
    else if (!currentAssigned) {
      state = 'current'
      currentAssigned = true
    } else state = 'pending'
    const detail = r.failed
      ? i === 3 ? 'Field failure not reproduced' : 'Correction did not pass'
      : state === 'current' ? (i === 0 ? 'Waiting for logs' : 'Next step') : r.done ? r.detail[0] : r.detail[1]
    return { key: WORKFLOW_LABELS[i], label: WORKFLOW_LABELS[i], state, detail }
  })
}

export const toneClasses: Record<Tone, { dot: string; text: string; bg: string; ring: string }> = {
  green: { dot: 'bg-emerald-400', text: 'text-emerald-300', bg: 'bg-emerald-400/10', ring: 'ring-emerald-400/25' },
  yellow: { dot: 'bg-amber-400', text: 'text-amber-300', bg: 'bg-amber-400/10', ring: 'ring-amber-400/25' },
  red: { dot: 'bg-rose-400', text: 'text-rose-300', bg: 'bg-rose-400/10', ring: 'ring-rose-400/25' },
  gray: { dot: 'bg-slate-400', text: 'text-slate-300', bg: 'bg-slate-400/10', ring: 'ring-slate-400/20' },
  cyan: { dot: 'bg-sky-400', text: 'text-sky-300', bg: 'bg-sky-400/10', ring: 'ring-sky-400/25' },
}

export const regressionStatus: Record<RegressionTest['status'], { label: string; tone: 'green' | 'gray' | 'red' }> = {
  active: { label: 'Passing', tone: 'green' },
  draft: { label: 'Draft · awaiting fix validation', tone: 'gray' },
  failing: { label: 'Failing on current build', tone: 'red' },
}
