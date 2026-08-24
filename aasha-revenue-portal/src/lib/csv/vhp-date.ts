/** VHP exports dates as DD/MM/YY. Returns an ISO date string (YYYY-MM-DD). */
export function parseVhpDate(raw: string): string {
  const [day, month, year] = raw.trim().split('/').map(Number)
  const fullYear = year < 100 ? 2000 + year : year
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${fullYear}-${mm}-${dd}`
}

/** VHP exports amounts as "1,191,465.00" strings. Returns a plain number, 0 for blank/"-" . */
export function parseVhpNumber(raw: string): number {
  const trimmed = raw.trim()
  if (trimmed === '' || trimmed === '-') return 0
  return Number(trimmed.replace(/,/g, ''))
}
