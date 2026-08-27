export type AmountValidationResult =
  | { valid: true; amount: number }
  | { valid: false; error: string }

/**
 * Validates a reconciliation amount typed into the form. Zero is a valid, real reconciled
 * amount (e.g. a full refund) -- only empty input, non-numeric input, and negative numbers are
 * rejected.
 */
export function validateReconciliationAmount(raw: string): AmountValidationResult {
  const trimmed = raw.trim()
  if (trimmed === '') {
    return { valid: false, error: 'Enter an amount.' }
  }

  const amount = Number(trimmed)
  if (Number.isNaN(amount)) {
    return { valid: false, error: 'Enter a valid number.' }
  }
  if (amount < 0) {
    return { valid: false, error: 'Amount cannot be negative.' }
  }

  return { valid: true, amount }
}
