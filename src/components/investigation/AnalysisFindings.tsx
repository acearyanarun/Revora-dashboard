import clsx from 'clsx'
import { BadgeCheck, CircleDashed, Eye, HelpCircle, Lightbulb } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Finding, FindingKind, Incident } from '../../types/domain'

const sections: { kind: FindingKind; title: string; icon: typeof Eye; blurb: string; accent: string; border: string }[] = [
  { kind: 'observed', title: 'Observed Facts', icon: Eye, blurb: 'Directly supported by attached evidence.', accent: 'text-sky-300', border: 'border-line' },
  { kind: 'hypothesis', title: 'Hypotheses', icon: Lightbulb, blurb: 'Possible explanations. Not root causes.', accent: 'text-amber-300', border: 'border-dashed border-amber-400/30' },
  { kind: 'missing', title: 'Missing Evidence', icon: HelpCircle, blurb: 'Would narrow the hypotheses if obtained.', accent: 'text-slate-300', border: 'border-dashed border-line-strong' },
  { kind: 'confirmed', title: 'Confirmed Findings', icon: BadgeCheck, blurb: 'Established by a reproduction run.', accent: 'text-emerald-300', border: 'border-emerald-400/25' },
]

export function AnalysisFindings({
  incident,
  onEvidenceRef,
  footer,
}: {
  incident: Incident
  onEvidenceRef: (eventId: string) => void
  footer?: ReactNode
}) {
  const byKind = (k: FindingKind) => incident.findings.filter((f) => f.kind === k)
  const label = (id: string) => incident.timeline.find((e) => e.id === id)

  const renderFinding = (f: Finding) => (
    <li key={f.id} className="animate-in flex flex-col gap-1.5 text-[13px] leading-snug text-fg/90">
      <div className="flex items-start gap-2">
        <span className="mt-[7px] size-1 shrink-0 rounded-full bg-current opacity-50" />
        <span>{f.statement}</span>
      </div>
      {(f.evidenceRefs?.length || f.verification) && (
        <div className="ml-3 flex flex-wrap gap-1.5">
          {f.verification && (
            <span className={clsx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10.5px]', f.verification === 'testable' ? 'bg-amber-400/10 text-amber-200' : 'bg-line text-faint')}>
              <CircleDashed className="size-3" />
              {f.verification === 'testable' ? 'Unverified · testable by reproduction' : 'Unverified'}
            </span>
          )}
          {f.evidenceRefs?.map((r) => {
            const ev = label(r)
            return (
              <button
                key={r}
                type="button"
                onClick={() => onEvidenceRef(r)}
                className="mono rounded bg-sky-400/10 px-1.5 py-0.5 text-[10.5px] text-sky-300 hover:bg-sky-400/20"
                title="Show in timeline"
              >
                {ev ? `${ev.timestamp} ${ev.label}` : r}
              </button>
            )
          })}
        </div>
      )}
    </li>
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        {sections.map((s) => {
          const items = byKind(s.kind)
          return (
            <div key={s.kind} className={clsx('rounded-lg border bg-raised/40 p-3.5', s.border)}>
              <div className="mb-2.5 flex items-center gap-2">
                <s.icon className={clsx('size-4', s.accent)} />
                <h3 className={clsx('text-[12.5px] font-semibold', s.accent)}>{s.title}</h3>
                <span className="ml-auto text-[11px] text-faint tabular-nums">{items.length}</span>
              </div>
              <p className="mb-3 text-[11.5px] text-faint">{s.blurb}</p>
              {items.length ? (
                <ul className="flex flex-col gap-2.5">{items.map(renderFinding)}</ul>
              ) : (
                <p className="text-[12px] text-muted">
                  {s.kind === 'confirmed'
                    ? 'Nothing confirmed yet. A finding becomes confirmed only when a reproduction run recreates the field failure.'
                    : 'None recorded.'}
                </p>
              )}
            </div>
          )
        })}
      </div>
      {footer}
    </div>
  )
}
