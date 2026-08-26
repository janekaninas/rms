'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/upload', label: 'Daily Upload' },
  { href: '/reconciliation', label: 'Reconciliation' },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-1 p-3">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar-bg ${
              active
                ? 'bg-accent text-white'
                : 'text-sidebar-text-muted hover:bg-white/5 hover:text-sidebar-text'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
