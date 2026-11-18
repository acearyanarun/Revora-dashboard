import clsx from 'clsx'
import { AlertTriangle, CheckCircle2, Info, Terminal, XCircle } from 'lucide-react'
import type { Incident, TimelineEvent, TimelineLane, TimelineSeverity } from '../../types/domain'
import { EmptyState } from '../ui/primitives'

const lanes: { id: TimelineLane; label: string }[] = [
  { id: 'wifi', label: 'Wi-Fi link' },
  { id: 'ip', label: 'IP / DHCP' },
  { id: 'mqtt', label: 'MQTT session' },
  { id: 'telemetry', label: 'Telemetry' },
]

const sevStyle: Record<TimelineSeverity, { icon: typeof Info; text: string; dot: string }> = {
  success: { icon: CheckCircle2, text: 'text-emerald-300', dot: 'bg-emerald-400 ring-emerald-400/30' },
  info: { icon: Info, text: 'text-sky-300', dot: 'bg-sky-400 ring-sky-400/30' },
  warning: { icon: AlertTriangle, text: 'text-amber-300', dot: 'bg-amber-400 ring-amber-400/30' },
  failure: { icon: XCircle, text: 'text-rose-300', dot: 'bg-rose-400 ring-rose-400/30' },
}

function Swimlane({ incident, selected, onSelect }: { incident: Incident; selected?: string; onSelect: (id: string) => void }) {
  const total = incident.timelineWindow?.seconds ?? Math.max(...incident.timeline.map((e) => e.t)) + 5
  const pct = (t: number) => `${(t / total) * 100}%`
  const ticks = Array.from({ length: Math.floor(total / 5) + 1 }, (_, i) => i * 5)

  return (
    <div className="rounded-lg border border-line bg-[#080d17] p-3">
      <div className="grid grid-cols-[92px_1fr] gap-y-2 text-[11.5px]">
        {lanes.map((lane) => (
          <div key={lane.id} className="contents">
            <div className="flex items-center text-muted">{lane.label}</div>
            <div className="relative h-6 rounded bg-line/40">
              {incident.laneSegments
                ?.filter((s) => s.lane === lane.id)
                .map((s) => (
                  <div
                    key={`${s.lane}-${s.from}`}
                    title={s.label ?? s.state}
                    className={clsx(
                      'absolute inset-y-1 flex items-center overflow-hidden rounded-sm pr-1.5 pl-3 text-[10.5px] whitespace-nowrap',
                      s.state === 'up' && 'bg-emerald-400/25 text-emerald-200/80',
                      s.state === 'down' && 'hatch text-rose-200/90 ring-1 ring-rose-400/30 ring-inset',
                      s.state === 'unknown' && 'border border-dashed border-amber-400/40 bg-amber-400/5 text-amber-200/80',
                    )}
                    style={{ left: pct(s.from), width: `calc(${pct(s.to - s.from)} - 2px)` }}
                  >
                    {s.label}
                  </div>
                ))}
              {incident.timeline
                .filter((e) => e.lane === lane.id)
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => onSelect(e.id)}
                    aria-label={`${e.timestamp} ${e.label}`}
                    className={clsx(
                      'absolute top-1/2 z-10 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 transition-transform hover:scale-150',
                      sevStyle[e.severity].dot,
                      selected === e.id && 'scale-150 outline-2 outline-offset-2 outline-white/70',
                    )}
                    style={{ left: pct(e.t) }}
                  />
                ))}
            </div>
          </div>
        ))}
        <div />
        <div className="relative h-4 text-[10.5px] text-faint tabular-nums">
          {ticks.map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: pct(t) }}>
              +{t}s
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-faint">
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm bg-emerald-400/40" />Connected</span>
        <span className="inline-flex items-center gap-1.5"><span className="hatch h-2 w-4 rounded-sm ring-1 ring-rose-400/40" />Down</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2 w-4 rounded-sm border border-dashed border-amber-400/50" />State not observed in logs</span>
        <span className="ml-auto">Window starts {incident.timelineWindow?.start} (device local time)</span>
      </div>
    </div>
  )
}

