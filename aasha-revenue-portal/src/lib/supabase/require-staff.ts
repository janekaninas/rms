import { redirect } from 'next/navigation'
import { createServerSupabaseClient, getRole } from './server'

/**
 * Server-side authorization guard for Server Actions that must be staff-only. Derives identity
 * from the session cookie (never trust a client-supplied user id) and throws if the caller isn't
 * an authenticated staff user. Callers should let this error propagate -- the client form's
 * existing error handling surfaces it.
 */
export async function requireStaffAction(): Promise<{ userId: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const role = getRole(user)
  if (!user || role !== 'staff') {
    throw new Error('Forbidden: staff access required')
  }
  return { userId: user.id }
}

/**
 * Server-side authorization guard for staff-only Server Component pages. Same identity check as
 * requireStaffAction, but redirects instead of throwing -- a Server Component can't throw-and-
 * recover the way a Server Action's caller can, so a non-staff session is sent to /upload before
 * any data fetch happens.
 */
export async function requireStaffPage(): Promise<{ userId: string }> {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const role = getRole(user)
  if (!user || role !== 'staff') {
    redirect('/upload')
  }
  return { userId: user.id }
}
