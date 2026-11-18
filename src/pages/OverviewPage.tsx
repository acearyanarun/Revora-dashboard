import { ArrowRight, Bug, CheckCircle2, FileQuestion, FlaskConical, Inbox, Library, ListChecks, ScanSearch, ShieldCheck, Upload } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { InvestigationTable } from '../components/investigation/InvestigationTable'
import { WorkflowStepper } from '../components/investigation/WorkflowStepper'
import { DemoBadge, LinkButton, PageHeader, Panel, StatusBadge } from '../components/ui/primitives'
import { workflowStages } from '../lib/status'
import { useWorkspace } from '../state/context'

function SummaryCard({ label, value, hint, icon, to }: { label: string; value: number; hint: ReactNode; icon: ReactNode; to: string }) {
  return (
    <Link to={to} className="card group flex flex-col gap-3 p-4 transition-colors hover:border-line-strong hover:bg-raised">
      <div className="flex items-center justify-between">
        <span className="text-[12.5px] text-muted">{label}</span>
        <span className="text-faint transition-colors group-hover:text-muted">{icon}</span>
      </div>
      <div className="text-[28px] leading-none font-semibold tracking-tight tabular-nums">{value}</div>
      <div className="truncate text-xs text-faint">{hint}</div>
    </Link>
  )
}

const story = [
  { icon: Inbox, label: 'Customer reports failure' },
  { icon: Upload, label: 'Engineer imports evidence' },
  { icon: ScanSearch, label: 'Revora analyzes' },
  { icon: FlaskConical, label: 'Candidate reproduction generated' },
  { icon: Bug, label: 'Test reproduces the failure' },
  { icon: ShieldCheck, label: 'Correction evaluated' },
  { icon: Library, label: 'Preserved as regression test' },
]

export function OverviewPage() {
  const { incidents, progress, statusOf, regressionTests, devices } = useWorkspace()
  const open = incidents.filter((i) => !progress[i.id]?.regressionSaved)
  const confirmed = incidents.filter((i) => ['reproduction_confirmed', 'fix_validated'].includes(statusOf(i)))
  const awaiting = incidents.filter((i) => ['awaiting_evidence', 'insufficient_evidence'].includes(statusOf(i)))
  const created = regressionTests.filter((t) => t.status !== 'draft')
  const featured = incidents.find((i) => i.id === 'INC-001')
  const sorted = [...incidents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow={<DemoBadge>Demonstration data — not connected to a backend</DemoBadge>}
        title="Engineering Overview"
        subtitle="Turn field failures into reproducible engineering tests."
        actions={
          <LinkButton to="/investigations/INC-001" variant="primary" icon={<ArrowRight className="size-4" />}>
            Open INC-001
          </LinkButton>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Open Investigations" value={open.length} hint={`${incidents.length} incidents in workspace`} icon={<ListChecks className="size-4" />} to="/investigations" />
        <SummaryCard label="Reproductions Confirmed" value={confirmed.length} hint={confirmed.map((i) => i.id).join(', ') || 'None yet'} icon={<CheckCircle2 className="size-4" />} to="/investigations?status=confirmed" />
        <SummaryCard label="Investigations Awaiting Evidence" value={awaiting.length} hint={awaiting.map((i) => i.id).join(', ') || 'None'} icon={<FileQuestion className="size-4" />} to="/investigations?status=evidence" />
        <SummaryCard label="Regression Tests Created" value={created.length} hint={`${regressionTests.length - created.length} draft pending fix validation`} icon={<Library className="size-4" />} to="/regression" />
      </div>

      <Panel className="mb-6" bodyClassName="px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="label">How an investigation flows</span>
          <span className="hidden text-xs text-faint sm:inline">What happened, can we recreate it, how do we prevent it?</span>
        </div>
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {story.map((s, i) => (
            <li key={s.label} className="flex items-center gap-2 rounded-md border border-line bg-raised/60 px-2.5 py-2">
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-sky-400/10 text-sky-300">
                <s.icon className="size-3.5" />
              </span>
              <span className="text-[12px] leading-tight text-muted">
                <span className="mr-1 text-faint tabular-nums">{i + 1}.</span>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="grid gap-6 2xl:grid-cols-[1fr_340px]">
        <Panel title="Recent investigations" subtitle="Click a row to open the investigation workspace" bodyClassName="" actions={<Link to="/investigations" className="text-xs text-muted hover:text-fg">View all</Link>}>
          <InvestigationTable incidents={sorted} />
        </Panel>

        {featured && (
          <Panel title="Next action" subtitle={featured.id}>
            <div className="flex flex-col gap-4">
              <div>
                <div className="mb-1.5"><StatusBadge status={statusOf(featured)} /></div>
                <p className="text-[13.5px] leading-snug font-medium">{featured.title}</p>
                <p className="mt-1 text-xs text-muted">
                  {devices.find((d) => d.id === featured.deviceId)?.name} · {featured.firmwareVersion} · {featured.reportCount} customer reports
                </p>
              </div>
              <WorkflowStepper stages={workflowStages(progress[featured.id])} compact />
              <ul className="space-y-1.5 text-xs text-muted">
                {workflowStages(progress[featured.id]).map((s) => (
                  <li key={s.key} className="flex justify-between gap-2">
                    <span className={s.state === 'pending' ? 'text-faint' : 'text-fg/90'}>{s.label}</span>
                    <span className={s.state === 'current' ? 'text-sky-300' : s.state === 'complete' ? 'text-emerald-300/80' : s.state === 'failed' ? 'text-rose-300' : 'text-faint'}>{s.detail}</span>
                  </li>
                ))}
              </ul>
              <LinkButton to={`/investigations/${featured.id}`} className="w-full" icon={<ArrowRight className="size-4" />}>
                Continue investigation
              </LinkButton>
            </div>
          </Panel>
        )}
      </div>
    </div>
  )
}
