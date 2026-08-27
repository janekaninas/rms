import { createServerSupabaseClient, getRole } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { UploadForm } from './upload-form'

export default async function UploadPage() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const role = getRole(user)
  const { data: recentUploads } = await supabase
    .from('csv_uploads')
    .select('upload_type, file_name, uploaded_at, rows_processed, rows_new, rows_updated, confirmed_empty')
    .order('uploaded_at', { ascending: false })
    .limit(10)

  return (
    <DashboardShell title="Daily Upload" role={role}>
      <div className="mx-auto max-w-3xl">
        <UploadForm />
        <section className="mt-10">
          <h2 className="mb-2 text-sm font-medium text-text-muted">
            Recent uploads
          </h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-surface">
            {recentUploads?.map((u, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  {u.upload_type}
                  {u.file_name ? `: ${u.file_name}` : ''}
                </span>
                {u.confirmed_empty ? (
                  <span className="rounded-full bg-border px-2 py-0.5 text-xs font-medium text-text-muted">
                    No data today
                  </span>
                ) : (
                  <span className="font-mono text-xs text-text-muted">
                    {u.rows_new} new, {u.rows_updated} updated
                  </span>
                )}
              </li>
            ))}
            {recentUploads?.length === 0 && (
              <li className="px-4 py-3 text-sm text-text-muted">
                No uploads yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </DashboardShell>
  )
}
