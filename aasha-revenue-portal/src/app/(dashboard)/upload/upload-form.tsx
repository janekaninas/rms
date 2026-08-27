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

const UPLOAD_TYPES = Object.keys(LABELS) as UploadType[]

type StatusByType = Record<UploadType, string | null>

const EMPTY_STATUS: StatusByType = {
  bookings: null,
  cancel: null,
  room_revenue: null,
  room_change_log: null,
}

export function UploadForm() {
  const [status, setStatus] = useState<StatusByType>(EMPTY_STATUS)
  const [pendingType, setPendingType] = useState<UploadType | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  function setCardStatus(type: UploadType, message: string | null) {
    setStatus((prev) => ({ ...prev, [type]: message }))
  }

  async function handleUpload(type: UploadType, file: File) {
    setCardStatus(type, 'Uploading...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCardStatus(type, 'Not logged in')
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

      setCardStatus(type, `Done: ${JSON.stringify(result)}`)
    } catch (err) {
      setCardStatus(type, `Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  async function handleNoData(type: UploadType) {
    setPendingType(type)
    setCardStatus(type, 'Confirming...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setCardStatus(type, 'Not logged in')
      setPendingType(null)
      return
    }

    try {
      await confirmNoData(type, user.id)
      setCardStatus(type, `Confirmed: no ${LABELS[type]} today`)
    } catch (err) {
      setCardStatus(type, `Error: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setPendingType(null)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {UPLOAD_TYPES.map((type) => (
        <div
          key={type}
          className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-medium">{LABELS[type]}</span>
              <input
                type="file"
                accept=".csv"
                className="rounded-md text-sm text-text-muted file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
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
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-text-muted underline decoration-dotted underline-offset-4 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              No data today
            </button>
          </div>
          {status[type] && (
            <p className={`text-sm ${status[type]!.startsWith('Error:') ? 'text-danger' : 'text-text-muted'}`}>
              {status[type]}
            </p>
          )}
        </div>
      ))}
    </div>
  )
}
