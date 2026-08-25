'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { uploadBookingsCsv } from '@/lib/actions/upload-bookings'
import { uploadCancelCsv } from '@/lib/actions/upload-cancel'
import { uploadRoomRevenueCsv } from '@/lib/actions/upload-room-revenue'
import { uploadRoomChangeLog } from '@/lib/actions/upload-room-change-log'

type UploadType = 'bookings' | 'cancel' | 'room_revenue' | 'room_change_log'

const LABELS: Record<UploadType, string> = {
  bookings: 'Bookings (Reservation by Creation Date)',
  cancel: 'Cancelled Reservations',
  room_revenue: 'Room Revenue Breakdown (today\'s rates)',
  room_change_log: 'Reservation Change Log',
}

export function UploadForm() {
  const [status, setStatus] = useState<string | null>(null)
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

  return (
    <div className="flex flex-col gap-4">
      {(Object.keys(LABELS) as UploadType[]).map((type) => (
        <label key={type} className="flex flex-col gap-1 rounded border p-3">
          <span className="text-sm font-medium">{LABELS[type]}</span>
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(type, file)
            }}
          />
        </label>
      ))}
      {status && (
        <p className={`text-sm ${status.startsWith('Error:') ? 'text-red-600' : 'text-gray-700'}`}>
          {status}
        </p>
      )}
    </div>
  )
}
