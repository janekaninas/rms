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

export type UserRole = 'staff' | 'front_office'

export function getRole(user: Pick<AuthUser, 'app_metadata'> | null): UserRole | null {
  const role = user?.app_metadata?.role
  return role === 'staff' || role === 'front_office' ? role : null
}
