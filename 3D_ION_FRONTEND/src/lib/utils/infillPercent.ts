/** Resolve infill % from API fields (prefer explicit infill_pct). */
export function coalesceInfillPercent(
  infill_percentage?: number | string | null,
  infill_pct?: number | string | null
): number | null {
  const primary = infill_pct ?? infill_percentage
  if (primary === null || primary === undefined || primary === '') return null
  const n = Number(primary)
  return Number.isFinite(n) ? n : null
}

/**
 * Chart/display normalization: only values strictly between 0 and 1 are treated as
 * fractional ratios (e.g. 0.4 → 40%). Value 1 means 1%, not 100%.
 */
export function normalizeInfillPercentForChart(
  value: number | string | null | undefined
): number | null {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n > 0 && n < 1) return n * 100
  return n
}
