export interface CommissionRule {
  source: string
  villaGroup: 'bracha' | 'default'
  commissionPct: number
}

const RULES: CommissionRule[] = [
  { source: 'BOOKING.COM', villaGroup: 'bracha', commissionPct: 0.18 },
  { source: 'BOOKING.COM', villaGroup: 'default', commissionPct: 0.173 },
  { source: 'EXPEDIA.COM', villaGroup: 'bracha', commissionPct: 0.15 },
  { source: 'EXPEDIA.COM', villaGroup: 'default', commissionPct: 0.15 },
]

/** Mirrors the seeded `commission_rules` table (Task 3). Kept in sync manually for now;
 *  Task 3's seed.sql is the source of truth for the database. */
export function lookupCommissionPct(source: string, isBrachaGroup: boolean): number {
  const villaGroup = isBrachaGroup ? 'bracha' : 'default'
  const normalizedSource = source.trim().toUpperCase()
  const rule = RULES.find((r) => r.source === normalizedSource && r.villaGroup === villaGroup)
  return rule?.commissionPct ?? 0
}
