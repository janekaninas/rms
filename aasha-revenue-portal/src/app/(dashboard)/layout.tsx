import { createServerSupabaseClient, getRole } from '@/lib/supabase/server'
import { RoleProvider } from '@/components/role-context'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const role = getRole(user)

  return <RoleProvider role={role}>{children}</RoleProvider>
}
