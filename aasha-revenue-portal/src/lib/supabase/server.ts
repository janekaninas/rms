import { cache } from 'react'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { AuthUser } from '@supabase/supabase-js'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

/**
 * The current session's user, straight from Supabase Auth (revalidated against the Auth server,
 * not just decoded from the cookie). Wrapped in React's cache() so the dashboard layout and any
 * per-page staff guard that both need it within the same request share one Auth-server round
 * trip instead of paying for it twice. Each caller still derives its own role/authorization
 * decision independently via getRole() -- only this underlying fetch is de-duplicated.
 */
export const getSessionUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export type UserRole = 'staff' | 'front_office'

export function getRole(user: Pick<AuthUser, 'app_metadata'> | null): UserRole | null {
  const role = user?.app_metadata?.role
  return role === 'staff' || role === 'front_office' ? role : null
}
