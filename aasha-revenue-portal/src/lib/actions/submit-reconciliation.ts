'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function submitReconciliation(reservationNumber: string, amount: number, enteredBy: string) {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('manual_reconciliations')
    .upsert(
      { reservation_number: reservationNumber, amount, entered_by: enteredBy, entered_at: new Date().toISOString() },
      { onConflict: 'reservation_number' }
    )
  if (error) throw error
}
