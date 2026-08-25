import { createServerSupabaseClient } from '@/lib/supabase/server'
import { UploadForm } from './upload-form'

export default async function UploadPage() {
  const supabase = await createServerSupabaseClient()
  const { data: recentUploads } = await supabase
    .from('csv_uploads')
    .select('upload_type, file_name, uploaded_at, rows_processed, rows_new, rows_updated')
    .order('uploaded_at', { ascending: false })
    .limit(10)

  return (
    <main className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-xl font-semibold">Daily Upload</h1>
      <UploadForm />
      <section className="mt-10">
        <h2 className="mb-2 text-sm font-medium text-gray-500">Recent uploads</h2>
        <ul className="divide-y rounded border">
          {recentUploads?.map((u, i) => (
            <li key={i} className="flex justify-between px-3 py-2 text-sm">
              <span>{u.upload_type}: {u.file_name}</span>
              <span className="text-gray-500">{u.rows_new} new, {u.rows_updated} updated</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
