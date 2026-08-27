import { getSessionUser, getRole } from '@/lib/supabase/server'
import { RoleProvider } from '@/components/role-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  const role = getRole(user)

  return <RoleProvider role={role}>{children}</RoleProvider>
}
