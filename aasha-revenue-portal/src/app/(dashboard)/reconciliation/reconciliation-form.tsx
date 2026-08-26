'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { submitReconciliation } from '@/lib/actions/submit-reconciliation'

export function ReconciliationForm({
  reservationNumber,
  currentAmount,
}: {
  reservationNumber: string
  currentAmount: number
}) {
  const [amount, setAmount] = useState(String(currentAmount))
  const [status, setStatus] = useState<string | null>(null)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('Saving...')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setStatus('Error: not logged in')
      return
    }
    try {
      await submitReconciliation(reservationNumber, Number(amount), user.id)
      setStatus('Saved')
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-40 rounded border border-border px-2 py-1 font-mono text-sm"
        step="0.01"
      />
      <button type="submit" className="rounded bg-accent px-3 py-1 text-sm text-white">
        Confirm amount
      </button>
      {status && (
        <span className={`text-xs ${status.startsWith('Error') ? 'text-danger' : 'text-text-muted'}`}>
          {status}
        </span>
      )}
    </form>
  )
}
