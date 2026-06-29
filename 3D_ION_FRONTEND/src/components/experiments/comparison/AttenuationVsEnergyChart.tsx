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
import {
  buildMuVsEnergySeries,
  type ExperimentAttenuationBundle,
} from '@/lib/utils/attenuationChartData'
import {
  ComparisonExperimentsLegend,
  type ComparisonLegendItem,
} from '@/components/experiments/comparison/ComparisonExperimentsLegend'

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b']

interface AttenuationVsEnergyChartProps {
  bundles: ExperimentAttenuationBundle[]
}

export function AttenuationVsEnergyChart({ bundles }: AttenuationVsEnergyChartProps) {
  const { t } = useTranslation()
  const groups = buildMuVsEnergySeries(bundles)
  const experimentLegendItems: ComparisonLegendItem[] = bundles.map((bundle, i) => ({
    key: bundle.experiment_id,
    label: `Exp. ${bundle.index_visual ?? bundle.experiment_id.slice(-4)}`,
    color: COLORS[i % COLORS.length],
  }))

  if (groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-dashed border-gray-200">
        <p className="text-gray-500 text-sm text-center px-4">
          {t('experiments.charts.attenuationVsEnergy.empty')}
        </p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg p-4 border border-gray-100 shadow-sm space-y-6">
      <h4 className="text-sm font-bold text-gray-700">
        {t('experiments.charts.attenuationVsEnergy.title')}
      </h4>
      {groups.map((group, gi) => {
        const chartData = group.points.map((p) => ({
          rqr: p.rqr,
          mu: p.mu,
          label: `${p.rqr} (${p.experimentLabel})`,
        }))
        return (
          <div key={gi}>
            <p className="text-xs font-medium text-gray-600 mb-2">{group.materialLabel}</p>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="rqr"
                  angle={-25}
                  textAnchor="end"
                  height={60}
                  label={{
                    value: t('experiments.charts.attenuationVsEnergy.xAxis'),
                    position: 'insideBottom',
                    offset: -5,
                  }}
                />
                <YAxis
                  label={{
                    value: t('experiments.charts.attenuationVsEnergy.yAxis'),
                    angle: -90,
                    position: 'insideLeft',
                  }}
                />
                <Tooltip formatter={(v: any) => [Number(v).toFixed(4), 'μ']} />
                <Line
                  type="monotone"
                  dataKey="mu"
                  stroke={COLORS[gi % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 5 }}
                  name="μ"
                  legendType="none"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )
      })}
      <ComparisonExperimentsLegend items={experimentLegendItems} />
      <p className="text-xs text-gray-500">{t('experiments.charts.attenuationVsEnergy.description')}</p>
    </div>
  )
}
