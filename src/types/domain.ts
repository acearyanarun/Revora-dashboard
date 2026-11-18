/**
 * Revora domain model.
 *
 * These types describe the contract between the dashboard and a future backend.
 * Everything rendered by the UI flows through these shapes, so a real API can
 * replace the demo data module without touching presentation components.
 */

export type ISODateString = string

export type HardwarePlatform = 'ESP32' | 'ESP32-S3' | 'ESP32-C3'
export type FirmwareFramework = 'ESP-IDF' | 'Arduino-ESP32'
export type ConnectivityProtocol = 'Wi-Fi + MQTT' | 'Wi-Fi + HTTPS' | 'Wi-Fi + MQTT/TLS'

export interface FirmwareVersion {
  version: string
  framework: FirmwareFramework
  frameworkVersion: string
  releasedAt: ISODateString
  /** Reference only. Revora does not fetch source in the prototype. */
  sourceRef?: string
}

export interface Device {
  id: string
  name: string
  model: string
  platform: HardwarePlatform
  protocol: ConnectivityProtocol
  firmware: FirmwareVersion[]
  /** Which execution environments can currently run tests for this device. */
  testEnvironments: TestEnvironmentAvailability[]
}

export interface TestEnvironmentAvailability {
  environment: ExecutionMode
  availability: 'demo' | 'planned'
}

export type ExecutionMode = 'Host-Based Test Harness' | 'QEMU Emulation' | 'Hardware-in-the-Loop'

/**
 * Reproduction status shown in tables. Colors are mapped in `statusMeta`.
 *  - green  : confirmed / validated
 *  - yellow : in progress
 *  - red    : reproduction failed (could not reproduce)
 *  - gray   : awaiting evidence
 */
export type ReproductionStatus =
  | 'awaiting_evidence'
  | 'insufficient_evidence'
  | 'in_analysis'
  | 'ready_for_reproduction'
  | 'reproduction_confirmed'
  | 'fix_validated'
  | 'reproduction_failed'

export type EvidenceKind =
  | 'device_log'
  | 'firmware_source_ref'
  | 'customer_report'
  | 'device_config'
  | 'network_events'

export interface Evidence {
  id: string
  kind: EvidenceKind
  name: string
  /** Where the evidence came from. `browser-upload` evidence never leaves the browser in the demo. */
  source: 'sample' | 'browser-upload' | 'reference'
  sizeBytes?: number
  lineCount?: number
  addedAt: ISODateString
  /** Short preview of contents, if available. */
  preview?: string
  /** Bounded browser-local excerpt for candidate generation. Not an archival copy. */
  rawText?: string
  note?: string
}

export type TimelineSeverity = 'success' | 'info' | 'warning' | 'failure'
export type TimelineLane = 'wifi' | 'ip' | 'mqtt' | 'telemetry'

export interface TimelineEvent {
  id: string
  /** Seconds since the start of the captured window. */
  t: number
  timestamp: string
  label: string
  lane: TimelineLane
  severity: TimelineSeverity
  /** Raw log line(s) as captured from the device. */
  raw: string[]
  source: string
}

export interface LaneSegment {
  lane: Exclude<TimelineLane, 'telemetry'>
  from: number
  to: number
  state: 'up' | 'down' | 'unknown'
  label?: string
}

export type FindingKind = 'observed' | 'hypothesis' | 'missing' | 'confirmed'

export interface Finding {
  id: string
  kind: FindingKind
  statement: string
  /** Timeline event ids that support an observed fact. */
  evidenceRefs?: string[]
  /** Hypotheses are always unverified until a reproduction confirms them. */
  verification?: 'unverified' | 'testable' | 'supported-by-reproduction'
}

/** Backwards-compatible alias: a hypothesis is a finding of kind `hypothesis`. */
export type Hypothesis = Finding & { kind: 'hypothesis' }

