'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseRoomRevenueCsv } from '@/lib/csv/parse-room-revenue'

export async function uploadRoomRevenueCsv(
  fileName: string,
  csvText: string,
  snapshotDate: string,
  uploadedBy: string
) {
  const rows = parseRoomRevenueCsv(csvText, snapshotDate)
  const supabase = createAdminClient()

  const { data: upload, error: uploadError } = await supabase
    .from('csv_uploads')
    .insert({ upload_type: 'room_revenue', file_name: fileName, uploaded_by: uploadedBy, rows_processed: rows.length })
    .select()
    .single()
  if (uploadError) throw uploadError

  // Every row in a given upload shares the same snapshot_date (it's supplied once, per file),
  // so "already exists" just means a prior upload already had a snapshot for this reservation on
  // this date -- i.e. this is a same-day re-upload. Check before upserting (same idea as
  // upload-bookings.ts's per-row .maybeSingle() check) so csv_uploads accurately reports new vs.
  // updated rather than mislabeling every row of a re-upload as "new".
  let rowsNew = 0
  let rowsUpdated = 0
  if (rows.length > 0) {
    const reservationNumbers = [...new Set(rows.map((row) => row.reservationNumber))]
    const { data: existing, error: existingError } = await supabase
      .from('daily_rate_snapshots')
      .select('reservation_number')
      .eq('snapshot_date', snapshotDate)
      .in('reservation_number', reservationNumbers)
    if (existingError) throw existingError
    const existingReservationNumbers = new Set(existing.map((row) => row.reservation_number))

    for (const row of rows) {
      existingReservationNumbers.has(row.reservationNumber) ? rowsUpdated++ : rowsNew++
    }
  }

  const { error } = await supabase.from('daily_rate_snapshots').upsert(
    rows.map((row) => ({
      reservation_number: row.reservationNumber,
      snapshot_date: row.snapshotDate,
      room_rate: row.roomRate,
      room_revenue: row.roomRevenue,
    })),
    { onConflict: 'reservation_number,snapshot_date' }
  )
  if (error) throw error

  const { error: updateUploadError } = await supabase
    .from('csv_uploads')
    .update({ rows_new: rowsNew, rows_updated: rowsUpdated })
    .eq('id', upload.id)
  if (updateUploadError) throw updateUploadError

  return { rowsProcessed: rows.length, rowsNew, rowsUpdated }
}
