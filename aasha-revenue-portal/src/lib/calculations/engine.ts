import { lookupCommissionPct, type CommissionRule } from './commission'

export interface RevenueInput {
  grossAmount: number
  source: string
  isBrachaGroup: boolean
  pb1Enabled: boolean
  nights: number
  commissionRules: CommissionRule[]
}

export interface RevenueResult {
  commissionPct: number
  commissionAmount: number
  vat: number
  pb1: number
  netRevenue: number
  arr: number
}

const VAT_RATE = 0.11
const PB1_DIVISOR = 1.1
const PB1_RATE = 0.1

export function calculateRevenue(input: RevenueInput): RevenueResult {
  const commissionPct = lookupCommissionPct(input.commissionRules, input.source, input.isBrachaGroup)
  const commissionAmount = round2(input.grossAmount * commissionPct)
  const vat = commissionAmount > 0 ? round2(commissionAmount * VAT_RATE) : 0

  // PB1 (Bali tourism tax) is waived entirely for the three Bracha villas, and is
  // separately gated by the pb1Enabled flag (currently off for the Balinest portfolio
  // pending a finalized arrangement). Both conditions must hold for PB1 to apply.
  const pb1 =
    input.pb1Enabled && !input.isBrachaGroup
      ? round2((input.grossAmount / PB1_DIVISOR) * PB1_RATE)
      : 0

  const netRevenue = round2(input.grossAmount - commissionAmount - vat - pb1)
  const arr = input.nights > 0 ? round2(input.grossAmount / input.nights) : 0

  return { commissionPct, commissionAmount, vat, pb1, netRevenue, arr }
}

export function calculatePropertyArr(
  reservations: Array<{ grossAmount: number; nights: number }>
): number {
  const totalRevenue = reservations.reduce((sum, r) => sum + r.grossAmount, 0)
  const totalNights = reservations.reduce((sum, r) => sum + r.nights, 0)
  return totalNights > 0 ? round2(totalRevenue / totalNights) : 0
}

export function calculateLeadTimeDays(bookingDate: string, arrivalDate: string): number {
  const booking = new Date(bookingDate)
  const arrival = new Date(arrivalDate)
  const diffMs = arrival.getTime() - booking.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}
