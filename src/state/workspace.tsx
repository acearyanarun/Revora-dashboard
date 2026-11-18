import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { Ctx, type WorkspaceContextValue } from './context'
import { deriveStatus, initialProgress } from './progress'
import type { RevoraApi } from '../services/api'
import type {
  Device,
  Evidence,
  Incident,
  InvestigationProgress,
  RegressionTest,
  ReproductionScenario,
  TestExecution,
  ValidationResult,
} from '../types/domain'

interface WorkspaceData {
  incidents: Incident[]
  devices: Device[]
  scenarios: ReproductionScenario[]
  validations: ValidationResult[]
  regressionTests: RegressionTest[]
}

export interface WorkspaceState extends WorkspaceData {
  loaded: boolean
  progress: Record<string, InvestigationProgress>
  executions: Record<string, Partial<Record<TestExecution['variant'], TestExecution>>>
  repoRefs: Record<string, string>
}

type Action =
  | { type: 'loaded'; data: WorkspaceData }
  | { type: 'addEvidence'; incidentId: string; evidence: Evidence }
  | { type: 'setRepoRef'; incidentId: string; url: string }
  | { type: 'scenarioGenerated'; incidentId: string }
  | { type: 'execution'; incidentId: string; execution: TestExecution }
  | { type: 'validationComplete'; incidentId: string; validationId: string; validated: boolean }
  | { type: 'saveRegression'; incidentId: string; testName: string; firmwareRef: string }
  | { type: 'regressionRun'; testId: string; verdict: 'passed' | 'failed'; firmwareRef: string; note: string }
  | { type: 'reset'; data: WorkspaceData }

const now = () => new Date().toISOString()

function touch(incidents: Incident[], id: string, patch: (i: Incident) => Partial<Incident>) {
  return incidents.map((i) => (i.id === id ? { ...i, ...patch(i), updatedAt: now() } : i))
}

function reducer(state: WorkspaceState, action: Action): WorkspaceState {
  switch (action.type) {
    case 'loaded':
    case 'reset':
      return { ...action.data, loaded: true, progress: structuredClone(initialProgress), executions: {}, repoRefs: {} }
    case 'addEvidence':
      return {
        ...state,
        incidents: touch(state.incidents, action.incidentId, (i) => ({ evidence: [action.evidence, ...i.evidence] })),
        progress: { ...state.progress, [action.incidentId]: { ...state.progress[action.incidentId], evidenceReceived: true } },
      }
    case 'setRepoRef':
      return { ...state, repoRefs: { ...state.repoRefs, [action.incidentId]: action.url } }
    case 'scenarioGenerated':
      return {
        ...state,
        incidents: touch(state.incidents, action.incidentId, () => ({})),
        progress: { ...state.progress, [action.incidentId]: { ...state.progress[action.incidentId], scenarioGenerated: true } },
      }
    case 'execution': {
      const { execution, incidentId } = action
      const prev = state.progress[incidentId]
      const reproduction =
        execution.variant === 'original' && execution.verdict !== 'aborted'
          ? execution.interpretation === 'target_failure_reproduced'
            ? 'reproduced'
            : 'not_reproduced'
          : prev.reproduction
      const confirmed = reproduction === 'reproduced' && prev.reproduction !== 'reproduced'
      return {
        ...state,
        executions: {
          ...state.executions,
          [execution.scenarioId]: { ...state.executions[execution.scenarioId], [execution.variant]: execution },
        },
        progress: { ...state.progress, [incidentId]: { ...prev, reproduction } },
        incidents: touch(state.incidents, incidentId, (i) => ({
          findings: confirmed
            ? [
                ...i.findings.filter((f) => f.kind !== 'confirmed'),
                {
                  id: 'f-c1',
                  kind: 'confirmed' as const,
                  statement:
                    'Reproduced in host harness (demo simulation): after Wi-Fi restoration and IP re-acquisition, MQTT publication fails and the client does not reconnect — matching the field log.',
                },
              ]
            : i.findings,
        })),
      }
    }
    case 'validationComplete':
      return {
        ...state,
        validations: state.validations.map((v) =>
          v.id === action.validationId ? { ...v, status: action.validated ? 'validated' : 'not_validated' } : v,
        ),
        progress: {
          ...state.progress,
          [action.incidentId]: { ...state.progress[action.incidentId], validation: action.validated ? 'validated' : 'not_validated' },
        },
      }
    case 'saveRegression': {
      const at = now()
      return {
        ...state,
        regressionTests: state.regressionTests.map((t) =>
          t.name === action.testName
            ? {
                ...t,
                status: 'active',
                lastExecutedAt: at,
                firmwareVersion: 'v1.4.2 → PR #214',
                history: [
                  { at, firmwareRef: 'v1.4.2 (original)', verdict: 'failed', note: 'Target failure reproduced (demo simulation)' },
                  { at, firmwareRef: action.firmwareRef, verdict: 'passed', note: 'Recovery verified in scenario (demo simulation)' },
                  ...t.history,
                ],
                validationEvidence: [
                  'Original v1.4.2: recovery assertion failed at step 9 — matches field signature',
                  'PR #214: all 9 steps passed; telemetry resumed 3.1 s after IP acquisition',
                  'Scope: host harness, simulated network. Not run on hardware.',
                ],
              }
            : t,
        ),
        progress: { ...state.progress, [action.incidentId]: { ...state.progress[action.incidentId], regressionSaved: true } },
        incidents: touch(state.incidents, action.incidentId, () => ({})),
      }
    }
    case 'regressionRun':
      return {
        ...state,
        regressionTests: state.regressionTests.map((t) =>
          t.id === action.testId
            ? {
                ...t,
                lastExecutedAt: now(),
                history: [{ at: now(), firmwareRef: action.firmwareRef, verdict: action.verdict, note: action.note }, ...t.history],
              }
            : t,
        ),
      }
  }
}

