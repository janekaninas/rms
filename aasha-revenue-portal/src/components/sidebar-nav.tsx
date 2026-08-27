'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@/lib/supabase/server'

const NAV_ITEMS = [
  { href: '/upload', label: 'Daily Upload' },
  { href: '/reconciliation', label: 'Reconciliation', staffOnly: true },
]

export function SidebarNav({ role }: { role?: UserRole | null }) {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((item) => !item.staffOnly || role === 'staff')

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
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
