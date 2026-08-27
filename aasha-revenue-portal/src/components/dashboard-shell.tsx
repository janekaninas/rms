import { SidebarNav } from './sidebar-nav'

export function DashboardShell({
  title,
  actions,
  children,
}: {
  title: React.ReactNode
  actions?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-sidebar-bg text-sidebar-text">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
          <span className="inline-block h-2 w-2 rounded-full bg-accent" />
          <p className="text-sm font-semibold tracking-wide">Aasha Revenue Portal</p>
        </div>
        <SidebarNav />
      </aside>
      <div className="flex-1">
        <header className="flex items-center justify-between gap-4 border-b border-border bg-surface px-8 py-5">
          <h1 className="text-lg font-semibold">{title}</h1>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
