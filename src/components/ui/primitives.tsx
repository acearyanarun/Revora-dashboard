import clsx from 'clsx'
import { FlaskConical, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { statusMeta, toneClasses, type Tone } from '../../lib/status'
import type { ReproductionStatus } from '../../types/domain'

import { buttonClasses, type ButtonVariant as Variant } from '../../lib/buttonClasses'


export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md'; icon?: ReactNode }) {
  return (
    <button type="button" className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  )
}

export function LinkButton({ to, variant = 'secondary', size = 'md', icon, className, children }: { to: string; variant?: Variant; size?: 'sm' | 'md'; icon?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={buttonClasses(variant, size, className)}>
      {icon}
      {children}
    </Link>
  )
}

export function Pill({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  const t = toneClasses[tone]
  return (
    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium ring-1 ring-inset whitespace-nowrap', t.bg, t.text, t.ring, className)}>
      <span className={clsx('size-1.5 rounded-full', t.dot)} aria-hidden />
      {children}
    </span>
  )
}

export function StatusBadge({ status }: { status: ReproductionStatus }) {
  const m = statusMeta[status]
  return <Pill tone={m.tone}>{m.label}</Pill>
}

export function DemoBadge({ children = 'Demo data', className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={clsx('inline-flex items-center gap-1 rounded border border-dashed border-amber-400/40 bg-amber-400/5 px-1.5 py-0.5 text-[10.5px] font-medium tracking-wide text-amber-200/90 uppercase', className)}
      title="This content is sample data for the prototype and is not connected to a backend."
    >
      <FlaskConical className="size-3" aria-hidden />
      {children}
    </span>
  )
}

export function Panel({
  title,
  icon,
  actions,
  children,
  className,
  bodyClassName,
  subtitle,
}: {
  title?: ReactNode
  subtitle?: ReactNode
  icon?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={clsx('card overflow-hidden', className)}>
      {title && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            {icon && <span className="text-muted">{icon}</span>}
            <div className="min-w-0">
              <h2 className="truncate text-[13px] font-semibold text-fg">{title}</h2>
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(bodyClassName ?? 'p-4')}>{children}</div>
    </section>
  )
}

export function PageHeader({ title, subtitle, actions, eyebrow }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && <div className="mb-2 flex flex-wrap items-center gap-2">{eyebrow}</div>}
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    ref.current?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onClose} />
      <div
        ref={ref}
        tabIndex={-1}
        className={clsx('animate-in relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-xl border border-line-strong bg-surface shadow-2xl outline-none', wide ? 'max-w-4xl' : 'max-w-lg')}
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-sm font-semibold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:bg-hover hover:text-fg" aria-label="Close">
            <X className="size-4" />
          </button>
        </div>
        <div className="overflow-auto">{children}</div>
      </div>
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: ReactNode }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex rounded-lg border border-line bg-raised p-0.5">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={value === t.id}
          onClick={() => onChange(t.id)}
          className={clsx(
            'rounded-md px-3 py-1 text-[12.5px] font-medium transition-colors',
            value === t.id ? 'bg-hover text-fg shadow-sm ring-1 ring-line-strong' : 'text-muted hover:text-fg',
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function KeyValue({ items, cols = 2 }: { items: { k: string; v: ReactNode }[]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={clsx('grid gap-x-6 gap-y-3', cols === 3 ? 'sm:grid-cols-3' : cols === 2 ? 'sm:grid-cols-2' : '')}>
      {items.map((i) => (
        <div key={i.k} className="min-w-0">
          <dt className="label mb-1">{i.k}</dt>
          <dd className="truncate text-[13px] text-fg">{i.v}</dd>
        </div>
      ))}
    </dl>
  )
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      {icon && <div className="text-faint">{icon}</div>}
      <p className="text-sm font-medium text-fg">{title}</p>
      {children && <div className="max-w-sm text-xs text-muted">{children}</div>}
    </div>
  )
}
