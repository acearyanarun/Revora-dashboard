import clsx from 'clsx'
import { ArrowLeft, CheckCircle2, FlaskConical, Library, ListOrdered, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useParams, useSearchParams } from 'react-router-dom'
import { EnvironmentPanel } from '../components/repro/EnvironmentPanel'
import { ExecutionConsole } from '../components/repro/ExecutionConsole'
import { ExecutionControls } from '../components/repro/ExecutionControls'
import { ReproductionOutcome } from '../components/repro/ReproductionOutcome'
import { ReproductionScenario } from '../components/repro/ReproductionScenario'
import { CodeBlock } from '../components/ui/CodeBlock'
import { Button, DemoBadge, EmptyState, LinkButton, Modal, Panel, StatusBadge } from '../components/ui/primitives'
import { useExecution } from '../hooks/useExecution'
import { downloadText } from '../lib/format'
import { useWorkspace } from '../state/context'
import type { Incident } from '../types/domain'

export function LabHeader({ incident }: { incident: Incident }) {
  const { statusOf, devices, scenarios, api } = useWorkspace()
  const scenario = scenarios.find((s) => s.id === incident.scenarioId)
  const tab = (to: string, label: string, end?: boolean) => (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx('relative -mb-px border-b-2 px-1 pb-2.5 text-[13px] font-medium transition-colors', isActive ? 'border-sky-400 text-fg' : 'border-transparent text-muted hover:text-fg')
      }
    >
      {label}
    </NavLink>
  )
  return (
    <div className="mb-5">
      <Link to={`/investigations/${incident.id}`} className="mb-3 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> {incident.id} investigation
      </Link>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-sky-300">
              <FlaskConical className="size-3.5" /> Reproduction Lab
            </span>
            <StatusBadge status={statusOf(incident)} />
            {api.executionEngine.kind === 'demo-simulation' ? <DemoBadge>Demo simulation</DemoBadge> : <span className="text-[11px] text-emerald-300">Physical runner configured</span>}
          </div>
          <h1 className="mono text-[19px] font-semibold tracking-tight text-fg">{scenario?.testName ?? 'No scenario'}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {incident.id} · {devices.find((d) => d.id === incident.deviceId)?.name} · {incident.firmwareVersion}
          </p>
        </div>
      </div>
      <div className="mt-4 flex gap-5 border-b border-line">
        {tab(`/lab/${incident.id}`, 'Reproduction', true)}
        {tab(`/lab/${incident.id}/validation`, 'Fix Validation')}
      </div>
    </div>
  )
}

