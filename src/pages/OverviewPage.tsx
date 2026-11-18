import { ArrowRight, CheckCircle2, FileQuestion, ListChecks } from 'lucide-react'
import { Link } from 'react-router-dom'
import { InvestigationTable } from '../components/investigation/InvestigationTable'
import { LinkButton, PageHeader, Panel } from '../components/ui/primitives'
import { useWorkspace } from '../state/context'

export function OverviewPage() {
  const { incidents, statusOf, api } = useWorkspace()
  const awaiting = incidents.filter((i) => ['awaiting_evidence', 'insufficient_evidence'].includes(statusOf(i)))
  const confirmed = incidents.filter((i) => ['reproduction_confirmed', 'fix_validated'].includes(statusOf(i)))
  const sorted = [...incidents].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))

  return (
    <div className="animate-in">
      <PageHeader
        title="Engineering Overview"
        subtitle="Investigate connected-device failures, create repeatable reproduction tests, and preserve the evidence."
        actions={<LinkButton to="/investigations" variant="primary" icon={<ArrowRight className="size-4" />}>View investigations</LinkButton>}
      />
      <div className="mb-5 rounded-lg border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-[12.5px] text-amber-100/90">
        {api.isDemo
          ? 'Demo mode: sample incidents and scripted execution results are illustrative. New incidents and parsed logs are stored only in this browser. Real firmware has not been executed.'
          : 'Remote runner mode: execution requests go to your configured external runner. Inspect original firmware, board, and broker evidence before accepting results. Sample incidents remain sample data.'}
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Investigations', count: incidents.length, icon: ListChecks, href: '/investigations' },
          { label: 'Awaiting evidence', count: awaiting.length, icon: FileQuestion, href: '/investigations?status=evidence' },
          { label: 'Marked reproduced', count: confirmed.length, icon: CheckCircle2, href: '/investigations?status=confirmed' },
        ].map(({ label, count, icon: Icon, href }) => (
          <Link key={label} to={href} className="card flex items-center justify-between p-4 hover:bg-raised">
            <div><div className="text-[12px] text-muted">{label}</div><div className="mt-1 text-[27px] font-semibold tabular-nums">{count}</div></div>
            <Icon className="size-5 text-faint" />
          </Link>
        ))}
      </div>
      <Panel title="Investigation queue" subtitle="Start with evidence, then review a candidate and its measured result." actions={<Link to="/investigations" className="text-xs text-sky-300 hover:underline">View all</Link>} bodyClassName="">
        <InvestigationTable incidents={sorted.slice(0, 8)} />
      </Panel>
    </div>
  )
}
