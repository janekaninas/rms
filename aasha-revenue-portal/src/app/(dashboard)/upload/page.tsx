import { createServerSupabaseClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard-shell'
import { UploadForm } from './upload-form'

export default async function UploadPage() {
  const supabase = await createServerSupabaseClient()
  const { data: recentUploads } = await supabase
    .from('csv_uploads')
    .select('upload_type, file_name, uploaded_at, rows_processed, rows_new, rows_updated, confirmed_empty')
    .order('uploaded_at', { ascending: false })
    .limit(10)

  return (
    <DashboardShell title="Daily Upload">
      <div className="mx-auto max-w-3xl">
        <UploadForm />
        <section className="mt-10">
          <h2 className="mb-2 text-sm font-medium text-[var(--color-text-muted)]">
            Recent uploads
          </h2>
          <ul className="divide-y divide-[var(--color-border)] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            {recentUploads?.map((u, i) => (
              <li key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                <span>
                  {u.upload_type}
                  {u.file_name ? `: ${u.file_name}` : ''}
                </span>
                {u.confirmed_empty ? (
                  <span className="rounded-full bg-[var(--color-border)] px-2 py-0.5 text-xs font-medium text-[var(--color-text-muted)]">
                    No data today
                  </span>
                ) : (
                  <span
                    className="text-xs text-[var(--color-text-muted)]"
                    style={{ fontFamily: 'var(--font-mono)' }}
                  >
                    {u.rows_new} new, {u.rows_updated} updated
                  </span>
                )}
              </li>
            ))}
            {recentUploads?.length === 0 && (
              <li className="px-4 py-3 text-sm text-[var(--color-text-muted)]">
                No uploads yet.
              </li>
            )}
          </ul>
        </section>
      </div>
    </DashboardShell>
  )
}