export function EventTimeline({ incident, selectedId, onSelect }: { incident: Incident; selectedId?: string; onSelect: (id: string) => void }) {
  if (incident.timeline.length === 0) {
    return (
      <EmptyState icon={<Terminal className="size-6" />} title="No timeline available">
        A timeline is built from device logs. Upload a serial or telemetry log in the Evidence panel to continue.
      </EmptyState>
    )
  }
  const selected: TimelineEvent | undefined = incident.timeline.find((e) => e.id === selectedId) ?? undefined
  const firstFailure = incident.timeline.find((e) => e.severity === 'failure')
  const outage = incident.laneSegments?.find((s) => s.lane === 'wifi' && s.state === 'down')
  const phaseOf = (t: number) => (!outage ? 'all' : t < outage.from ? 'before' : t < outage.to ? 'during' : 'after')
  const phaseLabel: Record<string, string> = { before: 'Before failure', during: 'Outage', after: 'After restoration', all: 'Events' }

  return (
    <div className="flex flex-col gap-4">
      <Swimlane incident={incident} selected={selectedId} onSelect={onSelect} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <ol className="relative flex flex-col" aria-label="Device events">
          <span className="absolute top-3 bottom-3 left-[71px] w-px bg-line-strong" aria-hidden />
          {incident.timeline.map((e) => {
            const S = sevStyle[e.severity]
            const phase = phaseOf(e.t)
            const isPhaseStart = e === incident.timeline.find((x) => phaseOf(x.t) === phase)
            return (
              <li key={e.id}>
                {isPhaseStart && (
                  <div className="mt-1 mb-1 ml-[86px] text-[10.5px] font-medium tracking-[0.08em] text-faint uppercase">
                    {phaseLabel[phase]}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => onSelect(e.id)}
                  aria-pressed={selectedId === e.id}
                  className={clsx(
                    'relative flex w-full items-center gap-3 rounded-md py-1.5 pr-2 pl-1 text-left transition-colors',
                    selectedId === e.id ? 'bg-hover ring-1 ring-line-strong' : 'hover:bg-hover/50',
                  )}
                >
                  <span className="mono w-[58px] shrink-0 text-right text-faint">{e.timestamp}</span>
                  <span className={clsx('relative z-10 flex size-[18px] shrink-0 items-center justify-center rounded-full bg-surface', S.text)}>
                    <S.icon className="size-4" />
                  </span>
                  <span className={clsx('flex-1 truncate text-[13px]', e.severity === 'failure' ? 'text-rose-200' : 'text-fg')}>{e.label}</span>
                  {e === firstFailure && <span className="rounded bg-rose-400/10 px-1.5 py-0.5 text-[10.5px] text-rose-300">first failure</span>}
                </button>
              </li>
            )
          })}
        </ol>

        <div className="flex min-w-0 flex-col rounded-lg border border-line bg-[#060a12]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="flex items-center gap-2 text-xs text-muted">
              <Terminal className="size-3.5" /> Raw log entry
            </span>
            {selected && <span className="mono text-[11px] text-faint">{selected.source}</span>}
          </div>
          {selected ? (
            <div className="animate-in p-3" key={selected.id}>
              <div className="mb-2 flex items-center gap-2 text-[12.5px]">
                <span className={sevStyle[selected.severity].text}>{selected.label}</span>
                <span className="text-faint">· {selected.timestamp}</span>
              </div>
              <pre className="font-mono text-[11.5px] leading-relaxed break-all whitespace-pre-wrap text-slate-300">
                {selected.raw.map((l, i) => (
                  <div key={i} className={clsx(l.startsWith('E ') && 'text-rose-300', l.startsWith('W ') && 'text-amber-200')}>
                    {l}
                  </div>
                ))}
              </pre>
            </div>
          ) : (
            <p className="p-4 text-xs text-muted">Select an event on the timeline or in the list to inspect the captured log lines.</p>
          )}
        </div>
      </div>
    </div>
  )
}
