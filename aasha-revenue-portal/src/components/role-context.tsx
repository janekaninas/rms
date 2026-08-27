'use client'

import { createContext, useContext } from 'react'
import type { UserRole } from '@/lib/supabase/server'

// `undefined` means "no RoleProvider above this component" -- distinct from `null`, which means
// "a RoleProvider is present, but the session has no role" (e.g. logged out). Using `undefined`
// as the "missing provider" sentinel (rather than defaulting to null) lets useRole() tell the two
// cases apart and fail loudly instead of a future out-of-tree page silently rendering as if
// logged out.
const RoleContext = createContext<UserRole | null | undefined>(undefined)

export function RoleProvider({
  role,
  children,
}: {
  role: UserRole | null
  children: React.ReactNode
}) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

/** The current session's role, fetched once in the dashboard layout. Null if unauthenticated. */
export function useRole(): UserRole | null {
  const role = useContext(RoleContext)
  if (role === undefined) {
    throw new Error('useRole must be used within a RoleProvider')
  }
  return role
}
