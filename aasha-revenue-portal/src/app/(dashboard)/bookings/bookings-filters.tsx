'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'

export function BookingsFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <input
        type="date"
        defaultValue={searchParams.get('dateFrom') ?? ''}
        onChange={(e) => update('dateFrom', e.target.value)}
        className="rounded border border-border px-2 py-1"
      />
      <span className="text-text-muted">to</span>
      <input
        type="date"
        defaultValue={searchParams.get('dateTo') ?? ''}
        onChange={(e) => update('dateTo', e.target.value)}
        className="rounded border border-border px-2 py-1"
      />
      <select
        defaultValue={searchParams.get('status') ?? ''}
        onChange={(e) => update('status', e.target.value)}
        className="rounded border border-border px-2 py-1"
      >
        <option value="">All statuses</option>
        <option value="confirmed">Confirmed</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
  )
}
