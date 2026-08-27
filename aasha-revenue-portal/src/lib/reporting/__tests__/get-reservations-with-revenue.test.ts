import { describe, it, expect } from 'vitest'
import { computeReservationRevenue } from '../get-reservations-with-revenue'

const RULES = [{ source: 'BOOKING.COM', villaGroup: 'default' as const, commissionPct: 0.173 }]

describe('computeReservationRevenue', () => {
  it('computes full revenue figures for a reconciled non-OTA reservation', () => {
    const row = computeReservationRevenue({
      reservationNumber: '3134',
      propertyName: 'Bracha 1BD',
      isBrachaGroup: true,
      pb1Enabled: true,
      guestName: 'Zlad, Binhomoud MR',
      source: 'RASYID , T&T',
      segment: 'OFF-TA',
      bookingDate: '2026-08-23',
      arrivalDate: '2026-08-23',
      departureDate: '2026-08-24',
      nights: 1,
      rawGrossAmount: 500000,
      manualAmount: null,
      status: 'confirmed',
      commissionRules: RULES,
    })

    expect(row.needsReconciliation).toBe(true)
    expect(row.effectiveGrossAmount).toBe(500000)
    expect(row.commissionAmount).toBe(0)
    expect(row.pb1).toBe(0) // Bracha exclusion
    expect(row.netRevenue).toBe(500000)
    expect(row.leadTimeDays).toBe(0)
  })

  it('uses the reconciled amount and marks needsReconciliation false once resolved', () => {
    const row = computeReservationRevenue({
      reservationNumber: '9999',
      propertyName: 'Casa de Fiero 2',
      isBrachaGroup: false,
      pb1Enabled: true,
      guestName: 'Test Guest',
      source: 'DIRECT BOOKING',
      segment: 'OFF-TA',
      bookingDate: '2026-08-01',
      arrivalDate: '2026-08-10',
      departureDate: '2026-08-11',
      nights: 1,
      rawGrossAmount: 500000,
      manualAmount: 1500000,
      status: 'confirmed',
      commissionRules: RULES,
    })

    expect(row.needsReconciliation).toBe(false)
    expect(row.effectiveGrossAmount).toBe(1500000)
    expect(row.leadTimeDays).toBe(9)
  })

  it('treats a null segment as needing reconciliation rather than throwing', () => {
    const row = computeReservationRevenue({
      reservationNumber: '8888',
      propertyName: 'Villa Riso',
      isBrachaGroup: false,
      pb1Enabled: true,
      guestName: 'No Segment Guest',
      source: 'UNKNOWN',
      segment: null,
      bookingDate: null,
      arrivalDate: '2026-08-15',
      departureDate: '2026-08-16',
      nights: 1,
      rawGrossAmount: 200000,
      manualAmount: null,
      status: 'confirmed',
      commissionRules: RULES,
    })

    expect(row.needsReconciliation).toBe(true)
    expect(row.leadTimeDays).toBeNull()
  })
})
