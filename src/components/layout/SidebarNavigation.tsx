import clsx from 'clsx'
import { Boxes, FlaskConical, LayoutDashboard, Library, RotateCcw, Search } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useWorkspace } from '../../state/context'

const primary = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/investigations', label: 'Investigations', icon: Search },
  { to: '/lab', label: 'Reproduction Lab', icon: FlaskConical },
  { to: '/regression', label: 'Regression Library', icon: Library },
]

export function RevoraMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#0f1a2c" stroke="#24314a" />
      <path d="M10 23V9h6.6a4.4 4.4 0 0 1 1.3 8.6L22.5 23" fill="none" stroke="#38bdf8" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="10" cy="23" r="1.6" fill="#38bdf8" />
    </svg>
  )
}

export function SidebarNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const { incidents, statusOf, resetDemo, api } = useWorkspace()
  const open = incidents.filter((i) => !['fix_validated'].includes(statusOf(i))).length

  const item = (to: string, label: string, Icon: typeof Boxes, end?: boolean, badge?: number) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        clsx(
          'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors',
          isActive ? 'bg-hover text-fg ring-1 ring-line-strong' : 'text-muted hover:bg-hover/60 hover:text-fg',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className={clsx('size-4', isActive ? 'text-accent' : 'text-faint group-hover:text-muted')} />
          <span className="flex-1">{label}</span>
          {badge != null && <span className="rounded bg-line px-1.5 text-[11px] text-muted tabular-nums">{badge}</span>}
        </>
      )}
    </NavLink>
  )

  return (
    <nav className="flex h-full flex-col gap-6 px-3 py-4" aria-label="Primary">
      <div className="flex items-center gap-2.5 px-1.5">
        <RevoraMark className="size-7" />
        <div className="leading-tight">
          <div className="text-[14px] font-semibold tracking-tight">Revora</div>
          <div className="text-[11px] text-faint">Field failure reproduction</div>
        </div>
      </div>

      <div className="rounded-md border border-line bg-raised px-2.5 py-2">
        <div className="label mb-0.5">Workspace</div>
        <div className="truncate text-[13px]">Example Co. — Firmware</div>
      </div>

      <div className="flex flex-col gap-0.5">
        {primary.map((p) => item(p.to, p.label, p.icon, p.end, p.to === '/investigations' ? open : undefined))}
      </div>

      <div className="mt-auto flex flex-col gap-3">
        <button type="button" onClick={() => { if (window.confirm('Reset sample investigations and clear locally saved workspace changes?')) void resetDemo() }} className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12px] text-muted hover:bg-hover/60 hover:text-fg">
          <RotateCcw className="size-3.5" /> Reset demo workspace
        </button>
        <div className="rounded-md border border-dashed border-amber-400/30 bg-amber-400/5 px-2.5 py-2 text-[11.5px] leading-snug text-amber-100/80">
          <span className="font-semibold text-amber-200">Prototype.</span> {api.isDemo ? 'Sample runs are scripted; new evidence remains in this browser.' : 'Remote execution is configured; sample incidents remain illustrative.'}
        </div>
      </div>
    </nav>
  )
}
