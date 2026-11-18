import { ChevronRight, FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DemoBadge, PageHeader, Panel, StatusBadge } from '../components/ui/primitives'
import { useWorkspace } from '../state/context'

export function LabIndexPage() {
  const { incidents, scenarios, statusOf, progress, devices } = useWorkspace()
  const withScenario = incidents.filter((i) => i.scenarioId && scenarios.some((s) => s.id === i.scenarioId))
  const without = incidents.filter((i) => !withScenario.includes(i))

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow={<DemoBadge>Demo Simulation</DemoBadge>}
        title="Reproduction Lab"
        subtitle="Generate executable reproduction scenarios from incident evidence, run them, and evaluate proposed corrections."
      />
      <Panel title="Scenarios" subtitle="Incidents with a generated or generatable reproduction scenario" bodyClassName="divide-y divide-line">
        {withScenario.map((i) => {
          const s = scenarios.find((x) => x.id === i.scenarioId)!
          const p = progress[i.id]
          return (
            <Link key={i.id} to={`/lab/${i.id}`} className="group flex items-center gap-4 px-4 py-3.5 transition-colors hover:bg-hover/50">
              <span className="flex size-9 items-center justify-center rounded-lg bg-sky-400/10 text-sky-300">
                <FlaskConical className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="mono truncate text-[13px] text-fg">{s.testName}</div>
                <div className="truncate text-xs text-muted">
                  {i.id} · {devices.find((d) => d.id === i.deviceId)?.name} · {i.firmwareVersion} · {p.scenarioGenerated ? `${s.steps.length} steps` : 'not generated'}
                </div>
              </div>
              <StatusBadge status={statusOf(i)} />
              <ChevronRight className="size-4 text-faint group-hover:text-fg" />
            </Link>
          )
        })}
      </Panel>
      <p className="mt-4 text-xs text-faint">
        {without.length} other incidents ({without.map((i) => i.id).join(', ')}) do not have a scenario in this demo — they need more evidence or analysis first.
      </p>
    </div>
  )
}
