import { ArrowLeft, Brain, ChevronRight, FlaskConical, FolderOpen, GitCompareArrows, Info, Library, Activity } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnalysisFindings } from '../components/investigation/AnalysisFindings'
import { EventTimeline } from '../components/investigation/EventTimeline'
import { EvidencePanel } from '../components/investigation/EvidencePanel'
import { WorkflowStepper } from '../components/investigation/WorkflowStepper'
import { Button, DemoBadge, EmptyState, KeyValue, LinkButton, Panel, StatusBadge } from '../components/ui/primitives'
import { formatDate, relativeTime } from '../lib/format'
import { workflowStages } from '../lib/status'
import { useWorkspace } from '../state/context'

export function InvestigationDetailPage() {
  const { id = '' } = useParams()
  const { incidents, devices, progress, statusOf, regressionTests, createScenarioCandidate } = useWorkspace()
  const navigate = useNavigate()
  const incident = incidents.find((i) => i.id === id)
  const [selectedEvent, setSelectedEvent] = useState<string | undefined>(() => incident?.timeline.find((e) => e.severity === 'failure')?.id)

  if (!incident) {
    return (
      <EmptyState title={`Investigation ${id} not found`}>
        <Link to="/investigations" className="text-sky-300 hover:underline">Back to investigations</Link>
      </EmptyState>
    )
  }

  const device = devices.find((d) => d.id === incident.deviceId)
  const prog = progress[incident.id]
  const stages = workflowStages(prog)
  const status = statusOf(incident)
  const evidenceCount = incident.evidence.length
  const regression = regressionTests.find((t) => t.originIncidentId === incident.id)

  const selectEvent = (eid: string) => {
    setSelectedEvent(eid)
    document.getElementById('timeline')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const hasUsableLog = incident.evidence.some((e) => e.kind === 'device_log' && !!e.rawText) && incident.timeline.length > 0
  const canGenerate = !!incident.scenarioId || hasUsableLog
  const generate = () => {
    if (!incident.scenarioId && hasUsableLog) createScenarioCandidate(incident.id)
    navigate(`/lab/${incident.id}${prog.scenarioGenerated ? '' : '?generate=1'}`)
  }

  return (
    <div className="animate-in">
      <nav className="mb-4 flex items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
        <Link to="/investigations" className="inline-flex items-center gap-1 hover:text-fg">
          <ArrowLeft className="size-3.5" /> Investigations
        </Link>
        <ChevronRight className="size-3 text-faint" />
        <span className="mono text-fg">{incident.id}</span>
      </nav>

      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="mono rounded bg-line px-1.5 py-0.5 text-[12px] text-muted">{incident.id}</span>
            <StatusBadge status={status} />
            {incident.id.startsWith('INC-00') && <DemoBadge>Sample incident</DemoBadge>}
          </div>
          <h1 className="text-[21px] leading-snug font-semibold tracking-tight text-balance">{incident.title}</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {device?.name} · <span className="mono">{incident.firmwareVersion}</span> · {incident.framework} · {incident.failureCategory}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {prog.reproduction === 'reproduced' && incident.scenarioId && (
            <LinkButton to={`/lab/${incident.id}/validation`} icon={<GitCompareArrows className="size-4" />}>
              Fix validation
            </LinkButton>
          )}
          {regression && prog.regressionSaved && (
            <LinkButton to={`/regression/${regression.id}`} icon={<Library className="size-4" />}>
              Regression test
            </LinkButton>
          )}
          <Button
            variant="primary"
            icon={<FlaskConical className="size-4" />}
            onClick={generate}
            disabled={!canGenerate}
            title={canGenerate ? undefined : 'Upload a timestamped ESP-IDF connectivity log before creating a candidate'}
          >
            {prog.scenarioGenerated ? 'Open in Reproduction Lab' : 'Generate Reproduction Scenario'}
          </Button>
        </div>
      </header>

      <Panel className="mb-5" bodyClassName="px-4 pt-4 pb-4">
        <WorkflowStepper stages={stages} />
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-5">
          <div id="timeline" className="scroll-mt-4">
            <Panel
              title="Event timeline"
              subtitle="Device behavior before, during, and after the failure — reconstructed from the attached serial log"
              icon={<Activity className="size-4" />}
            >
              <EventTimeline incident={incident} selectedId={selectedEvent} onSelect={setSelectedEvent} />
            </Panel>
          </div>

          <Panel
            title="Investigation findings"
            subtitle="What Revora observed, what it suspects, and what it cannot yet see"
            icon={<Brain className="size-4" />}
            actions={<DemoBadge>Sample analysis</DemoBadge>}
          >
            <AnalysisFindings
              incident={incident}
              onEvidenceRef={selectEvent}
              footer={
                <div className="flex flex-col gap-3 rounded-lg border border-line bg-raised/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-[12px] text-muted">
                    <Info className="mt-0.5 size-3.5 shrink-0 text-sky-300" />
                    <span>
                      {incident.scenarioId
                        ? 'A scenario candidate is available. A real run is still required to verify the hypothesis.'
                        : hasUsableLog
                          ? 'A test candidate can be drafted from the observed connectivity events. Fault timings need engineer review.'
                          : 'Upload an ESP-IDF serial log with timestamps and connectivity events to create a candidate.'}
                    </span>
                  </div>
                  <Button variant="primary" icon={<FlaskConical className="size-4" />} onClick={generate} disabled={!canGenerate} className="shrink-0">
                    Generate Reproduction Scenario
                  </Button>
                </div>
              }
            />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel title="Incident overview" icon={<Info className="size-4" />}>
            <div className="mb-4 rounded-md border-l-2 border-sky-400/60 bg-raised/60 px-3 py-2.5">
              <div className="label mb-1">Customer-reported symptom</div>
              <p className="text-[13px] leading-snug text-fg/90">“{incident.customerSymptom}”</p>
            </div>
            <KeyValue
              items={[
                { k: 'Device', v: device?.name ?? '—' },
                { k: 'Firmware', v: <span className="mono">{incident.firmwareVersion}</span> },
                ...(incident.firmwareSourceRef ? [{ k: 'Source reference', v: <span className="mono" title={incident.firmwareSourceRef}>{incident.firmwareSourceRef}</span> }] : []),
                { k: 'Framework', v: incident.framework },
                { k: 'Failure category', v: incident.failureCategory },
                { k: 'First reported', v: formatDate(incident.firstReportedAt) },
                { k: 'Customer reports', v: incident.reportCount },
                { k: 'Evidence', v: `${evidenceCount} item${evidenceCount === 1 ? '' : 's'}` },
                { k: 'Last updated', v: relativeTime(incident.updatedAt) },
              ]}
            />
            <div className="mt-4 border-t border-line pt-3">
              <div className="label mb-1.5">Investigation status</div>
              <StatusBadge status={status} />
            </div>
          </Panel>

          <Panel title="Evidence" icon={<FolderOpen className="size-4" />} subtitle="Logs, configuration, and references attached to this incident">
            <EvidencePanel incident={incident} />
          </Panel>
        </div>
      </div>
    </div>
  )
}