export interface Incident {
  id: string
  title: string
  deviceId: string
  firmwareVersion: string
  framework: FirmwareFramework
  firmwareSourceRef?: string
  failureCategory: string
  failureMode: string
  customerSymptom: string
  firstReportedAt: ISODateString
  updatedAt: ISODateString
  status: ReproductionStatus
  reportCount: number
  evidence: Evidence[]
  timeline: TimelineEvent[]
  /** Derived connection-state segments for the swimlane view (seconds). */
  laneSegments?: LaneSegment[]
  timelineWindow?: { start: string; seconds: number }
  findings: Finding[]
  scenarioId?: string
}

export interface ScenarioStep {
  id: string
  order: number
  title: string
  detail: string
  /** Steps that inject a fault or assert recovery are visually distinguished. */
  kind: 'setup' | 'action' | 'fault' | 'assertion'
  /** Evidence the step was derived from, shown for traceability. */
  derivedFrom?: string
}

export interface ReproductionScenario {
  id: string
  incidentId: string
  testName: string
  description: string
  steps: ScenarioStep[]
  environment: ExecutionEnvironment
  testCode: string
  /** Signature that must appear for a run to count as reproducing the field failure. */
  targetFailureSignature: string[]
  /** A sample C illustration or a log-derived, human-reviewable runner specification. */
  codeFormat?: 'c' | 'json'
  provenance?: 'sample' | 'log-derived'
  reviewed?: boolean
  outageSeconds?: number
  recoverySeconds?: number
}

export interface ExecutionEnvironment {
  target: string
  framework: FirmwareFramework
  mode: ExecutionMode
  network: 'Simulated' | 'Controlled AP'
  mqttBroker: 'Test Environment'
  firmwareVersion: string
  engine: 'demo-simulation' | 'remote-runner'
}

export type FirmwareVariant = 'original' | 'corrected'
export type StepOutcome = 'pass' | 'fail' | 'skipped'

export interface ExecutionLogLine {
  ts: string
  level: 'info' | 'warn' | 'error' | 'result' | 'system'
  message: string
  stepId?: string
}

export interface StepResult {
  stepId: string
  outcome: StepOutcome
  durationMs: number
}

export interface TestExecution {
  id: string
  scenarioId: string
  variant: FirmwareVariant
  firmwareRef: string
  startedAt: ISODateString
  finishedAt?: ISODateString
  engine: ExecutionEnvironment['engine']
  stepResults: StepResult[]
  log: ExecutionLogLine[]
  /** Raw harness verdict. */
  verdict: 'passed' | 'failed' | 'aborted'
  /**
   * Interpretation relative to the targeted bug. A failed recovery assertion on
   * the original firmware is a *successful reproduction*.
   */
  interpretation: 'target_failure_reproduced' | 'target_not_reproduced' | 'recovery_verified' | 'aborted'
  /** Measurements supplied by a real runner; never inferred from scripted log lines. */
  measurements?: {
    boardId?: string
    brokerMessagesReceived?: number
    recoveryTimeMs?: number
    attempts?: number
    reproducedAttempts?: number
    serialLogArtifact?: string
    brokerCaptureArtifact?: string
  }
}

export interface ValidationCheck {
  name: string
  original: StepOutcome
  corrected: StepOutcome
}

export interface ValidationResult {
  id: string
  scenarioId: string
  originalRef: string
  correctionRef: string
  correctionSummary: string
  correctionDiff: string
  checks: ValidationCheck[]
  status: 'not_run' | 'validated' | 'not_validated'
  scopeNote: string
}

export interface RegressionTest {
  id: string
  name: string
  originIncidentId: string
  platform: HardwarePlatform
  failureCategory: string
  firmwareVersion: string
  lastExecutedAt?: ISODateString
  status: 'active' | 'draft' | 'failing'
  expectedBehavior: string
  steps: string[]
  code: string
  history: { at: ISODateString; firmwareRef: string; verdict: 'passed' | 'failed'; note: string }[]
  validationEvidence: string[]
}

/** Per-incident workflow progress, derived into the six-stage stepper. */
export interface InvestigationProgress {
  evidenceReceived: boolean
  analysisComplete: boolean
  scenarioGenerated: boolean
  reproduction: 'not_run' | 'reproduced' | 'not_reproduced'
  validation: 'not_run' | 'validated' | 'not_validated'
  regressionSaved: boolean
}
