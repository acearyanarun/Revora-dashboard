import { checkStepMap } from '../data/validation'
import type { StepOutcome, StepResult } from '../types/domain'

/** Derives a comparison-check outcome from the step results of one execution. */
export function outcomeFor(check: string, results: Record<string, StepResult>): StepOutcome | undefined {
  const steps = checkStepMap[check] ?? []
  const rs = steps.map((s) => results[s]).filter(Boolean)
  if (rs.length < steps.length) return undefined
  return rs.some((r) => r.outcome === 'fail') ? 'fail' : 'pass'
}
