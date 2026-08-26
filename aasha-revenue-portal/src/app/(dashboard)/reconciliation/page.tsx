import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getReservationsWithRevenue } from '@/lib/reporting/get-reservations-with-revenue'
import { DashboardShell } from '@/components/dashboard-shell'
import { ReconciliationForm } from './reconciliation-form'

export default async function ReconciliationPage() {
  const supabase = await createServerSupabaseClient()
  const reservations = await getReservationsWithRevenue(supabase, { status: 'confirmed' })
  const pending = reservations.filter((r) => r.needsReconciliation)

  return (
    <DashboardShell title="Reconciliation Queue">
      <div className="mx-auto max-w-3xl">
        <p className="mb-4 text-sm text-text-muted">
          {pending.length} direct/travel-agent booking{pending.length === 1 ? '' : 's'} awaiting a confirmed amount.
        </p>
        <ul className="flex flex-col gap-3">
          {pending.map((r) => (
            <li key={r.reservationNumber} className="rounded-lg border border-border bg-surface p-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium">{r.guestName}</span>
                <span className="text-text-muted">{r.propertyName ?? 'Unmapped'} · {r.arrivalDate}</span>
              </div>
              <ReconciliationForm
                reservationNumber={r.reservationNumber}
                currentAmount={r.rawGrossAmount}
              />
            </li>
          ))}
          {pending.length === 0 && (
            <li className="rounded-lg border border-border bg-surface p-4 text-sm text-text-muted">
              Nothing pending.
            </li>
          )}
        </ul>
      </div>
    </DashboardShell>
  )
}
