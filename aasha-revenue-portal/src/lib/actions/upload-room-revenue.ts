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
    .update({ rows_new: rows.length })
    .eq('id', upload.id)
  if (updateUploadError) throw updateUploadError

  return { rowsProcessed: rows.length }
}
