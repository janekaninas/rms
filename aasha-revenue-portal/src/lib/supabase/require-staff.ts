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
