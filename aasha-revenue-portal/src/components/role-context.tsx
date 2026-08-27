'use client'

import { createContext, useContext } from 'react'
import type { UserRole } from '@/lib/supabase/server'

const RoleContext = createContext<UserRole | null>(null)

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
  return useContext(RoleContext)
}
