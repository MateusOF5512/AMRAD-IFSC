'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { useTranslation } from 'react-i18next'
import type { ExperimentAttenuationBundle } from '@/lib/utils/attenuationChartData'
import {
  ComparisonExperimentsLegend,
  type ComparisonLegendItem,
} from '@/components/experiments/comparison/ComparisonExperimentsLegend'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899']

interface TransmissionCurveChartProps {
  bundles: ExperimentAttenuationBundle[]
}

export function TransmissionCurveChart({ bundles }: TransmissionCurveChartProps) {
  const { t } = useTranslation()

  if (!bundles.length) {
    return (
      <div className="flex items-center justify-center h-80 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">{t('experiments.charts.transmissionCurve.noData')}</p>
      </div>
    )
  }

  const lines: { key: string; name: string; color: string }[] = []
  const thicknessMap = new Map<number, Record<string, number>>()
  let colorIdx = 0

  bundles.forEach((bundle, bi) => {
    bundle.tests.forEach((test, ti) => {
      const key = `s_${bi}_${ti}`
      const name = `Exp #${bundle.index_visual ?? bundle.experiment_id.slice(-4)} · ${test.rqr_energy}`
      lines.push({ key, name, color: COLORS[colorIdx++ % COLORS.length] })

      test.measurements.forEach((m) => {
        const x = Number(m.thickness)
        if (!thicknessMap.has(x)) thicknessMap.set(x, { thickness: x })
        thicknessMap.get(x)![key] = Number(m.transmission)
      })
    })
  })

  const chartData = Array.from(thicknessMap.values()).sort((a, b) => a.thickness - b.thickness)
  const legendItems: ComparisonLegendItem[] = lines.map((line) => ({
    key: line.key,
    label: line.name,
    color: line.color,
  }))

  return (
    <div className="w-full bg-white rounded-lg p-4 border border-gray-100 shadow-sm">
      <h4 className="text-sm font-bold text-gray-700 mb-4">
        {t('experiments.charts.transmissionCurve.title')}
      </h4>
      <ResponsiveContainer width="100%" height={350}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="thickness"
            label={{
              value: t('experiments.charts.transmissionCurve.xAxis'),
              position: 'insideBottom',
              offset: -5,
            }}
            stroke="#9ca3af"
          />
          <YAxis
            label={{
              value: t('experiments.charts.transmissionCurve.yAxis'),
              angle: -90,
              position: 'insideLeft',
            }}
            stroke="#9ca3af"
          />
          <Tooltip />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.name}
              stroke={line.color}
              strokeWidth={2}
              dot={{ r: 4 }}
              connectNulls
              legendType="none"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <ComparisonExperimentsLegend items={legendItems} />
      <p className="mt-3 text-xs text-gray-500">{t('experiments.charts.transmissionCurve.description')}</p>
    </div>
  )
}
