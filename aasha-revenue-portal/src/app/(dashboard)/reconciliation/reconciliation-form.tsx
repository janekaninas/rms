'use client'

import { useState } from 'react'
import { submitReconciliation } from '@/lib/actions/submit-reconciliation'
import { validateReconciliationAmount } from '@/lib/reconciliation/validate-amount'

export function ReconciliationForm({
  reservationNumber,
  rawGrossAmount,
}: {
  reservationNumber: string
  rawGrossAmount: number
}) {
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = validateReconciliationAmount(amount)
    if (!result.valid) {
      setStatus(`Error: ${result.error}`)
      return
    }

    setStatus('Saving...')
    try {
      await submitReconciliation(reservationNumber, result.amount)
      setStatus('Saved')
    } catch (err) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <p className="text-xs text-text-muted">
        VHP shows: <span className="font-mono">{rawGrossAmount.toLocaleString()}</span> — enter the confirmed amount
      </p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Confirmed amount"
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
      </div>
    </form>
  )
}
