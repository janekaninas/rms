import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireStaffPage } from '@/lib/supabase/require-staff'
import { getReservationsWithRevenue } from '@/lib/reporting/get-reservations-with-revenue'
import { DashboardShell } from '@/components/dashboard-shell'
import { BookingsFilters } from './bookings-filters'
import { BookingsTable } from './bookings-table'

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; status?: string }>
}) {
  // Real access control -- redirects non-staff before any data is fetched. Separate from (and
  // not redundant with) the sidebar's role context, which only controls nav visibility.
  await requireStaffPage()
  const params = await searchParams
  const supabase = await createServerSupabaseClient()
  const reservations = await getReservationsWithRevenue(supabase, {
    dateFrom: params.dateFrom,
    dateTo: params.dateTo,
    status: params.status as 'confirmed' | 'cancelled' | 'departed' | undefined,
  })

  return (
    <DashboardShell title="All Bookings" actions={<BookingsFilters />}>
      <BookingsTable reservations={reservations} />
    </DashboardShell>
  )
}
