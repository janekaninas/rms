'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/upload', label: 'Daily Upload' },
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
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? 'bg-[var(--color-accent)] text-white'
                : 'text-[var(--color-sidebar-text-muted)] hover:bg-white/5 hover:text-[var(--color-sidebar-text)]'
            }`}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