const empty: WorkspaceState = {
  loaded: false, incidents: [], devices: [], scenarios: [], validations: [], regressionTests: [], progress: {}, executions: {}, repoRefs: {},
}

async function load(api: RevoraApi): Promise<WorkspaceData> {
  const [incidents, devices, scenarios, validations, regressionTests] = await Promise.all([
    api.listIncidents(), api.listDevices(), api.listScenarios(), api.listValidations(), api.listRegressionTests(),
  ])
  return { incidents, devices, scenarios, validations, regressionTests }
}

export function WorkspaceProvider({ api, children }: { api: RevoraApi; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, empty)

  useEffect(() => {
    let live = true
    load(api).then((data) => live && dispatch({ type: 'loaded', data }))
    return () => {
      live = false
    }
  }, [api])

  const addEvidence = useCallback(
    async (incidentId: string, file: File) => {
      const evidence = await api.addEvidence(incidentId, file)
      dispatch({ type: 'addEvidence', incidentId, evidence })
      return evidence
    },
    [api],
  )

  const value = useMemo<WorkspaceContextValue>(
    () => ({
      ...state,
      api,
      statusOf: (incident) => deriveStatus(incident, state.progress[incident.id]),
      addEvidence,
      setRepoRef: (incidentId, url) => dispatch({ type: 'setRepoRef', incidentId, url }),
      markScenarioGenerated: (incidentId) => dispatch({ type: 'scenarioGenerated', incidentId }),
      recordExecution: (incidentId, execution) => dispatch({ type: 'execution', incidentId, execution }),
      completeValidation: (incidentId, validationId, validated) => dispatch({ type: 'validationComplete', incidentId, validationId, validated }),
      saveRegression: (incidentId, testName, firmwareRef) => dispatch({ type: 'saveRegression', incidentId, testName, firmwareRef }),
      recordRegressionRun: (testId, verdict, firmwareRef, note) => dispatch({ type: 'regressionRun', testId, verdict, firmwareRef, note }),
      resetDemo: async () => dispatch({ type: 'reset', data: await load(api) }),
    }),
    [state, api, addEvidence],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

