import { ArrowRight, ChevronRight } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { relativeTime } from '../../lib/format'
import { useWorkspace } from '../../state/context'
import type { Incident } from '../../types/domain'
import { StatusBadge } from '../ui/primitives'

function actionFor(status: ReturnType<ReturnType<typeof useWorkspace>['statusOf']>) {
  switch (status) {
    case 'ready_for_reproduction':
      return 'Run reproduction'
    case 'insufficient_evidence':
    case 'awaiting_evidence':
      return 'Add evidence'
    case 'reproduction_failed':
      return 'Review scenario'
    case 'in_analysis':
      return 'Continue analysis'
    default:
      return 'Open'
  }
}

export function InvestigationTable({ incidents }: { incidents: Incident[] }) {
  const { devices, statusOf } = useWorkspace()
  const navigate = useNavigate()
  const deviceName = (id: string) => devices.find((d) => d.id === id)?.name ?? id

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-[13px]">
        <thead>
          <tr className="border-b border-line text-faint">
            {['Incident ID', 'Device', 'Firmware Version', 'Failure Category', 'Reproduction Status', 'Last Updated', 'Action'].map((h) => (
              <th key={h} scope="col" className="px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {incidents.map((i) => {
            const status = statusOf(i)
            return (
              <tr
                key={i.id}
                onClick={() => navigate(`/investigations/${i.id}`)}
                className="group cursor-pointer border-b border-line/70 transition-colors last:border-0 hover:bg-hover/50"
              >
                <td className="px-4 py-3">
                  <Link to={`/investigations/${i.id}`} onClick={(e) => e.stopPropagation()} className="mono font-medium text-sky-300 hover:underline">
                    {i.id}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="text-fg">{deviceName(i.deviceId)}</div>
                  <div className="max-w-[260px] truncate text-xs text-faint">{i.title}</div>
                </td>
                <td className="mono px-4 py-3 text-muted">{i.firmwareVersion}</td>
                <td className="px-4 py-3">
                  <div className="whitespace-nowrap text-fg">{i.failureMode}</div>
                  {i.failureMode !== i.failureCategory && <div className="whitespace-nowrap text-xs text-faint">{i.failureCategory}</div>}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={status} />
                </td>
                <td className="px-4 py-3 text-muted tabular-nums">{relativeTime(i.updatedAt)}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 text-[12.5px] text-muted group-hover:text-fg">
                    {actionFor(status)}
                    {status === 'ready_for_reproduction' ? <ArrowRight className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
