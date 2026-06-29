export interface AttenuationMeasurementPoint {
  thickness: number
  transmission: number
  ln_relative?: number | null
}

export interface AttenuationTestData {
  id?: string
  rqr_energy: string
  i0: number
  mu_coefficient?: number | null
  measurements: AttenuationMeasurementPoint[]
  regression_line?: { thickness: number; ln_relative_fit: number }[]
}

export interface ExperimentAttenuationBundle {
  experiment_id: string
  index_visual?: number
  material_brand?: string
  material_model?: string
  tests: AttenuationTestData[]
}

/** Normalize API detail payload into chart-ready bundles */
export function bundleAttenuationFromDetail(
  experimentId: string,
  detail: {
    index_visual?: number
    material_brand?: string
    material_model?: string
    attenuation_tests?: AttenuationTestData[]
    linear_attenuation?: { thickness: number; value_lambert_beer: number }[]
  }
): ExperimentAttenuationBundle | null {
  const tests: AttenuationTestData[] = []

  if (detail.attenuation_tests?.length) {
    tests.push(...detail.attenuation_tests)
  } else if (detail.linear_attenuation?.length) {
    tests.push({
      rqr_energy: 'Legacy',
      i0: 1,
      measurements: detail.linear_attenuation.map((row) => ({
        thickness: row.thickness,
        transmission: row.value_lambert_beer,
      })),
    })
  }

  if (tests.length === 0) return null

  return {
    experiment_id: experimentId,
    index_visual: detail.index_visual,
    material_brand: detail.material_brand,
    material_model: detail.material_model,
    tests,
  }
}

export function materialKey(brand?: string, model?: string): string {
  return `${brand || '—'}|${model || '—'}`
}

/** Group μ by RQR for chart 3 — only materials with 2+ energies */
export function buildMuVsEnergySeries(
  bundles: ExperimentAttenuationBundle[]
): { materialLabel: string; points: { rqr: string; mu: number; experimentLabel: string }[] }[] {
  const byMaterial = new Map<
    string,
    { label: string; points: { rqr: string; mu: number; experimentLabel: string }[] }
  >()

  for (const bundle of bundles) {
    const label = [bundle.material_brand, bundle.material_model].filter(Boolean).join(' ') || 'Material'
    const key = materialKey(bundle.material_brand, bundle.material_model)
    if (!byMaterial.has(key)) {
      byMaterial.set(key, { label, points: [] })
    }
    const bucket = byMaterial.get(key)!
    const expLabel = String(bundle.index_visual ?? bundle.experiment_id.slice(-4))

    for (const test of bundle.tests) {
      if (test.mu_coefficient == null || !test.rqr_energy) continue
      bucket.points.push({
        rqr: test.rqr_energy,
        mu: test.mu_coefficient,
        experimentLabel: expLabel,
      })
    }
  }

  return Array.from(byMaterial.values())
    .map((g) => ({ materialLabel: g.label, points: g.points }))
    .filter((g) => {
    const uniqueRqr = new Set(g.points.map((p) => p.rqr))
    return uniqueRqr.size >= 2
  })
}
