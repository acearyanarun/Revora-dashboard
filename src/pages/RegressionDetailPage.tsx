import clsx from 'clsx'
import { ArrowLeft, Download, FileCheck2, History, ListOrdered, Play, Target } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { ExecutionConsole } from '../components/repro/ExecutionConsole'
import { CodeBlock } from '../components/ui/CodeBlock'
import { Button, DemoBadge, EmptyState, KeyValue, Panel, Pill } from '../components/ui/primitives'
import { useExecution } from '../hooks/useExecution'
import { downloadText, formatDateTime } from '../lib/format'
import { useWorkspace } from '../state/context'
import { regressionStatus } from '../lib/status'

export function RegressionDetailPage() {
  const { testId = '' } = useParams()
  const { regressionTests, incidents, scenarios, validations, api, recordRegressionRun } = useWorkspace()
  const test = regressionTests.find((t) => t.id === testId)
  const exec = useExecution(api.executionEngine)

  if (!test) return <EmptyState title="Regression test not found" />
  const incident = incidents.find((i) => i.id === test.originIncidentId)
  const scenario = scenarios.find((s) => s.testName === test.name)
  const validation = validations.find((v) => v.scenarioId === scenario?.id)
  // Only tests backed by a scenario script can be re-run in the demo engine.
  const rerunnable = !!scenario && test.status === 'active' && !!validation

  const rerun = () => {
    if (!scenario || !validation) return
    exec.run({ scenario, variant: 'corrected', firmwareRef: validation.correctionRef }, (e) => {
      if (e.verdict !== 'aborted') recordRegressionRun(test.id, e.verdict === 'passed' ? 'passed' : 'failed', validation.correctionRef, 'Re-run (demo simulation)')
    })
  }

  return (
    <div className="animate-in">
      <Link to="/regression" className="mb-4 inline-flex items-center gap-1 text-xs text-muted hover:text-fg">
        <ArrowLeft className="size-3.5" /> Regression Library
      </Link>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Pill tone={regressionStatus[test.status].tone}>{regressionStatus[test.status].label}</Pill>
            <DemoBadge />
          </div>
          <h1 className="mono truncate text-[19px] font-semibold">{test.name}</h1>
          <p className="mt-1 text-[13px] text-muted">
            {test.platform} · {test.failureCategory} · from{' '}
            <Link to={`/investigations/${test.originIncidentId}`} className="mono text-sky-300 hover:underline">
              {test.originIncidentId}
            </Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => downloadText(`test_${test.name}.c`, test.code, 'text/x-c')} icon={<Download className="size-3.5" />}>
            Export test
          </Button>
          <Button
            variant="primary"
            onClick={rerun}
            disabled={!rerunnable || exec.state.status === 'running'}
            title={rerunnable ? undefined : test.status === 'draft' ? 'Validate a fix and save the test before re-running' : 'Re-run is only scripted for INC-001 in this demo'}
            icon={<Play className="size-3.5" />}
          >
            Rerun test
          </Button>
        </div>
      </div>

      {exec.state.status !== 'idle' && (
        <div className="mb-5">
          <ExecutionConsole log={exec.state.log} status={exec.state.status} height="h-[200px]" title={`rerun · ${validation?.correctionRef} · demo simulation`} resultTone="pass" />
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Expected behavior" icon={<Target className="size-4" />}>
            <p className="text-[13.5px] leading-relaxed text-fg/90">{test.expectedBehavior}</p>
          </Panel>
          <Panel title="Generated test code" subtitle={`test_${test.name}.c`} bodyClassName="p-3">
            <CodeBlock code={test.code} maxHeight="max-h-[480px]" />
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Original incident">
            {incident ? (
              <div className="flex flex-col gap-3">
                <Link to={`/investigations/${incident.id}`} className="text-[13px] leading-snug text-fg hover:text-sky-300">
                  <span className="mono mr-1.5 text-sky-300">{incident.id}</span>
                  {incident.title}
                </Link>
                <KeyValue items={[{ k: 'Firmware', v: <span className="mono">{test.firmwareVersion}</span> }, { k: 'Platform', v: test.platform }]} />
              </div>
            ) : (
              <p className="text-xs text-muted">Incident not found.</p>
            )}
          </Panel>
          <Panel title="Reproduction steps" icon={<ListOrdered className="size-4" />}>
            <ol className="flex flex-col gap-1.5 text-[12.5px]">
              {test.steps.map((s, i) => (
                <li key={s} className="flex gap-2.5">
                  <span className="w-4 shrink-0 text-right text-faint tabular-nums">{i + 1}</span>
                  <span className="text-fg/90">{s}</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Execution history" icon={<History className="size-4" />}>
            {test.history.length ? (
              <ol className="flex flex-col gap-3">
                {test.history.map((h, i) => (
                  <li key={i} className="flex gap-2.5">
                    <span className={clsx('mt-1.5 size-2 shrink-0 rounded-full', h.verdict === 'passed' ? 'bg-emerald-400' : 'bg-rose-400')} />
                    <div className="min-w-0 text-[12.5px]">
                      <div className="flex flex-wrap gap-x-2">
                        <span className="mono text-fg">{h.firmwareRef}</span>
                        <span className={h.verdict === 'passed' ? 'text-emerald-300' : 'text-rose-300'}>{h.verdict}</span>
                      </div>
                      <div className="text-[11.5px] text-faint">
                        {formatDateTime(h.at)} · {h.note}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted">No executions recorded. This test is a draft until a correction is validated.</p>
            )}
          </Panel>
          <Panel title="Validation evidence" icon={<FileCheck2 className="size-4" />}>
            {test.validationEvidence.length ? (
              <ul className="flex flex-col gap-2 text-[12.5px] text-fg/90">
                {test.validationEvidence.map((v) => (
                  <li key={v} className="flex gap-2">
                    <span className="mt-[7px] size-1 shrink-0 rounded-full bg-muted" />
                    {v}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted">None yet.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  )
}
