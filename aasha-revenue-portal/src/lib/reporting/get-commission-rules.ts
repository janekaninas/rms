import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommissionRule } from '@/lib/calculations/commission'

const VALID_VILLA_GROUPS = new Set(['bracha', 'default'])

export async function getCommissionRules(supabase: SupabaseClient): Promise<CommissionRule[]> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('source, villa_group, commission_pct')
  if (error) throw error

  // villa_group has no DB CHECK constraint and this repo has no generated Supabase types, so
  // the cast below is compile-time-only. A stray value here (typo, case variant, future group)
  // would make lookupCommissionPct() silently never match and commissionPct default to 0 --
  // commission would silently drop out of netRevenue with no error or visible flag. For a
  // revenue tool, wrong-but-silent is worse than crashing, so fail loudly instead.
  for (const r of data) {
    if (!VALID_VILLA_GROUPS.has(r.villa_group)) {
      throw new Error(
        `commission_rules row has invalid villa_group "${r.villa_group}" for source "${r.source}" -- expected "bracha" or "default"`
      )
    }
  }

  return data.map((r) => ({
    source: r.source,
    villaGroup: r.villa_group as 'bracha' | 'default',
    commissionPct: r.commission_pct,
  }))
}
