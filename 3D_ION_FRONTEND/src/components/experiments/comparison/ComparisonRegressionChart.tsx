'use client'

import {
  ComposedChart,
  Scatter,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  HuTissueBandsLegend,
  HuTissueReferenceAreas,
} from '@/components/experiments/comparison/HuTissueReferenceAreas'
import {
  HU_REGRESSION_X_DOMAIN,
  HU_REGRESSION_Y_DOMAIN,
} from '@/lib/constants/huTissueBands'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import { PROJECT_COLORS } from '@/lib/constants/pattern-references'
import {
  coalesceInfillPercent,
  normalizeInfillPercentForChart,
} from '@/lib/utils/infillPercent'
import {
  ComparisonExperimentsLegend,
  type ComparisonLegendItem,
} from '@/components/experiments/comparison/ComparisonExperimentsLegend'

/**
 * Infill measurement — X = infill_pct (%), Y = HU (hounsfield mean)
 */
interface InfillMeasurement {
  infill_percentage: number
  hu_value: number | null
  pattern_type: string
  sd_value?: number
}

interface ExperimentRegressionData {
  experiment_id: string
  index_visual?: number
  material_brand: string
  material_model: string
  machine_brand: string
  machine_model: string
  researcher_name?: string
  infill_measurements: InfillMeasurement[]
}

interface ComparisonRegressionChartProps {
  experiments: ExperimentRegressionData[]
  height?: number
  width?: number | `${number}%`
}

interface ChartDataPoint {
  infill_percentage: number
  hu_value: number
}

interface PatternSeries {
  patternType: string
  experimentIndex: number
  experimentId: string
  experimentLabel: string
  materialLabel: string
  machineLabel: string
  points: ChartDataPoint[]
  color: string
  xMin: number
  xMax: number
}

function getExperimentLabel(experiment: ExperimentRegressionData, index: number): string {
  const idx =
    experiment.index_visual != null && experiment.index_visual !== undefined
      ? String(experiment.index_visual)
      : `${index + 1}`
  return `Exp. ${idx} (${experiment.material_model || '—'})`
}

function getMaterialLabel(experiment: ExperimentRegressionData): string {
  return experiment.material_brand || '—'
}

function getMachineLabel(experiment: ExperimentRegressionData): string {
  const b = experiment.machine_brand || ''
  const m = experiment.machine_model || ''
  const s = [b, m].filter(Boolean).join(' ')
  return s || '—'
}

/** Least-squares HU = a * infill + b; r² via Pearson (same as scipy linregress r-value squared). */
function computeLinearRegression(
  points: { x: number; y: number }[]
): { a: number; b: number; r2: number } | null {
  const n = points.length
  if (n < 2) return null

  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  let sumYY = 0
  for (const p of points) {
    sumX += p.x
    sumY += p.y
    sumXY += p.x * p.y
    sumXX += p.x * p.x
    sumYY += p.y * p.y
  }

  const denom = n * sumXX - sumX * sumX
  if (Math.abs(denom) < 1e-12) return null

  const a = (n * sumXY - sumX * sumY) / denom
  const b = (sumY - a * sumX) / n

  const num = n * sumXY - sumX * sumY
  const denR = (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY)
  const r2 = denR > 0 ? Math.min(1, Math.max(0, (num * num) / denR)) : 0

  return { a, b, r2 }
}

function calculateRegressionLinePoints(
  a: number,
  b: number,
  xMin: number,
  xMax: number,
  steps = 24
): Array<{ infill_percentage: number; hu_trend: number }> {
  if (xMin > xMax) [xMin, xMax] = [xMax, xMin]
  if (Math.abs(xMax - xMin) < 1e-6) {
    const x = xMin
    return [
      { infill_percentage: x, hu_trend: a * x + b },
      { infill_percentage: x + 1e-3, hu_trend: a * (x + 1e-3) + b },
    ]
  }
  const out: Array<{ infill_percentage: number; hu_trend: number }> = []
  const step = (xMax - xMin) / steps
  for (let i = 0; i <= steps; i++) {
    const infill = xMin + step * i
    out.push({
      infill_percentage: Number(infill.toFixed(4)),
      hu_trend: Number((a * infill + b).toFixed(4)),
    })
  }
  return out
}

