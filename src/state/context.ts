import { createContext, useContext } from 'react'
import type { RevoraApi } from '../services/api'
import type { Evidence, Incident, ReproductionScenario, ReproductionStatus, TestExecution } from '../types/domain'
import type { WorkspaceState } from './workspace'

export interface WorkspaceContextValue extends WorkspaceState {
  api: RevoraApi
  statusOf(incident: Incident): ReproductionStatus
  addEvidence(incidentId: string, file: File): Promise<Evidence>
  createIncident(details: { title: string; deviceName: string; firmwareVersion: string; firmwareSourceRef?: string; customerSymptom: string }): string
  createScenarioCandidate(incidentId: string): void
  reviewScenario(scenarioId: string, outageSeconds: number, recoverySeconds: number): void
  setRepoRef(incidentId: string, url: string): void
  markScenarioGenerated(incidentId: string): void
  recordExecution(incidentId: string, execution: TestExecution): void
  completeValidation(incidentId: string, validationId: string, validated: boolean): void
  saveRegression(incidentId: string, scenario: ReproductionScenario, firmwareRef: string): void
  recordRegressionRun(testId: string, verdict: 'passed' | 'failed', firmwareRef: string, note: string): void
  resetDemo(): Promise<void>
}

export const Ctx = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
