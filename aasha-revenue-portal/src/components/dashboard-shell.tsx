import { SidebarNav } from './sidebar-nav'

export function DashboardShell({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-60 shrink-0 bg-[var(--color-sidebar-bg)] text-[var(--color-sidebar-text)]">
        <div className="flex items-center gap-2 border-b border-white/10 px-4 py-5">
          <span className="inline-block h-2 w-2 rounded-full bg-[var(--color-accent)]" />
          <p className="text-sm font-semibold tracking-wide">Aasha Revenue Portal</p>
        </div>
        <SidebarNav />
      </aside>
      <div className="flex-1">
        <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-8 py-5">
          <h1 className="text-lg font-semibold">{title}</h1>
        </header>
        <main className="p-8">{children}</main>
      </div>
    </div>
  )
}
