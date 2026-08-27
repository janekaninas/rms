import { redirect } from 'next/navigation'
import { getSessionUser, getRole } from './server'

/**
 * Shared identity check for the staff-only guards below. Not exported -- requireStaffAction and
 * requireStaffPage each own their own failure behavior (throw vs redirect), but both derive the
 * same role decision the same way, so that logic lives in exactly one place.
 */
async function resolveStaffUser(): Promise<{ userId: string } | null> {
  const user = await getSessionUser()
  const role = getRole(user)
  if (!user || role !== 'staff') {
    return null
  }
  return { userId: user.id }
}

/**
 * Server-side authorization guard for Server Actions that must be staff-only. Derives identity
 * from the session cookie (never trust a client-supplied user id) and throws if the caller isn't
 * an authenticated staff user. Callers should let this error propagate -- the client form's
 * existing error handling surfaces it.
 */
export async function requireStaffAction(): Promise<{ userId: string }> {
  const staff = await resolveStaffUser()
  if (!staff) {
    throw new Error('Forbidden: staff access required')
  }
  return staff
}

/**
 * Server-side authorization guard for staff-only Server Component pages. Same identity check as
 * requireStaffAction, but redirects instead of throwing -- a Server Component can't throw-and-
 * recover the way a Server Action's caller can, so a non-staff session is sent to /upload before
 * any data fetch happens.
 */
export async function requireStaffPage(): Promise<{ userId: string }> {
  const staff = await resolveStaffUser()
  if (!staff) {
    // Signals navigation by throwing a digest-tagged error ("NEXT_REDIRECT;...") rather than
    // returning. If this breaks on a future Next upgrade, check redirect()'s digest format.
    redirect('/upload')
  }
  return staff
}
