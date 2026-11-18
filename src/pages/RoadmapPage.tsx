import { CircuitBoard, Rocket, ShieldCheck, Sparkles, Waypoints } from 'lucide-react'
import { PageHeader, Panel } from '../components/ui/primitives'

const items = [
  { icon: Sparkles, title: 'AI-assisted patch generation', body: 'Propose candidate corrections for a confirmed reproduction, always gated on the reproduction test and engineer review.' },
  { icon: ShieldCheck, title: 'Formal verification', body: 'Check properties of recovery state machines (e.g. "MQTT always reconnects after IP re-acquisition") beyond the scenarios that were tested.' },
  { icon: CircuitBoard, title: 'Hardware-in-the-loop testing', body: 'Run the same scenario on physical boards with a programmable access point and network impairment.' },
  { icon: Rocket, title: 'Staged OTA deployment', body: 'Hand a validated correction to an existing OTA pipeline for canary rollout. Revora would not deploy firmware itself without explicit integration.' },
  { icon: Waypoints, title: 'Fleet-wide remediation', body: 'Identify which deployed devices match a reproduced failure signature and track remediation across the fleet.' },
]

export function RoadmapPage() {
  return (
    <div className="animate-in">
      <PageHeader
        eyebrow={<span className="rounded border border-line-strong px-1.5 py-0.5 text-[10.5px] font-semibold tracking-wide text-muted uppercase">Roadmap · not available</span>}
        title="Future Capabilities"
        subtitle="Where Revora is headed. None of these are implemented in the current prototype."
      />
      <Panel bodyClassName="divide-y divide-line">
        {items.map((i) => (
          <div key={i.title} className="flex gap-4 px-4 py-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-raised text-faint ring-1 ring-line">
              <i.icon className="size-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[13.5px] font-medium">{i.title}</h3>
                <span className="rounded bg-line px-1.5 text-[10.5px] text-faint uppercase">Planned</span>
              </div>
              <p className="mt-1 max-w-2xl text-[12.5px] text-muted">{i.body}</p>
            </div>
          </div>
        ))}
      </Panel>
    </div>
  )
}
