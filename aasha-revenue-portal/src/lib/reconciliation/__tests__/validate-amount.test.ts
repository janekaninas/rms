import { describe, it, expect } from 'vitest'
import { validateReconciliationAmount } from '../validate-amount'

describe('validateReconciliationAmount', () => {
  it('accepts a positive amount', () => {
    expect(validateReconciliationAmount('525000')).toEqual({ valid: true, amount: 525000 })
  })

  it('accepts zero as a real reconciled amount (e.g. a full refund)', () => {
    expect(validateReconciliationAmount('0')).toEqual({ valid: true, amount: 0 })
  })

  it('trims surrounding whitespace', () => {
    expect(validateReconciliationAmount('  525000  ')).toEqual({ valid: true, amount: 525000 })
  })

  it('rejects empty input', () => {
    expect(validateReconciliationAmount('')).toEqual({ valid: false, error: 'Enter an amount.' })
  })

  it('rejects whitespace-only input', () => {
    expect(validateReconciliationAmount('   ')).toEqual({ valid: false, error: 'Enter an amount.' })
  })

  it('rejects non-numeric input', () => {
    expect(validateReconciliationAmount('abc')).toEqual({ valid: false, error: 'Enter a valid number.' })
  })

  it('rejects negative amounts', () => {
    expect(validateReconciliationAmount('-100')).toEqual({
      valid: false,
      error: 'Amount cannot be negative.',
    })
  })
})