export function ReproductionLabPage() {
  const { incidentId = '' } = useParams()
  const [params, setParams] = useSearchParams()
  const { incidents, scenarios, progress, executions, regressionTests, validations, api, markScenarioGenerated, recordExecution, reviewScenario, saveRegression } = useWorkspace()
  const incident = incidents.find((i) => i.id === incidentId)
  const scenario = scenarios.find((s) => s.id === incident?.scenarioId)
  const prog = incident ? progress[incident.id] : undefined
  const generated = !!prog?.scenarioGenerated
  const { state, run, stop, reset } = useExecution(api.executionEngine, scenario ? executions[scenario.id]?.original : undefined)

  const [visible, setVisible] = useState(generated ? (scenario?.steps.length ?? 0) : 0)
  const [generating, setGenerating] = useState(false)
  const [codeOpen, setCodeOpen] = useState(false)
  const [outageSeconds, setOutageSeconds] = useState(scenario?.outageSeconds ?? 10)
  const [recoverySeconds, setRecoverySeconds] = useState(scenario?.recoverySeconds ?? 10)
  const genTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const generate = useCallback(() => {
    if (!scenario || !incident) return
    reset()
    setGenerating(true)
    setVisible(0)
    let n = 0
    genTimer.current = setInterval(() => {
      n += 1
      setVisible(n)
      if (n >= scenario.steps.length) {
        clearInterval(genTimer.current!)
        genTimer.current = null
        setGenerating(false)
        markScenarioGenerated(incident.id)
      }
    }, 170)
  }, [scenario, incident, reset, markScenarioGenerated])

  useEffect(() => () => {
    if (genTimer.current) clearInterval(genTimer.current)
  }, [])

  // Arriving from "Generate Reproduction Scenario" on the investigation page.
  useEffect(() => {
    if (params.get('generate') === '1' && scenario && !generated && !generating) {
      const t = setTimeout(() => {
        setParams({}, { replace: true })
        generate()
      }, 0)
      return () => clearTimeout(t)
    }
  }, [params, scenario, generated, generating, generate, setParams])

  if (!incident) return <EmptyState title={`Incident ${incidentId} not found`} />
  if (!scenario) {
    return (
      <div className="animate-in">
        <LabHeader incident={incident} />
        <Panel>
          <EmptyState icon={<FlaskConical className="size-6" />} title="No reproduction scenario for this incident">
            Revora needs more evidence before it can propose a scenario. <Link to={`/investigations/${incident.id}`} className="text-sky-300 hover:underline">Add evidence</Link>
          </EmptyState>
        </Panel>
      </div>
    )
  }

  const runRepro = () =>
    run({ scenario, variant: 'original', firmwareRef: api.executionEngine.kind === 'remote-runner' ? incident.firmwareSourceRef ?? incident.firmwareVersion : `${scenario.environment.firmwareVersion} (original)` }, (e) => recordExecution(incident.id, e))

  const isCandidate = scenario.provenance === 'log-derived'
  const canRun = isCandidate
    ? !!scenario.reviewed && api.executionEngine.kind === 'remote-runner'
    : api.executionEngine.kind === 'demo-simulation'
  const existingRegression = regressionTests.find((t) => t.originIncidentId === incident.id && t.name === scenario.testName)
  const validationAvailable = validations.some((v) => v.scenarioId === scenario.id)

  const completed = Object.keys(state.results).length
  const progressFrac = state.status === 'idle' ? 0 : completed / scenario.steps.length
  const fileName = `test_${scenario.testName}.${scenario.codeFormat === 'json' ? 'json' : 'c'}`

  return (
    <div className="animate-in">
      <LabHeader incident={incident} />

      <div className="mb-4 flex flex-col gap-3 rounded-xl border border-line bg-surface p-3 lg:flex-row lg:items-center lg:justify-between">
        <ExecutionControls
          generated={generated}
          generating={generating}
          running={state.status === 'running'}
          canRun={canRun}
          onGenerate={generate}
          onRun={runRepro}
          onStop={stop}
          onViewCode={() => setCodeOpen(true)}
          onExport={() => downloadText(fileName, scenario.testCode, scenario.codeFormat === 'json' ? 'application/json' : 'text/x-c')}
        />
        <div className="flex items-center gap-3 text-[12px] text-muted">
          <span className="tabular-nums">
            {completed}/{scenario.steps.length} steps
          </span>
          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-line">
            <div
              className={clsx('h-full rounded-full transition-[width] duration-300', state.execution?.interpretation === 'target_failure_reproduced' ? 'bg-emerald-400' : 'bg-sky-400')}
              style={{ width: `${progressFrac * 100}%` }}
            />
          </div>
        </div>
      </div>

      {isCandidate && (
        <Panel className="mb-4" title="Review candidate test" subtitle="These timings are editable assumptions, not measurements inferred from the log.">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-muted">AP outage (seconds)
              <input type="number" min="1" max="300" className="h-9 w-28 rounded-md border border-line-strong bg-[#070c16] px-3 text-fg" value={outageSeconds} onChange={(e) => setOutageSeconds(Number(e.target.value))} />
            </label>
            <label className="flex flex-col gap-1 text-[12px] text-muted">Recovery deadline (seconds)
              <input type="number" min="1" max="300" className="h-9 w-28 rounded-md border border-line-strong bg-[#070c16] px-3 text-fg" value={recoverySeconds} onChange={(e) => setRecoverySeconds(Number(e.target.value))} />
            </label>
            <Button variant="primary" disabled={!Number.isInteger(outageSeconds) || !Number.isInteger(recoverySeconds) || outageSeconds < 1 || recoverySeconds < 1 || outageSeconds > 300 || recoverySeconds > 300 || state.status === 'running'} onClick={() => { reset(); reviewScenario(scenario.id, outageSeconds, recoverySeconds) }} icon={<CheckCircle2 className="size-4" />}>
              {scenario.reviewed ? 'Save reviewed parameters' : 'Approve candidate'}
            </Button>
            {scenario.reviewed && <span className="text-[12px] text-emerald-300">Engineer-reviewed scenario</span>}
          </div>
          <p className="mt-3 text-[12px] text-muted">{api.executionEngine.kind === 'demo-simulation' ? 'A physical runner is not connected. You can export this JSON test plan, but you cannot claim an actual reproduction.' : 'The configured runner will receive this reviewed scenario. It must execute and report real hardware and broker results.'} Saving review parameters clears prior results for this candidate so a changed test cannot reuse an old pass.</p>
        </Panel>
      )}

      {state.execution && state.status !== 'running' && (
        <div className="mb-4">
          <ReproductionOutcome execution={state.execution} scenario={scenario} nextHref={validationAvailable ? `/lab/${incident.id}/validation` : undefined} />
        </div>
      )}

      {state.execution?.interpretation === 'target_failure_reproduced' && state.status === 'done' && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3">
          <div>
            <div className="text-[13px] font-medium">Preserve the reproducible failure</div>
            <div className="text-[12px] text-muted">Save the scenario as a known-failure regression before anyone supplies a fix.</div>
          </div>
          {existingRegression && prog?.regressionSaved ? (
            <LinkButton to={`/regression/${existingRegression.id}`} icon={<Library className="size-4" />}>View saved test</LinkButton>
          ) : (
            <Button variant="primary" icon={<Library className="size-4" />} onClick={() => saveRegression(incident.id, scenario, state.execution!.firmwareRef)}>Save known-failure test</Button>
          )}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <Panel
          title="Reproduction scenario"
          subtitle={generating ? isCandidate ? 'Preparing evidence-linked candidate…' : 'Preparing pre-authored sample scenario…' : generated ? scenario.description : 'Not generated yet'}
          icon={<ListOrdered className="size-4" />}
          actions={generated && !generating ? <span className="text-[11px] text-faint">{scenario.steps.length} steps</span> : undefined}
        >
          {visible === 0 && !generating ? (
            <EmptyState icon={<Sparkles className="size-6" />} title="Generate a candidate reproduction">
              <p className="mb-3">Review a candidate scenario built from the evidence, then run it on a supported test rig. The browser-only example is scripted.</p>
              <Button variant="primary" onClick={generate} icon={<Sparkles className="size-3.5" />}>
                Generate Test
              </Button>
            </EmptyState>
          ) : (
            <>
              <ReproductionScenario scenario={scenario} visibleSteps={visible} activeStepId={state.activeStepId} results={state.results} />
              {generating && (
                <div className="mt-2 flex items-center gap-2 pl-10 text-[12px] text-sky-300">
                  <span className="size-1.5 animate-pulse rounded-full bg-sky-400" /> Preparing test steps…
                </div>
              )}
              {generated && !generating && (
                <p className="mt-3 border-t border-line pt-3 text-[11.5px] text-faint">
                  {isCandidate ? 'Candidate specification created by deterministic parsing of timestamped ESP-IDF events. Human review and a physical run are required.' : 'Demo: steps come from a pre-authored sample for INC-001. They are not generated by an AI model.'}
                </p>
              )}
            </>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          <EnvironmentPanel env={scenario.environment} />
          <ExecutionConsole
            log={state.log}
            status={state.status}
            progress={progressFrac}
            height="h-[340px]"
            title={`${fileName} — ${api.executionEngine.label}`}
            resultTone={state.execution?.interpretation === 'target_failure_reproduced' ? 'reproduced' : 'pass'}
          />
        </div>
      </div>

      <Modal open={codeOpen} onClose={() => setCodeOpen(false)} title={fileName} wide>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[12px] text-muted">
            <span>{isCandidate ? 'Reviewable JSON hardware test plan; requires an external physical runner.' : 'Illustrative Unity test case; its harness headers are not implemented.'}</span>
            <Button size="sm" onClick={() => downloadText(fileName, scenario.testCode, isCandidate ? 'application/json' : 'text/x-c')}>
              Export .{isCandidate ? 'json' : 'c'}
            </Button>
          </div>
          <CodeBlock code={scenario.testCode} />
        </div>
      </Modal>
    </div>
  )
}
