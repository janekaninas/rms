import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireStaffAction, requireStaffPage } from '../require-staff'

const mockGetUser = vi.fn()

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    getAll: () => [],
    set: () => {},
  })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}))

function userWithRole(role: string | undefined) {
  return { id: 'user-1', app_metadata: role === undefined ? {} : { role } }
}

describe('requireStaffAction', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
  })

  it('returns the session userId for an authenticated staff user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: userWithRole('staff') } })
    await expect(requireStaffAction()).resolves.toEqual({ userId: 'user-1' })
  })

  it('throws for an authenticated front_office user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: userWithRole('front_office') } })
    await expect(requireStaffAction()).rejects.toThrow('Forbidden: staff access required')
  })

  it('throws when there is no session user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(requireStaffAction()).rejects.toThrow('Forbidden: staff access required')
  })
})

describe('requireStaffPage', () => {
  beforeEach(() => {
    mockGetUser.mockReset()
  })

  it('returns the session userId for an authenticated staff user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: userWithRole('staff') } })
    await expect(requireStaffPage()).resolves.toEqual({ userId: 'user-1' })
  })

  // requireStaffPage calls Next's redirect(), which signals navigation by throwing a
  // digest-tagged error (rather than returning) -- that's how Server Components short-circuit
  // rendering. redirect() itself has no dependency on request-scoped storage for constructing
  // this error, so it throws the same way here as it would inside a real request. We assert on
  // that thrown error rather than mocking next/navigation, so the test exercises Next's real
  // redirect signal instead of a stand-in for it.
  it('redirects to /upload for an authenticated front_office user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: userWithRole('front_office') } })
    await expect(requireStaffPage()).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/upload;307;',
    })
  })

  it('redirects to /upload when there is no session user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await expect(requireStaffPage()).rejects.toMatchObject({
      digest: 'NEXT_REDIRECT;replace;/upload;307;',
    })
  })
})
