'use client'

import { useState, useMemo } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ComparisonRegressionChart } from './ComparisonRegressionChart'
import { TransmissionCurveChart } from './TransmissionCurveChart'
import { AttenuationVsEnergyChart } from './AttenuationVsEnergyChart'
import {
  bundleAttenuationFromDetail,
  type ExperimentAttenuationBundle,
} from '@/lib/utils/attenuationChartData'
import { normalizeInfillPercentForChart } from '@/lib/utils/infillPercent'
import { getNormalizedApiUrl } from '@/lib/api'

interface ExperimentWithDetails {
  experiment_id: string
  index_visual?: number
  material_brand?: string
  material_model?: string
  machine_brand?: string
  machine_model?: string
  attenuation_data: any[] | null
  attenuation_tests: any[] | null
  mechanical_data: any | null
  infills: any[] | null
  has_data: boolean
  error?: string | null
}

interface ExperimentComparisonProps {
  selectedIds: string[]
  experiments: any[]
}

export function ExperimentComparison({ selectedIds, experiments }: ExperimentComparisonProps) {
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [comparisonData, setComparisonData] = useState<ExperimentWithDetails[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  const canGenerate = selectedIds.length >= 2

  const attenuationBundles: ExperimentAttenuationBundle[] = useMemo(() => {
    if (!comparisonData) return []
    const bundles: ExperimentAttenuationBundle[] = []
    comparisonData.forEach((exp) => {
      const bundle = bundleAttenuationFromDetail(exp.experiment_id, {
        index_visual: exp.index_visual,
        material_brand: exp.material_brand,
        material_model: exp.material_model,
        attenuation_tests: exp.attenuation_tests || undefined,
        linear_attenuation: exp.attenuation_data || undefined,
      })
      if (bundle) bundles.push(bundle)
    })
    return bundles
  }, [comparisonData])

  const hasAttenuationCharts = attenuationBundles.length > 0

  const handleGenerateComparison = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setErrors([])
    setComparisonData(null)

    try {
      const apiUrl = getNormalizedApiUrl()

      const dataPromises = selectedIds.map(async (id) => {
        try {
          const response = await fetch(`${apiUrl}/experiments/${id}/detalhes`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
          })

          if (!response.ok) throw new Error(`HTTP ${response.status}`)

          const data = await response.json()
          const experiment = experiments.find((e) => e.experiment_id === id)

          const normalizedInfills = (data.infill_measurements || []).map((infill: any) => {
            const pct =
              infill.infill_pct ?? infill.infill_percentage ?? null
            return {
              ...infill,
              infill_pct: pct,
              infill_percentage: pct,
              infill_type: infill.infill_type || infill.pattern_type,
            }
          })

          const hasAttenuationTests =
            data.attenuation_tests && data.attenuation_tests.length > 0
          const hasLegacyAttenuation =
            data.linear_attenuation && data.linear_attenuation.length > 0
          const hasAttenuationData = hasAttenuationTests || hasLegacyAttenuation
          const hasMechanicalData =
            data.mechanical_properties &&
            Object.values(data.mechanical_properties).some((v) => v !== null)
          const hasInfillData = normalizedInfills.length > 0

          return {
            experiment_id: id,
            index_visual: data.index_visual ?? experiment?.index_visual,
            material_brand: data.material_brand ?? experiment?.material_brand,
            material_model: data.material_model ?? experiment?.material_model,
            machine_brand: data.machine_brand ?? experiment?.machine_brand,
            machine_model: data.machine_model ?? experiment?.machine_model,
            attenuation_data: hasLegacyAttenuation ? data.linear_attenuation : null,
            attenuation_tests: hasAttenuationTests ? data.attenuation_tests : null,
            mechanical_data: hasMechanicalData ? data.mechanical_properties : null,
            infills: hasInfillData ? normalizedInfills : null,
            has_data: hasAttenuationData || hasMechanicalData || hasInfillData,
            error: null,
          }
        } catch (err) {
          const experiment = experiments.find((e) => e.experiment_id === id)
          return {
            experiment_id: id,
            index_visual: experiment?.index_visual,
            material_brand: experiment?.material_brand,
            material_model: experiment?.material_model,
            machine_brand: experiment?.machine_brand,
            machine_model: experiment?.machine_model,
            attenuation_data: null,
            attenuation_tests: null,
            mechanical_data: null,
            infills: null,
            has_data: false,
            error: t('experimentComparison.errors.noDataForComparison', {
              index: experiment?.index_visual || id.slice(-4),
            }),
          }
        }
      })

      const results = await Promise.all(dataPromises)
      const newErrors = results.filter((r) => r.error).map((r) => r.error as string)
      const validData = results.filter((r) => r.has_data)

      setErrors(newErrors)
      setComparisonData(validData.length === 0 ? [] : validData)
      if (validData.length === 0) {
        setErrors([t('experimentComparison.errors.noValidData')])
      }
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Erro ao buscar dados'])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setComparisonData(null)
    setErrors([])
  }

  const regressionChartData = comparisonData
    ?.filter((exp) => exp.infills && exp.infills.length > 0)
    .map((exp) => ({
      experiment_id: exp.experiment_id,
      index_visual: exp.index_visual,
      material_brand: exp.material_brand || '—',
      material_model: exp.material_model || '—',
      machine_brand: exp.machine_brand || '—',
      machine_model: exp.machine_model || '—',
      researcher_name: undefined,
      infill_measurements: (exp.infills || []).map((infill: any) => {
        const rawInfill = infill.infill_pct ?? infill.infill_percentage
        const normalized = rawInfill != null ? normalizeInfillPercentForChart(rawInfill) : null
        const infillNum = normalized != null ? normalized : NaN
        const huRaw = infill.hu_mean ?? infill.hu_value
        const huNum =
          huRaw === null || huRaw === undefined || huRaw === ''
            ? null
            : Number(huRaw)
        return {
          infill_percentage: infillNum,
          hu_value: huNum !== null && Number.isFinite(huNum) ? huNum : null,
          pattern_type: infill.infill_type || infill.pattern_type || 'Unknown',
          sd_value: infill.sd_value,
        }
      }),
    }))

  if (comparisonData === null) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">
          📊 {t('experimentComparison.title')}
        </h3>
        <div className="bg-surface rounded-lg border-2 border-dashed border-border p-8 text-center mb-6">
          <p className="text-muted mb-4">
            {selectedIds.length === 0
              ? t('experimentComparison.selectMinimum')
              : selectedIds.length === 1
                ? t('experimentComparison.selectAdditional')
                : t('experimentComparison.selectedCount', { count: selectedIds.length })}
          </p>
          <button
            onClick={handleGenerateComparison}
            disabled={!canGenerate || isGenerating}
            className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
              canGenerate && !isGenerating
                ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                : 'bg-slate-300 text-muted cursor-not-allowed'
            }`}
          >
            {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
            {isGenerating
              ? t('experimentComparison.generatingGraph')
              : t('experimentComparison.generateGraph')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <ComparisonHeader t={t} onReset={handleReset} />

      {errors.length > 0 && (
        <div className="mb-6 space-y-3">
          {errors.map((error, idx) => (
            <ComparisonErrorAlert key={idx} error={error} />
          ))}
        </div>
      )}

      <div className="space-y-8">
        {hasAttenuationCharts && (
          <section className="space-y-6">
            <h4 className="text-md font-semibold text-foreground border-b pb-2">
              {t('experimentComparison.attenuationSectionTitle')}
            </h4>
            <TransmissionCurveChart bundles={attenuationBundles} />
            <AttenuationVsEnergyChart bundles={attenuationBundles} />
          </section>
        )}

        {regressionChartData && regressionChartData.length > 0 ? (
          <ComparisonRegressionChart experiments={regressionChartData} />
        ) : (
          !hasAttenuationCharts && (
            <div className="flex items-center justify-center h-80 bg-background rounded-lg border border-border">
              <p className="text-muted text-sm">
                {t('experimentComparison.errors.noRegressionData')}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

function ComparisonHeader({
  t,
  onReset,
}: {
  t: (k: string) => string
  onReset: () => void
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h3 className="text-lg font-semibold text-foreground">📊 {t('experimentComparison.title')}</h3>
      <button
        onClick={onReset}
        className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
      >
        <RefreshCw className="h-4 w-4" />
        {t('experimentComparison.reset')}
      </button>
    </div>
  )
}

function ComparisonErrorAlert({ error }: { error: string }) {
  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
      <p className="text-sm text-yellow-700">{error}</p>
    </div>
  )
}
