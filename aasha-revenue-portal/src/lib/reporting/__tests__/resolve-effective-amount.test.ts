import { describe, it, expect } from 'vitest'
import { resolveEffectiveAmount, needsReconciliation } from '../resolve-effective-amount'

describe('needsReconciliation', () => {
  it('is true for a non-OTA segment with no manual amount on file', () => {
    expect(needsReconciliation({ segment: 'OFF-TA', manualAmount: null })).toBe(true)
  })

  it('is false once a manual amount is on file', () => {
    expect(needsReconciliation({ segment: 'OFF-TA', manualAmount: 1500000 })).toBe(false)
  })

  it('is false for an OTA segment regardless of manual amount', () => {
    expect(needsReconciliation({ segment: 'OTA', manualAmount: null })).toBe(false)
  })
})

describe('resolveEffectiveAmount', () => {
  it('uses the manual amount when present', () => {
    expect(resolveEffectiveAmount({ rawGrossAmount: 500000, manualAmount: 1500000 })).toBe(1500000)
  })

  it('falls back to the raw VHP amount when no manual amount is on file', () => {
    expect(resolveEffectiveAmount({ rawGrossAmount: 500000, manualAmount: null })).toBe(500000)
  })
})
