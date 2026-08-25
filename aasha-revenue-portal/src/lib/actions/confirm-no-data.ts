'use server'

import { createAdminClient } from '@/lib/supabase/admin'

type ConfirmableUploadType = 'bookings' | 'cancel' | 'room_revenue' | 'room_change_log'

export function buildConfirmNoDataRow(uploadType: ConfirmableUploadType, uploadedBy: string) {
  return {
    upload_type: uploadType,
    file_name: null,
    uploaded_by: uploadedBy,
    rows_processed: 0,
    rows_new: 0,
    rows_updated: 0,
    confirmed_empty: true,
  }
}

export async function confirmNoData(uploadType: ConfirmableUploadType, uploadedBy: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('csv_uploads')
    .insert(buildConfirmNoDataRow(uploadType, uploadedBy))
  if (error) throw error
}
