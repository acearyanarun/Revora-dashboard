import { Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { InvestigationTable } from '../components/investigation/InvestigationTable'
import { NewIncidentDialog } from '../components/investigation/NewIncidentDialog'
import { Button, EmptyState, PageHeader, Panel, Tabs } from '../components/ui/primitives'
import { useWorkspace } from '../state/context'
import type { ReproductionStatus } from '../types/domain'

type Filter = 'all' | 'progress' | 'confirmed' | 'failed' | 'evidence'

const groups: Record<Exclude<Filter, 'all'>, ReproductionStatus[]> = {
  progress: ['in_analysis', 'ready_for_reproduction'],
  confirmed: ['reproduction_confirmed', 'fix_validated'],
  failed: ['reproduction_failed'],
  evidence: ['awaiting_evidence', 'insufficient_evidence'],
}

export function InvestigationsPage() {
  const { incidents, devices, statusOf } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const filter = (params.get('status') as Filter) ?? 'all'
  const [q, setQ] = useState('')
  const [createOpen, setCreateOpen] = useState(false)

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    return [...incidents]
      .filter((i) => filter === 'all' || groups[filter]?.includes(statusOf(i)))
      .filter((i) => {
        if (!term) return true
        const d = devices.find((x) => x.id === i.deviceId)?.name ?? ''
        return [i.id, i.title, d, i.firmwareVersion, i.failureMode, i.failureCategory].some((s) => s.toLowerCase().includes(term))
      })
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [incidents, devices, filter, q, statusOf])

  const count = (f: Filter) => (f === 'all' ? incidents.length : incidents.filter((i) => groups[f].includes(statusOf(i))).length)

  return (
    <div className="animate-in">
      <PageHeader
        title="Investigations"
        subtitle="Customer-reported firmware failures. Create an investigation, attach logs, and develop a repeatable test candidate."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={() => setCreateOpen(true)}>New investigation</Button>}
      />
      <NewIncidentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
      <Panel bodyClassName="">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="overflow-x-auto">
            <Tabs<Filter>
              value={filter}
              onChange={(v) => setParams(v === 'all' ? {} : { status: v })}
              tabs={[
                { id: 'all', label: `All ${count('all')}` },
                { id: 'progress', label: `In progress ${count('progress')}` },
                { id: 'confirmed', label: `Confirmed ${count('confirmed')}` },
                { id: 'failed', label: `Not reproduced ${count('failed')}` },
                { id: 'evidence', label: `Awaiting evidence ${count('evidence')}` },
              ]}
            />
          </div>
          <label className="relative block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search incidents"
              aria-label="Search incidents"
              className="h-8 w-full rounded-md border border-line-strong bg-[#070c16] pr-2 pl-8 text-[12.5px] placeholder:text-faint focus:border-sky-400/60 focus:outline-none md:w-60"
            />
          </label>
        </div>
        {rows.length ? <InvestigationTable incidents={rows} /> : <EmptyState title="No investigations match">Try a different filter or search term.</EmptyState>}
      </Panel>
    </div>
  )
}
