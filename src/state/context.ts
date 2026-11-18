import { createContext, useContext } from 'react'
import type { RevoraApi } from '../services/api'
import type { Evidence, Incident, ReproductionStatus, TestExecution } from '../types/domain'
import type { WorkspaceState } from './workspace'

export interface WorkspaceContextValue extends WorkspaceState {
  api: RevoraApi
  statusOf(incident: Incident): ReproductionStatus
  addEvidence(incidentId: string, file: File): Promise<Evidence>
  setRepoRef(incidentId: string, url: string): void
  markScenarioGenerated(incidentId: string): void
  recordExecution(incidentId: string, execution: TestExecution): void
  completeValidation(incidentId: string, validationId: string, validated: boolean): void
  saveRegression(incidentId: string, testName: string, firmwareRef: string): void
  recordRegressionRun(testId: string, verdict: 'passed' | 'failed', firmwareRef: string, note: string): void
  resetDemo(): Promise<void>
}

export const Ctx = createContext<WorkspaceContextValue | null>(null)

export function useWorkspace() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return ctx
}
