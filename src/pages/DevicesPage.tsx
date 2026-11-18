import clsx from 'clsx'
import { ChevronDown, Cpu } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { DemoBadge, PageHeader, Panel } from '../components/ui/primitives'
import { formatDate } from '../lib/format'
import { useWorkspace } from '../state/context'

export function DevicesPage() {
  const { devices, incidents } = useWorkspace()
  const [open, setOpen] = useState<string | null>(devices[0]?.id ?? null)

  return (
    <div className="animate-in">
      <PageHeader
        eyebrow={<DemoBadge />}
        title="Devices"
        subtitle="Device profiles, firmware versions, and the test environments available for each. Context for investigations — not fleet monitoring."
      />
      <Panel bodyClassName="">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-line text-faint">
                {['Device', 'Model', 'Hardware Platform', 'Current Firmware', 'Connectivity', 'Linked Investigations', 'Test Environment', ''].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-[11px] font-medium tracking-[0.06em] uppercase">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {devices.map((d) => {
                const linked = incidents.filter((i) => i.deviceId === d.id)
                const demoEnv = d.testEnvironments.find((t) => t.availability === 'demo')
                const isOpen = open === d.id
                return (
                  <Fragment key={d.id}>
                    <tr className={clsx('cursor-pointer border-b border-line/70 hover:bg-hover/50', isOpen && 'bg-hover/30')} onClick={() => setOpen(isOpen ? null : d.id)}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-7 items-center justify-center rounded-md bg-raised text-muted ring-1 ring-line">
                            <Cpu className="size-3.5" />
                          </span>
                          <span className="text-fg">{d.name}</span>
                        </div>
                      </td>
                      <td className="mono px-4 py-3 text-muted">{d.model}</td>
                      <td className="px-4 py-3 text-muted">{d.platform}</td>
                      <td className="mono px-4 py-3 text-muted">{d.firmware[0].version}</td>
                      <td className="px-4 py-3 text-muted">{d.protocol}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {linked.length ? (
                            linked.map((i) => (
                              <Link key={i.id} to={`/investigations/${i.id}`} onClick={(e) => e.stopPropagation()} className="mono rounded bg-line px-1.5 py-0.5 text-[11px] text-sky-300 hover:bg-line-strong">
                                {i.id}
                              </Link>
                            ))
                          ) : (
                            <span className="text-faint">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {demoEnv ? <span className="text-[12px] text-fg/90">{demoEnv.environment} <span className="text-amber-200/80">(demo)</span></span> : <span className="text-[12px] text-faint">None available</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" aria-expanded={isOpen} aria-label={`Toggle ${d.name} details`} className="rounded p-1 text-faint hover:text-fg">
                          <ChevronDown className={clsx('size-4 transition-transform', isOpen && 'rotate-180')} />
                        </button>
                      </td>
                    </tr>
                    {isOpen && (
                      <tr className="border-b border-line/70 bg-[#09101c]">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="animate-in grid gap-5 md:grid-cols-2">
                            <div>
                              <div className="label mb-2">Firmware versions</div>
                              <ul className="flex flex-col gap-1.5">
                                {d.firmware.map((f, idx) => (
                                  <li key={f.version} className="flex items-center gap-3 text-[12.5px]">
                                    <span className="mono w-14 text-fg">{f.version}</span>
                                    <span className="text-muted">
                                      {f.framework} {f.frameworkVersion}
                                    </span>
                                    <span className="text-faint">· {formatDate(f.releasedAt)}</span>
                                    {idx === 0 && <span className="rounded bg-sky-400/10 px-1.5 text-[10.5px] text-sky-300">latest</span>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <div className="label mb-2">Test environments</div>
                              <ul className="flex flex-col gap-1.5">
                                {d.testEnvironments.map((t) => (
                                  <li key={t.environment} className="flex items-center justify-between gap-3 text-[12.5px]">
                                    <span className="text-fg/90">{t.environment}</span>
                                    <span className={clsx('rounded px-1.5 py-0.5 text-[10.5px] font-medium uppercase', t.availability === 'demo' ? 'bg-amber-400/10 text-amber-200' : 'bg-line text-faint')}>
                                      {t.availability === 'demo' ? 'Demo simulation' : 'Planned'}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  )
}
