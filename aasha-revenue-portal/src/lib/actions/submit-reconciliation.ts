'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireStaffAction } from '@/lib/supabase/require-staff'
import { validateReconciliationAmount } from './validate-amount'

export async function submitReconciliation(reservationNumber: string, amount: number) {
  const { userId } = await requireStaffAction()

  // Re-validate server-side -- the client form validates too, but a caller that hits this
  // Server Action directly (bypassing the form) must not be able to smuggle in a negative or
  // malformed amount just because the client-side check was skipped.
  const validation = validateReconciliationAmount(String(amount))
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('manual_reconciliations').upsert(
    {
      reservation_number: reservationNumber,
      amount: validation.amount,
      entered_by: userId,
      entered_at: new Date().toISOString(),
    },
    { onConflict: 'reservation_number' }
  )
  if (error) throw error
}
