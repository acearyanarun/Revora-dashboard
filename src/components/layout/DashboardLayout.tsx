import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { RevoraMark, SidebarNavigation } from './SidebarNavigation'

export function DashboardLayout() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()

  useEffect(() => {
    document.getElementById('main')?.scrollTo({ top: 0 })
  }, [pathname])

  return (
    <div className="flex h-full">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <SidebarNavigation />
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <aside className="animate-in absolute inset-y-0 left-0 w-64 border-r border-line bg-surface">
            <button type="button" className="absolute top-4 right-3 rounded p-1 text-muted hover:text-fg" onClick={() => setOpen(false)} aria-label="Close navigation">
              <X className="size-4" />
            </button>
            <SidebarNavigation onNavigate={() => setOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-12 items-center gap-3 border-b border-line bg-surface px-4 lg:hidden">
          <button type="button" onClick={() => setOpen(true)} className="rounded p-1 text-muted hover:text-fg" aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <RevoraMark className="size-6" />
          <span className="text-sm font-semibold">Revora</span>
        </header>
        <main id="main" className="min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
