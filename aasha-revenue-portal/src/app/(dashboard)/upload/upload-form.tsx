'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { uploadBookingsCsv } from '@/lib/actions/upload-bookings'
import { uploadCancelCsv } from '@/lib/actions/upload-cancel'
import { uploadRoomRevenueCsv } from '@/lib/actions/upload-room-revenue'
import { uploadRoomChangeLog } from '@/lib/actions/upload-room-change-log'
import { confirmNoData } from '@/lib/actions/confirm-no-data'

type UploadType = 'bookings' | 'cancel' | 'room_revenue' | 'room_change_log'

const LABELS: Record<UploadType, string> = {
  bookings: 'Bookings (Reservation by Creation Date)',
  cancel: 'Cancelled Reservations',
  room_revenue: 'Room Revenue Breakdown (today\'s rates)',
  room_change_log: 'Reservation Change Log',
}

export function UploadForm() {
  const [status, setStatus] = useState<string | null>(null)
  const [pendingType, setPendingType] = useState<UploadType | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleUpload(type: UploadType, file: File) {
    setStatus('Uploading...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('Not logged in')
      return
    }
    const text = await file.text()

    try {
      let result
      if (type === 'bookings') result = await uploadBookingsCsv(file.name, text, user.id)
      else if (type === 'cancel') result = await uploadCancelCsv(file.name, text, user.id)
      else if (type === 'room_revenue')
        result = await uploadRoomRevenueCsv(file.name, text, new Date().toISOString().slice(0, 10), user.id)
      else result = await uploadRoomChangeLog(file.name, text, user.id)

      setStatus(`Done: ${JSON.stringify(result)}`)
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleNoData(type: UploadType) {
    setPendingType(type)
    setStatus('Confirming...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('Not logged in')
      setPendingType(null)
      return
    }

    try {
      await confirmNoData(type, user.id)
      setStatus(`Confirmed: no ${LABELS[type]} today`)
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setPendingType(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(LABELS) as UploadType[]).map((type) => (
        <div
          key={type}
          className="flex flex-col gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <label className="flex flex-1 flex-col gap-1">
            <span className="text-sm font-medium">{LABELS[type]}</span>
            <input
              type="file"
              accept=".csv"
              className="text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-md file:border-0 file:bg-[var(--color-accent)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-[var(--color-accent-hover)]"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(type, file)
              }}
            />
          </label>
          <button
            type="button"
            disabled={pendingType === type}
            onClick={() => handleNoData(type)}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-[var(--color-text-muted)] underline decoration-dotted underline-offset-4 hover:text-[var(--color-text)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            No data today
          </button>
        </div>
      ))}
      {status && (
        <p className={`text-sm ${status.startsWith('Error:') ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]'}`}>
          {status}
        </p>
      )}
    </div>
  )
}
