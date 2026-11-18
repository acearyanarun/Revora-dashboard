import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { DemoBadge, EmptyState, PageHeader, Panel, Pill } from '../components/ui/primitives'
import { formatDateTime } from '../lib/format'
import { useWorkspace } from '../state/context'
import { regressionStatus } from '../lib/status'


export function RegressionLibraryPage() {
  const { regressionTests } = useWorkspace()
  const [q, setQ] = useState('')
  const navigate = useNavigate()
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase()
    return regressionTests.filter((r) => !t || [r.name, r.originIncidentId, r.platform, r.failureCategory, r.firmwareVersion].some((s) => s.toLowerCase().includes(t)))
  }, [regressionTests, q])

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow={<DemoBadge />}
        title="Regression Library"
        subtitle="Reproduction plans and regression checks preserved from investigations. Verify engine type and execution evidence before relying on a result."
      />
      <Panel bodyClassName="">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <span className="text-[12.5px] text-muted">{rows.length} tests</span>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tests, incidents, platforms"
              aria-label="Search regression tests"
              className="h-8 w-56 rounded-md border border-line-strong bg-[#070c16] pr-2 pl-8 text-[12.5px] placeholder:text-faint focus:border-sky-400/60 focus:outline-none sm:w-72"
            />
          </label>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="No tests match your search" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-faint">
                  {['Test Name', 'Originating Incident', 'Device Platform', 'Failure Category', 'Firmware Version', 'Last Execution', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => navigate(`/regression/${t.id}`)} className="cursor-pointer border-b border-line/70 last:border-0 hover:bg-hover/50">
                    <td className="px-4 py-3">
                      <Link to={`/regression/${t.id}`} onClick={(e) => e.stopPropagation()} className="mono text-sky-300 hover:underline">
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/investigations/${t.originIncidentId}`} onClick={(e) => e.stopPropagation()} className="mono text-muted hover:text-fg">
                        {t.originIncidentId}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted">{t.platform}</td>
                    <td className="px-4 py-3 text-muted">{t.failureCategory}</td>
                    <td className="mono px-4 py-3 text-muted">{t.firmwareVersion}</td>
                    <td className="px-4 py-3 text-muted tabular-nums">{t.lastExecutedAt ? formatDateTime(t.lastExecutedAt) : 'Never'}</td>
                    <td className="px-4 py-3">
                      <Pill tone={regressionStatus[t.status].tone}>{regressionStatus[t.status].label}</Pill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )
}
