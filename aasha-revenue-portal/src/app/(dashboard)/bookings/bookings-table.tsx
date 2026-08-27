import type { ReservationWithRevenue } from '@/lib/reporting/get-reservations-with-revenue'

function formatIdr(amount: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(amount)
}

export function BookingsTable({ reservations }: { reservations: ReservationWithRevenue[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border text-text-muted">
          <tr>
            <th className="px-3 py-2 font-medium">Guest</th>
            <th className="px-3 py-2 font-medium">Villa</th>
            <th className="px-3 py-2 font-medium">Arrival</th>
            <th className="px-3 py-2 font-medium">Nights</th>
            <th className="px-3 py-2 font-medium">Source</th>
            <th className="px-3 py-2 text-right font-medium">Gross</th>
            <th className="px-3 py-2 text-right font-medium">Net</th>
            <th className="px-3 py-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="font-mono">
          {reservations.map((r) => (
            <tr key={r.reservationNumber} className="border-b border-border last:border-0">
              <td className="px-3 py-2 font-sans">{r.guestName}</td>
              <td className="px-3 py-2 font-sans">{r.propertyName ?? '—'}</td>
              <td className="px-3 py-2">{r.arrivalDate}</td>
              <td className="px-3 py-2">{r.nights}</td>
              <td className="px-3 py-2 font-sans">{r.source}</td>
              <td className="px-3 py-2 text-right">{formatIdr(r.effectiveGrossAmount)}</td>
              <td className="px-3 py-2 text-right">{formatIdr(r.netRevenue)}</td>
              <td className="px-3 py-2 font-sans">
                {r.needsReconciliation ? (
                  <span className="rounded-full bg-border px-2 py-0.5 text-xs text-text-muted">Pending</span>
                ) : (
                  <span className="capitalize">{r.status}</span>
                )}
              </td>
            </tr>
          ))}
          {reservations.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-6 text-center font-sans text-text-muted">
                No reservations match these filters.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
