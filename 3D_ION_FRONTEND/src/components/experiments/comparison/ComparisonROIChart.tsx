'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTranslation } from 'react-i18next'

interface InfillData {
  infill_percentage?: number
  infill_type?: string
  roi_area_mm2?: number | null
}

interface ExperimentInfillData {
  experiment_id: string
  index_visual?: number
  material_brand?: string
  material_model?: string
  infills: InfillData[]
}

interface ComparisonROIChartProps {
  data: ExperimentInfillData[]
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316']

// Helper function to get a readable experiment identifier
const getExperimentLabel = (experiment: ExperimentInfillData): string => {
  // Use index_visual if available, otherwise use experiment_id
  const identifier = experiment.index_visual || experiment.experiment_id
  return String(identifier)
}

export function ComparisonROIChart({ data }: ComparisonROIChartProps) {
  const { t } = useTranslation()
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-background rounded-lg border border-border">
        <p className="text-muted text-sm">{t('experiments.charts.comparativeRoi.noData')}</p>
      </div>
    )
  }

  // Prepare chart data: each infill gets a bar for each experiment
  const infillTypes = new Set<string>()
  data.forEach((exp) => {
    exp.infills.forEach((infill) => {
      const key = infill.infill_type || `${infill.infill_percentage}%`
      infillTypes.add(key)
    })
  })

  const chartData = Array.from(infillTypes).map((infillType) => {
    const entry: any = {
      infill: infillType,
    }

    data.forEach((exp, expIndex) => {
      const infillData = exp.infills.find(
        (inf) => (inf.infill_type || `${inf.infill_percentage}%`) === infillType
      )

      if (infillData && infillData.roi_area_mm2 !== null && infillData.roi_area_mm2 !== undefined) {
        entry[`exp_${expIndex}`] = Number(infillData.roi_area_mm2)
        entry[`exp_${expIndex}_label`] = `Exp #${exp.index_visual || exp.experiment_id.slice(-4)}`
      }
    })

    return entry
  })

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-80 bg-background rounded-lg border border-border">
        <p className="text-muted text-sm">{t('experiments.charts.comparativeRoi.noData')}</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-surface rounded-lg p-4">
      <h4 className="text-sm font-bold text-foreground mb-4">{t('experiments.charts.comparativeRoi.title')}</h4>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="infill"
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            label={{ value: t('experiments.charts.comparativeRoi.yAxisLabel'), angle: -90, position: 'insideLeft', fill: '#6b7280' }}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              padding: '8px',
            }}
            formatter={(value: any) => [Number(value).toFixed(2), t('experiments.charts.comparativeRoi.tooltipLabel')]}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} />

          {data.map((experiment, expIndex) => (
            <Bar
              key={`bar-${expIndex}`}
              dataKey={`exp_${expIndex}`}
              fill={COLORS[expIndex % COLORS.length]}
              name={`${t('experiments.charts.legend.experimentLabel', { index: getExperimentLabel(experiment) })} (${experiment.material_brand || t('experiments.charts.legend.unknownMaterial')})`}
              radius={[8, 8, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 text-xs text-muted">
        <p>{t('experiments.charts.comparativeRoi.description')}</p>
      </div>
    </div>
  )
}
