export function needsReconciliation(input: { segment: string; manualAmount: number | null }): boolean {
  return input.segment.trim().toUpperCase() !== 'OTA' && input.manualAmount === null
}

export function resolveEffectiveAmount(input: { rawGrossAmount: number; manualAmount: number | null }): number {
  return input.manualAmount ?? input.rawGrossAmount
}
