export interface CommissionRule {
  source: string
  villaGroup: 'bracha' | 'default'
  commissionPct: number
}

export function lookupCommissionPct(
  rules: CommissionRule[],
  source: string,
  isBrachaGroup: boolean
): number {
  const villaGroup = isBrachaGroup ? 'bracha' : 'default'
  const normalizedSource = source.trim().toUpperCase()
  const rule = rules.find((r) => r.source === normalizedSource && r.villaGroup === villaGroup)
  return rule?.commissionPct ?? 0
}
