import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommissionRule } from '@/lib/calculations/commission'

export async function getCommissionRules(supabase: SupabaseClient): Promise<CommissionRule[]> {
  const { data, error } = await supabase
    .from('commission_rules')
    .select('source, villa_group, commission_pct')
  if (error) throw error
  return data.map((r) => ({
    source: r.source,
    villaGroup: r.villa_group as 'bracha' | 'default',
    commissionPct: r.commission_pct,
  }))
}
