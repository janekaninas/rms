'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { parseCancelCsv } from '@/lib/csv/parse-cancel'

export async function uploadCancelCsv(fileName: string, csvText: string, uploadedBy: string) {
  const rows = parseCancelCsv(csvText)
  const supabase = createAdminClient()

  const { data: upload, error: uploadError } = await supabase
    .from('csv_uploads')
    .insert({ upload_type: 'cancel', file_name: fileName, uploaded_by: uploadedBy, rows_processed: rows.length })
    .select()
    .single()
  if (uploadError) throw uploadError

  let rowsUpdated = 0
  for (const row of rows) {
    const { data, error } = await supabase
      .from('reservations')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('reservation_number', row.reservationNumber)
      .select('id')
    if (error) throw error
    if (data && data.length > 0) rowsUpdated++
  }

  const { error: updateUploadError } = await supabase
    .from('csv_uploads')
    .update({ rows_updated: rowsUpdated })
    .eq('id', upload.id)
  if (updateUploadError) throw updateUploadError

  return { rowsProcessed: rows.length, rowsUpdated }
}
