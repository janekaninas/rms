'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { buildConfirmNoDataRow, type ConfirmableUploadType } from './confirm-no-data-row'

export async function confirmNoData(uploadType: ConfirmableUploadType, uploadedBy: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('csv_uploads')
    .insert(buildConfirmNoDataRow(uploadType, uploadedBy))
  if (error) throw error
}