function parseMeasurement(m: InfillMeasurement): { infill: number; hu: number } | null {
  const infillRaw = coalesceInfillPercent(m.infill_percentage, (m as { infill_pct?: number }).infill_pct)
  const huRaw = m.hu_value
  if (huRaw === null || huRaw === undefined) return null
  const infill = infillRaw != null ? normalizeInfillPercentForChart(infillRaw) : null
  const hu = Number(huRaw)
  if (infill == null || !Number.isFinite(hu)) return null
  if (infill < 0 || infill > 100) return null
  return { infill, hu }
}

export function ComparisonRegressionChart({
  experiments,
  height = 560,
  width = '100%',
}: ComparisonRegressionChartProps) {
  const { t } = useTranslation()

  const validExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      if (!exp.infill_measurements?.length) return false
      return exp.infill_measurements.some((m) => parseMeasurement(m) !== null)
    })
  }, [experiments])

  const patternSeries = useMemo(() => {
    const series: PatternSeries[] = []

    validExperiments.forEach((experiment, expIndex) => {
      const byPattern = new Map<string, InfillMeasurement[]>()

      experiment.infill_measurements.forEach((measurement) => {
        const parsed = parseMeasurement(measurement)
        if (!parsed) return
        const pattern = measurement.pattern_type?.trim() || 'Unknown'
        if (!byPattern.has(pattern)) byPattern.set(pattern, [])
        byPattern.get(pattern)!.push(measurement)
      })

      byPattern.forEach((measurements, patternType) => {
        const xy = measurements
          .map((m) => parseMeasurement(m))
          .filter((p): p is { infill: number; hu: number } => p !== null)

        if (xy.length === 0) return

        const points: ChartDataPoint[] = xy.map((p) => ({
          infill_percentage: p.infill,
          hu_value: p.hu,
        }))

        const xs = xy.map((p) => p.infill)
        const xMin = Math.min(...xs)
        const xMax = Math.max(...xs)

        series.push({
          patternType,
          experimentIndex: expIndex,
          experimentId: experiment.experiment_id,
          experimentLabel: getExperimentLabel(experiment, expIndex),
          materialLabel: getMaterialLabel(experiment),
          machineLabel: getMachineLabel(experiment),
          points,
          color: PROJECT_COLORS[expIndex % PROJECT_COLORS.length],
          xMin,
          xMax,
        })
      })
    })

    return series
  }, [validExperiments])

  const experimentLegendItems = useMemo((): ComparisonLegendItem[] => {
    const seen = new Map<string, ComparisonLegendItem>()
    validExperiments.forEach((experiment, expIndex) => {
      if (seen.has(experiment.experiment_id)) return
      seen.set(experiment.experiment_id, {
        key: experiment.experiment_id,
        label: getExperimentLabel(experiment, expIndex),
        color: PROJECT_COLORS[expIndex % PROJECT_COLORS.length],
      })
    })
    return Array.from(seen.values())
  }, [validExperiments])

  const xDomain = HU_REGRESSION_X_DOMAIN
  const yDomain = HU_REGRESSION_Y_DOMAIN

  const chartShellData = useMemo(() => {
    const rows: ChartDataPoint[] = []
    patternSeries.forEach((s) => {
      s.points.forEach((p) => rows.push({ ...p }))
    })
    return rows.length ? rows : [{ infill_percentage: 0, hu_value: 0 }]
  }, [patternSeries])

  if (validExperiments.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">
          {t('experiments.charts.regression.noData') || 'No valid regression data available'}
        </p>
      </div>
    )
  }

  if (patternSeries.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">
          {t('experiments.charts.regression.insufficientData') ||
            'Insufficient data points for regression analysis'}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">
          {t('experiments.charts.regression.title') || 'Infill Regression Analysis'}
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {t('experiments.charts.regression.description') ||
            'Correlation between infill percentage and Hounsfield units by pattern type'}
        </p>
      </div>

      <ResponsiveContainer width={width} height={height}>
        <ComposedChart
          data={chartShellData}
          margin={{ top: 20, right: 88, left: 60, bottom: 60 }}
        >
          <HuTissueReferenceAreas xMin={xDomain[0]} xMax={xDomain[1]} />

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#d1d5db"
            vertical={true}
            horizontal={true}
          />

          <XAxis
            dataKey="infill_percentage"
            type="number"
            label={{
              value: t('experiments.charts.regression.xAxisLabel') || 'Infill Percentage (%)',
              position: 'insideBottomRight',
              offset: -10,
              fill: '#6b7280',
              fontSize: 12,
            }}
            domain={xDomain}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />

          <YAxis
            domain={yDomain}
            ticks={[-1000, -900, -800, -700, -600, -500, -400, -300, -200, -100, 0, 100, 200, 300, 400, 500, 600, 700, 800, 900, 1000]}
            tick={{ fontSize: 10 }}
            label={{
              value: t('experiments.charts.regression.yAxisLabel') || 'Hounsfield Units (HU)',
              angle: -90,
              position: 'insideLeft',
              fill: '#6b7280',
              fontSize: 12,
            }}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />

          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const raw = payload[0].payload as ChartDataPoint & { groupMeta?: PatternSeries }
              const meta = raw?.groupMeta
              if (!meta) return null
              return (
                <div className="rounded border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
                  <div>
                    <span className="text-gray-500">Material: </span>
                    {meta.materialLabel}
                  </div>
                  <div>
                    <span className="text-gray-500">Pattern: </span>
                    {meta.patternType}
                  </div>
                  <div>
                    <span className="text-gray-500">Experimento: </span>
                    {meta.experimentLabel}
                  </div>
                  <div>
                    <span className="text-gray-500">Infill: </span>
                    {typeof raw?.infill_percentage === 'number' ? `${raw.infill_percentage}%` : '—'}
                  </div>
                  <div>
                    <span className="text-gray-500">HU: </span>
                    {typeof raw?.hu_value === 'number' ? raw.hu_value.toFixed(2) : '—'}
                  </div>
                </div>
              )
            }}
          />

          {patternSeries.map((series) => {
            const scatterData = series.points.map((p) => ({
              ...p,
              groupMeta: series,
            }))
            return (
              <Scatter
                key={`scatter-${series.experimentId}-${series.patternType}`}
                name={`${series.experimentLabel} — ${series.patternType}`}
                data={scatterData}
                dataKey="hu_value"
                fill={series.color}
                fillOpacity={0.85}
                shape="circle"
                isAnimationActive={false}
                legendType="none"
              />
            )
          })}

          {patternSeries.map((series) => {
            const reg = computeLinearRegression(
              series.points.map((p) => ({ x: p.infill_percentage, y: p.hu_value }))
            )
            if (!reg || series.points.length < 2) return null
            const regressionData = calculateRegressionLinePoints(
              reg.a,
              reg.b,
              xDomain[0],
              xDomain[1]
            )
            return (
              <Line
                key={`line-${series.experimentId}-${series.patternType}`}
                isAnimationActive={false}
                name={`${series.experimentLabel} — ${series.patternType}`}
                data={regressionData}
                dataKey="hu_trend"
                stroke={series.color}
                strokeWidth={2}
                strokeOpacity={0.85}
                dot={false}
                type="linear"
                connectNulls
                legendType="none"
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>

      <ComparisonExperimentsLegend items={experimentLegendItems} />

      <HuTissueBandsLegend />

      <div className="mt-4 text-xs text-gray-600">
        <p className="italic">
          {t('experiments.charts.regression.noteComputed') ||
            'A regressão é calculada a partir dos pontos infill_pct e hu_mean de cada grupo (material/pattern).'}
        </p>
      </div>
    </div>
  )
}
