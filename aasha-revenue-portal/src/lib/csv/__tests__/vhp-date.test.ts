import { describe, it, expect } from 'vitest'
import { parseVhpDate, parseVhpNumber } from '../vhp-date'

describe('parseVhpDate', () => {
  it('parses DD/MM/YY into an ISO date string', () => {
    expect(parseVhpDate('23/08/26')).toBe('2026-08-23')
  })

  it('parses single-digit day/month', () => {
    expect(parseVhpDate('4/9/26')).toBe('2026-09-04')
  })
})

describe('parseVhpNumber', () => {
  it('parses comma-thousands numbers into a JS number', () => {
    expect(parseVhpNumber('1,191,465.00')).toBe(1191465)
  })

  it('treats a blank string as 0', () => {
    expect(parseVhpNumber('')).toBe(0)
    expect(parseVhpNumber('-')).toBe(0)
  })
})
