'use client'

import { useState } from 'react'
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ComparisonHUChart } from './ComparisonHUChart'
import { ComparisonROIChart } from './ComparisonROIChart'
import { getNormalizedApiUrl } from '@/lib/api'

interface ExperimentWithDetails {
  experiment_id: string
  index_visual?: number
  material_brand?: string
  material_model?: string
  infills: any[] | null
  has_data: boolean
  error?: string | null
}

interface SimplifiedComparisonProps {
  selectedIds: string[]
  experiments: any[] // ExperimentSummary[]
}

export function SimplifiedExperimentComparison({ selectedIds, experiments }: SimplifiedComparisonProps) {
  const { t } = useTranslation()
  const [isGenerating, setIsGenerating] = useState(false)
  const [comparisonData, setComparisonData] = useState<ExperimentWithDetails[] | null>(null)
  const [errors, setErrors] = useState<string[]>([])

  // Minimum 2 experiments required
  const canGenerate = selectedIds.length >= 2

  const handleGenerateComparison = async () => {
    if (!canGenerate) return

    setIsGenerating(true)
    setErrors([])
    setComparisonData(null)

    try {
      const apiUrl = getNormalizedApiUrl()
      const token = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')!).access_token : null

      // Fetch data for each selected experiment
      const dataPromises = selectedIds.map(async (id) => {
        try {
          const response = await fetch(`${apiUrl}/experiments/${id}/detalhes`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              ...(token && { 'Authorization': `Bearer ${token}` }),
            },
          })

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`)
          }

          const data = await response.json()

          // Extract experiment info
          const experiment = experiments.find((e) => e.experiment_id === id)

          // Normalize infill data: convert backend field names to frontend expectations
          const normalizedInfills = (data.infill_measurements || [])
            .map((infill: any) => {
              const pct = infill.infill_pct ?? infill.infill_percentage ?? null
              return {
                ...infill,
                infill_pct: pct,
                infill_percentage: pct,
                infill_type: infill.infill_type || infill.pattern_type,
              }
            })
            // Ordenar por percentual de infill de forma ascendente
            .sort((a: any, b: any) => {
              const aPercentage = a.infill_percentage ?? a.infill_pct ?? 0
              const bPercentage = b.infill_percentage ?? b.infill_pct ?? 0
              return aPercentage - bPercentage
            })

          return {
            experiment_id: id,
            index_visual: experiment?.index_visual,
            material_brand: experiment?.material_brand,
            material_model: experiment?.material_model,
            infills: normalizedInfills.length > 0 ? normalizedInfills : null,
            has_data: normalizedInfills.length > 0,
            error: null,
          }
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido'
          const experiment = experiments.find((e) => e.experiment_id === id)
          return {
            experiment_id: id,
            index_visual: experiment?.index_visual,
            material_brand: experiment?.material_brand,
            material_model: experiment?.material_model,
            infills: null,
            has_data: false,
            error: t('experimentComparison.labels.fillExperimentError', { index: experiment?.index_visual || id.slice(-4) }),
          }
        }
      })

      const results = await Promise.all(dataPromises)

      // Separate errors and valid data
      const newErrors = results
        .filter((r) => r.error)
        .map((r) => r.error as string)

      const validData = results.filter((r) => r.has_data)

      setErrors(newErrors)

      if (validData.length === 0) {
        setErrors([t('experimentComparison.labels.noFillData')])
        setComparisonData([])
      } else {
        setComparisonData(validData)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Erro ao buscar dados'
      setErrors([errorMsg])
    } finally {
      setIsGenerating(false)
    }
  }

  const handleReset = () => {
    setComparisonData(null)
    setErrors([])
  }

  // Prepare data for charts
  const huChartData = comparisonData
    ?.filter((exp) => exp.infills && exp.infills.length > 0)
    .map((exp) => ({
      experiment_id: exp.experiment_id,
      index_visual: exp.index_visual,
      material_brand: exp.material_brand,
      material_model: exp.material_model,
      infills: exp.infills || [],
    }))

  const roiChartData = comparisonData
    ?.filter((exp) => exp.infills && exp.infills.length > 0)
    .map((exp) => ({
      experiment_id: exp.experiment_id,
      index_visual: exp.index_visual,
      material_brand: exp.material_brand,
      material_model: exp.material_model,
      infills: exp.infills || [],
    }))

  // Initial state - no comparison yet
  if (comparisonData === null) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">{t('experimentComparison.sampleComparison.title')}</h3>

        <div className="bg-surface rounded-lg border-2 border-dashed border-border p-8 text-center mb-6">
          <p className="text-muted mb-4">
            {selectedIds.length === 0
              ? t('experimentComparison.labels.selectMinimumHU')
              : selectedIds.length === 1
              ? t('experimentComparison.labels.selectAdditional')
              : t('experimentComparison.labels.selectedCount', { count: selectedIds.length })}
          </p>

          <button
            onClick={handleGenerateComparison}
            disabled={!canGenerate || isGenerating}
            className={`
              inline-flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-colors
              ${
                canGenerate && !isGenerating
                  ? 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                  : 'bg-slate-300 text-muted cursor-not-allowed'
              }
            `}
          >
            {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
            {isGenerating ? t('experimentComparison.generatingGraph') : t('experimentComparison.generateGraph')}
          </button>
        </div>
      </div>
    )
  }

  // Comparison generated - show results
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">{t('experimentComparison.sampleComparison.title')}</h3>
        <button
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          <RefreshCw className="h-4 w-4" />
          {t('experimentComparison.sampleComparison.clear')}
        </button>
      </div>

      {/* Error Messages */}
      {errors.length > 0 && (
        <div className="mb-6 space-y-3">
          {errors.map((error, idx) => (
            <div key={idx} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700">{error}</p>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="space-y-8">
        {/* HU Chart */}
        {huChartData && huChartData.length > 0 ? (
          <ComparisonHUChart data={huChartData} />
        ) : (
          <div className="flex items-center justify-center h-80 bg-background rounded-lg border border-border">
            <p className="text-muted text-sm">{t('experimentComparison.errors.noHUData')}</p>
          </div>
        )}

        {/* ROI Chart */}
        {roiChartData && roiChartData.length > 0 ? (
          <ComparisonROIChart data={roiChartData} />
        ) : (
          <div className="flex items-center justify-center h-80 bg-background rounded-lg border border-border">
            <p className="text-muted text-sm">{t('experimentComparison.errors.noROIData')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
