'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAction } from '@/lib/supabase/require-staff'

export async function submitReconciliation(reservationNumber: string, amount: number) {
  const { userId } = await requireStaffAction()
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('manual_reconciliations')
    .upsert(
      { reservation_number: reservationNumber, amount, entered_by: userId, entered_at: new Date().toISOString() },
      { onConflict: 'reservation_number' }
    )
  if (error) throw error
}
