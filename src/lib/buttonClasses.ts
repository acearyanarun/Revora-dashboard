import clsx from 'clsx'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

export function buttonClasses(variant: ButtonVariant = 'secondary', size: 'sm' | 'md' = 'md', className?: string) {
  return clsx(
    'inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40 aria-disabled:pointer-events-none aria-disabled:opacity-40',
    size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
    variant === 'primary' && 'bg-sky-500 text-slate-950 hover:bg-sky-400 shadow-[inset_0_1px_0_rgb(255_255_255/0.25)]',
    variant === 'secondary' && 'border border-line-strong bg-raised text-fg hover:bg-hover hover:border-[#2f3e5c]',
    variant === 'ghost' && 'text-muted hover:text-fg hover:bg-hover',
    variant === 'danger' && 'border border-rose-500/30 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20',
    className,
  )
}
