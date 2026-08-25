import { describe, it, expect } from 'vitest'
import { calculateRevenue, calculatePropertyArr, calculateLeadTimeDays } from '../engine'

describe('calculateRevenue', () => {
  it('applies 0% commission and full PB1 for a non-Bracha direct/TA booking', () => {
    // Confirmed fixture: Reservation 3137, Casa de Fiero 2, Make My Trip, gross 1,191,465
    const result = calculateRevenue({
      grossAmount: 1191465,
      source: 'MAKE MY TRIP',
      isBrachaGroup: false,
      pb1Enabled: true,
      nights: 1,
    })
    expect(result.commissionPct).toBe(0)
    expect(result.commissionAmount).toBe(0)
    expect(result.vat).toBe(0)
    expect(result.pb1).toBeCloseTo(108315, 2)
    expect(result.netRevenue).toBeCloseTo(1083150, 2)
    expect(result.arr).toBe(1191465)
  })

  it('applies Bracha-group Booking.com commission and excludes PB1', () => {
    const result = calculateRevenue({
      grossAmount: 2000000,
      source: 'BOOKING.COM',
      isBrachaGroup: true,
      pb1Enabled: true,
      nights: 2,
    })
    expect(result.commissionPct).toBe(0.18)
    expect(result.commissionAmount).toBe(360000)
    expect(result.vat).toBeCloseTo(39600, 2)
    expect(result.pb1).toBe(0)
    expect(result.netRevenue).toBeCloseTo(1600400, 2)
    expect(result.arr).toBe(1000000)
  })

  it('applies non-Bracha Booking.com commission (17.3%) with PB1', () => {
    const result = calculateRevenue({
      grossAmount: 1000000,
      source: 'BOOKING.COM',
      isBrachaGroup: false,
      pb1Enabled: true,
      nights: 1,
    })
    expect(result.commissionPct).toBe(0.173)
    expect(result.commissionAmount).toBe(173000)
    expect(result.vat).toBeCloseTo(19030, 2)
    expect(result.pb1).toBeCloseTo(90909.09, 2)
    expect(result.netRevenue).toBeCloseTo(717060.91, 2)
  })

  it('skips PB1 when pb1Enabled is false (Balinest default today)', () => {
    const result = calculateRevenue({
      grossAmount: 1000000,
      source: 'AIRBNB',
      isBrachaGroup: false,
      pb1Enabled: false,
      nights: 1,
    })
    expect(result.pb1).toBe(0)
    expect(result.netRevenue).toBe(1000000)
  })

  it('falls back to 0% commission for an unrecognized source', () => {
    const result = calculateRevenue({
      grossAmount: 500000,
      source: 'AGODA',
      isBrachaGroup: false,
      pb1Enabled: true,
      nights: 1,
    })
    expect(result.commissionPct).toBe(0)
  })
})

describe('calculatePropertyArr', () => {
  it('divides total revenue by total room nights across reservations', () => {
    const arr = calculatePropertyArr([
      { grossAmount: 1000000, nights: 2 },
      { grossAmount: 1500000, nights: 3 },
    ])
    expect(arr).toBe(500000) // (1,000,000 + 1,500,000) / (2 + 3)
  })

  it('returns 0 for no reservations', () => {
    expect(calculatePropertyArr([])).toBe(0)
  })
})

describe('calculateLeadTimeDays', () => {
  it('returns days between booking date and arrival date', () => {
    expect(calculateLeadTimeDays('2026-08-01', '2026-08-23')).toBe(22)
  })

  it('returns 0 for a same-day booking', () => {
    expect(calculateLeadTimeDays('2026-08-23', '2026-08-23')).toBe(0)
  })
})
