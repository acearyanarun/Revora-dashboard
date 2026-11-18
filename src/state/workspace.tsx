import { useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { Ctx, type WorkspaceContextValue } from './context'
import { deriveStatus, emptyProgress, initialProgress } from './progress'
import { createConnectivityCandidate, findingsFromTimeline, parseConnectivityLog } from '../lib/incidentAnalysis'
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
  ReproductionScenario as Scenario,
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

const STORAGE_KEY = 'revora-workspace-v2'
function saveLocal(state: WorkspaceState) {
  if (import.meta.env.MODE === 'test') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.warn('Revora could not retain workspace changes in local storage.', err)
  }
}

function loadLocal(): WorkspaceState | null {
  if (import.meta.env.MODE === 'test') return null
  try {
    const serialized = window.localStorage.getItem(STORAGE_KEY)
    if (!serialized) return null
    const state = JSON.parse(serialized) as WorkspaceState
    if (!Array.isArray(state.incidents) || !Array.isArray(state.scenarios) || !state.progress || !Array.isArray(state.devices)) return null
    return { ...state, loaded: true }
  } catch {
    return null
  }
}

type Action =
  | { type: 'loaded'; data: WorkspaceData }
  | { type: 'restore'; state: WorkspaceState }
  | { type: 'createIncident'; incident: Incident; device: Device }
  | { type: 'addEvidence'; incidentId: string; evidence: Evidence }
  | { type: 'candidateScenario'; incidentId: string; scenario: Scenario }
  | { type: 'reviewScenario'; scenarioId: string; outageSeconds: number; recoverySeconds: number }
  | { type: 'setRepoRef'; incidentId: string; url: string }
  | { type: 'scenarioGenerated'; incidentId: string }
  | { type: 'execution'; incidentId: string; execution: TestExecution }
  | { type: 'validationComplete'; incidentId: string; validationId: string; validated: boolean }
  | { type: 'saveRegression'; incidentId: string; scenario: Scenario; firmwareRef: string }
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
    case 'restore':
      return action.state
    case 'createIncident':
      return {
        ...state,
        incidents: [action.incident, ...state.incidents],
        devices: [action.device, ...state.devices],
        progress: { ...state.progress, [action.incident.id]: emptyProgress() },
      }
    case 'addEvidence': {
      const newEvents = parseConnectivityLog(action.evidence)
      const evidence = action.evidence.kind === 'device_log' && newEvents.length === 0
        ? { ...action.evidence, note: [action.evidence.note, 'No timestamped ESP-IDF Wi-Fi/MQTT events recognized. Inspect the raw file or provide a supported ESP-IDF serial log.'].filter(Boolean).join(' · ') }
        : action.evidence
      return {
        ...state,
        incidents: touch(state.incidents, action.incidentId, (i) => ({
          evidence: [evidence, ...i.evidence],
          timeline: newEvents.length ? [...i.timeline, ...newEvents].sort((a, b) => a.t - b.t) : i.timeline,
          findings: newEvents.length ? [...i.findings, ...findingsFromTimeline(newEvents)] : i.findings,
        })),
        progress: { ...state.progress, [action.incidentId]: { ...emptyProgress(), ...state.progress[action.incidentId], evidenceReceived: true, analysisComplete: state.progress[action.incidentId]?.analysisComplete || newEvents.length > 0 } },
      }
    }
    case 'candidateScenario':
      return {
        ...state,
        scenarios: [...state.scenarios.filter((s) => s.id !== action.scenario.id), action.scenario],
        incidents: touch(state.incidents, action.incidentId, () => ({ scenarioId: action.scenario.id })),
      }
    case 'reviewScenario':
      return {
        ...state,
        scenarios: state.scenarios.map((s) => {
          if (s.id !== action.scenarioId) return s
          const incident = state.incidents.find((i) => i.id === s.incidentId)
          if (!incident || s.provenance !== 'log-derived') return s
          return createConnectivityCandidate(incident, action.outageSeconds, action.recoverySeconds, true)
        }),
        executions: Object.fromEntries(Object.entries(state.executions).filter(([id]) => id !== action.scenarioId)),
        progress: Object.fromEntries(Object.entries(state.progress).map(([id, p]) => {
          const scenario = state.scenarios.find((s) => s.id === action.scenarioId)
          return [id, id === scenario?.incidentId ? { ...p, reproduction: 'not_run', validation: 'not_run', regressionSaved: false } : p]
        })),
        regressionTests: state.regressionTests.map((t) => {
          const scenario = state.scenarios.find((s) => s.id === action.scenarioId)
          return t.name === scenario?.testName ? { ...t, status: 'draft' } : t
        }),
      }
    case 'setRepoRef':
      return {
        ...state,
        repoRefs: { ...state.repoRefs, [action.incidentId]: action.url },
        incidents: touch(state.incidents, action.incidentId, () => ({ firmwareSourceRef: action.url })),
      }
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
                  statement: execution.engine === 'demo-simulation'
                    ? 'Sample demo script reproduced the illustrated failure. This is not evidence of actual firmware behavior.'
                    : 'The remote runner reported a failed recovery assertion on the original firmware; inspect its raw execution artifacts before considering the field signature confirmed.',
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
      const scenario = action.scenario
      const incident = state.incidents.find((i) => i.id === action.incidentId)
      if (!incident) return state
      const original = state.executions[scenario.id]?.original
      const corrected = state.executions[scenario.id]?.corrected
      const validated = state.progress[action.incidentId]?.validation === 'validated' && corrected?.verdict === 'passed'
      const history: RegressionTest['history'] = [
        ...(original && original.verdict !== 'aborted' ? [{ at: original.finishedAt ?? at, firmwareRef: original.firmwareRef, verdict: original.verdict as 'passed' | 'failed', note: `Reproduction run (${original.engine})` }] : []),
        ...(validated && corrected ? [{ at: corrected.finishedAt ?? at, firmwareRef: corrected.firmwareRef, verdict: corrected.verdict as 'passed' | 'failed', note: `Correction comparison (${corrected.engine})` }] : []),
      ]
      const device = state.devices.find((d) => d.id === incident.deviceId)
      const existing = state.regressionTests.find((t) => t.name === scenario.testName)
      const savedTest: RegressionTest = {
        id: existing?.id ?? `test-${scenario.id}`,
        name: scenario.testName,
        originIncidentId: incident.id,
        platform: device?.platform ?? 'ESP32',
        failureCategory: incident.failureCategory,
        firmwareVersion: incident.firmwareVersion,
        lastExecutedAt: history.length ? at : undefined,
        status: validated ? 'active' : 'failing',
        expectedBehavior: scenario.steps.find((s) => s.kind === 'assertion')?.detail ?? 'Device recovers under the specified fault.',
        steps: scenario.steps.map((s) => s.title),
        code: scenario.testCode,
        history: [...history, ...(existing?.history ?? [])],
        validationEvidence: [
          `${validated ? 'Correction checked' : 'Known failure captured'} in ${original?.engine ?? 'unverified'} mode.`,
          'Review raw execution logs and the source firmware reference before using as production evidence.',
        ],
      }
      return {
        ...state,
        regressionTests: [...state.regressionTests.filter((t) => t.name !== scenario.testName), savedTest],
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
    load(api).then((data) => {
      if (!live) return
      const saved = loadLocal()
      dispatch(saved ? { type: 'restore', state: saved } : { type: 'loaded', data })
    })
    return () => {
      live = false
    }
  }, [api])

  useEffect(() => {
    if (state.loaded) saveLocal(state)
  }, [state])

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
      createIncident: (details) => {
        const id = `INC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
        const at = now()
        const deviceId = `device-${id}`
        dispatch({
          type: 'createIncident',
          incident: {
            id, title: details.title.trim(), deviceId, firmwareVersion: details.firmwareVersion.trim(), firmwareSourceRef: details.firmwareSourceRef?.trim(),
            framework: 'ESP-IDF', failureCategory: 'Wi-Fi / MQTT recovery', failureMode: 'Connectivity recovery', customerSymptom: details.customerSymptom.trim(),
            firstReportedAt: at, updatedAt: at, status: 'awaiting_evidence', reportCount: 1, evidence: [], timeline: [], findings: [],
          },
          device: {
            id: deviceId, name: details.deviceName.trim(), model: 'Custom ESP32', platform: 'ESP32', protocol: 'Wi-Fi + MQTT',
            firmware: [{ version: details.firmwareVersion.trim(), framework: 'ESP-IDF', frameworkVersion: 'Unknown', releasedAt: at, sourceRef: details.firmwareSourceRef?.trim() }],
            testEnvironments: [],
          },
        })
        return id
      },
      createScenarioCandidate: (incidentId) => {
        const incident = state.incidents.find((i) => i.id === incidentId)
        if (!incident || !incident.evidence.some((e) => e.kind === 'device_log' && !!e.rawText) || !incident.timeline.length) return
        dispatch({ type: 'candidateScenario', incidentId, scenario: createConnectivityCandidate(incident) })
      },
      reviewScenario: (scenarioId, outageSeconds, recoverySeconds) => dispatch({ type: 'reviewScenario', scenarioId, outageSeconds, recoverySeconds }),
      setRepoRef: (incidentId, url) => dispatch({ type: 'setRepoRef', incidentId, url }),
      markScenarioGenerated: (incidentId) => dispatch({ type: 'scenarioGenerated', incidentId }),
      recordExecution: (incidentId, execution) => dispatch({ type: 'execution', incidentId, execution }),
      completeValidation: (incidentId, validationId, validated) => dispatch({ type: 'validationComplete', incidentId, validationId, validated }),
      saveRegression: (incidentId, scenario, firmwareRef) => dispatch({ type: 'saveRegression', incidentId, scenario, firmwareRef }),
      recordRegressionRun: (testId, verdict, firmwareRef, note) => dispatch({ type: 'regressionRun', testId, verdict, firmwareRef, note }),
      resetDemo: async () => {
        window.localStorage.removeItem(STORAGE_KEY)
        dispatch({ type: 'reset', data: await load(api) })
      },
    }),
    [state, api, addEvidence],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

