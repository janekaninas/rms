import { describe, it, expect } from 'vitest'
import { getRole } from '../server'

describe('getRole', () => {
  it('returns the role when valid', () => {
    expect(getRole({ app_metadata: { role: 'staff' } })).toBe('staff')
    expect(getRole({ app_metadata: { role: 'front_office' } })).toBe('front_office')
  })

  it('returns null for missing or invalid roles', () => {
    expect(getRole(null)).toBeNull()
    expect(getRole({ app_metadata: {} })).toBeNull()
    expect(getRole({ app_metadata: { role: 'owner' } })).toBeNull()
  })
})
