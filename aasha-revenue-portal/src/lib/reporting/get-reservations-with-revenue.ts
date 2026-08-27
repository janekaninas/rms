import type { SupabaseClient } from '@supabase/supabase-js'
import { calculateRevenue, calculateLeadTimeDays } from '@/lib/calculations/engine'
import type { CommissionRule } from '@/lib/calculations/commission'
import { needsReconciliation, resolveEffectiveAmount } from './resolve-effective-amount'
import { getCommissionRules } from './get-commission-rules'

export interface ReservationRevenueInput {
  reservationNumber: string
  propertyName: string | null
  isBrachaGroup: boolean
  pb1Enabled: boolean
  guestName: string
  source: string
  segment: string | null
  bookingDate: string | null
  arrivalDate: string
  departureDate: string
  nights: number
  rawGrossAmount: number
  manualAmount: number | null
  status: 'confirmed' | 'cancelled' | 'departed'
  commissionRules: CommissionRule[]
}

export interface ReservationWithRevenue {
  reservationNumber: string
  propertyName: string | null
  guestName: string
  source: string
  segment: string | null
  arrivalDate: string
  departureDate: string
  nights: number
  status: 'confirmed' | 'cancelled' | 'departed'
  needsReconciliation: boolean
  rawGrossAmount: number
  effectiveGrossAmount: number
  commissionPct: number
  commissionAmount: number
  vat: number
  pb1: number
  netRevenue: number
  arr: number
  leadTimeDays: number | null
}

export function computeReservationRevenue(input: ReservationRevenueInput): ReservationWithRevenue {
  // NOTE: reservations.segment is a nullable DB column. needsReconciliation() requires a
  // non-null string -- treat a null/missing segment the same as any other non-OTA value (needs
  // reconciliation), which matches the codebase's established "over-flag rather than
  // under-flag" pattern for ambiguous revenue data.
  const effectiveGrossAmount = resolveEffectiveAmount({
    rawGrossAmount: input.rawGrossAmount,
    manualAmount: input.manualAmount,
  })

  const revenue = calculateRevenue({
    grossAmount: effectiveGrossAmount,
    source: input.source,
    isBrachaGroup: input.isBrachaGroup,
    pb1Enabled: input.pb1Enabled,
    nights: input.nights,
    commissionRules: input.commissionRules,
  })

  return {
    reservationNumber: input.reservationNumber,
    propertyName: input.propertyName,
    guestName: input.guestName,
    source: input.source,
    segment: input.segment,
    arrivalDate: input.arrivalDate,
    departureDate: input.departureDate,
    nights: input.nights,
    status: input.status,
    needsReconciliation: needsReconciliation({
      segment: input.segment ?? '',
      manualAmount: input.manualAmount,
    }),
    rawGrossAmount: input.rawGrossAmount,
    effectiveGrossAmount,
    commissionPct: revenue.commissionPct,
    commissionAmount: revenue.commissionAmount,
    vat: revenue.vat,
    pb1: revenue.pb1,
    netRevenue: revenue.netRevenue,
    arr: revenue.arr,
    leadTimeDays: input.bookingDate ? calculateLeadTimeDays(input.bookingDate, input.arrivalDate) : null,
  }
}

export interface ReservationFilters {
  /** Filters on arrival_date (not booking_date). Inclusive lower bound. */
  dateFrom?: string
  /** Filters on arrival_date (not booking_date). Inclusive upper bound. */
  dateTo?: string
  propertyId?: string
  status?: 'confirmed' | 'cancelled' | 'departed'
}

export async function getReservationsWithRevenue(
  supabase: SupabaseClient,
  filters: ReservationFilters = {}
): Promise<ReservationWithRevenue[]> {
  let query = supabase
    .from('reservations')
    .select(
      'reservation_number, guest_name, source, segment, booking_date, arrival_date, departure_date, nights, gross_amount, status, properties(name, is_bracha_group, pb1_enabled)'
    )
  if (filters.dateFrom) query = query.gte('arrival_date', filters.dateFrom)
  if (filters.dateTo) query = query.lte('arrival_date', filters.dateTo)
  if (filters.propertyId) query = query.eq('property_id', filters.propertyId)
  if (filters.status) query = query.eq('status', filters.status)

  const { data: reservations, error } = await query
  if (error) throw error

  const { data: reconciliations, error: reconciliationsError } = await supabase
    .from('manual_reconciliations')
    .select('reservation_number, amount')
  if (reconciliationsError) throw reconciliationsError
  const manualAmountByReservation = new Map(reconciliations.map((r) => [r.reservation_number, r.amount]))

  const commissionRules = await getCommissionRules(supabase)

  return reservations.map((r) => {
    const property = Array.isArray(r.properties) ? r.properties[0] : r.properties
    return computeReservationRevenue({
      reservationNumber: r.reservation_number,
      propertyName: property?.name ?? null,
      isBrachaGroup: property?.is_bracha_group ?? false,
      pb1Enabled: property?.pb1_enabled ?? true,
      guestName: r.guest_name,
      source: r.source,
      segment: r.segment,
      bookingDate: r.booking_date,
      arrivalDate: r.arrival_date,
      departureDate: r.departure_date,
      nights: r.nights,
      rawGrossAmount: r.gross_amount,
      manualAmount: manualAmountByReservation.get(r.reservation_number) ?? null,
      status: r.status,
      commissionRules,
    })
  })
}
