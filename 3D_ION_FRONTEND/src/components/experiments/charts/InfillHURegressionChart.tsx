'use client'

import { useState, useMemo } from 'react'
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  LineChart,
  ComposedChart,
} from 'recharts'
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react'

interface RegressionStats {
  a: number
  b: number
  r2: number
  p_value: number
  std_err: number
  num_points: number
  x_min: number
  x_max: number
  y_min: number
  y_max: number
}

interface RegressionGroup {
  label: string
  group_values: Record<string, string>
  points: Array<{ x: number; y: number }>
  regression: RegressionStats | null
  point_count: number
}

interface InfillHURegressionChartProps {
  groups: RegressionGroup[]
  overallRegression?: RegressionStats | null
  metadata?: {
    total_points: number
    total_groups: number
    x_axis_label?: string
    y_axis_label?: string
  }
  isLoading?: boolean
  showEquation?: boolean
  showR2?: boolean
  showRegressionLine?: boolean
  colors?: string[]
}

// Color palette for different groups
const DEFAULT_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#10b981', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#14b8a6', // teal
]

export function InfillHURegressionChart({
  groups,
  overallRegression,
  metadata,
  isLoading = false,
  showEquation = true,
  showR2 = true,
  showRegressionLine = true,
  colors = DEFAULT_COLORS,
}: InfillHURegressionChartProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-600 text-sm">Carregando análise de regressão...</p>
        </div>
      </div>
    )
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <p className="text-gray-600 text-sm">Nenhum dado disponível para análise</p>
          <p className="text-gray-400 text-xs mt-1">Selecione filtros para visualizar dados de regressão</p>
        </div>
      </div>
    )
  }

  // Prepare data for chart: merge all points with group info
  const chartData = useMemo(() => {
    return groups.flatMap((group, groupIdx) =>
      group.points.map((point) => ({
        x: point.x,
        y: point.y,
        group: group.label,
        groupIndex: groupIdx,
      }))
    )
  }, [groups])

  // Prepare regression lines data for each group
  const regressionLines = useMemo(() => {
    return groups.map((group, idx) => {
      if (!group.regression) return null

      const { a, b, x_min, x_max } = group.regression
      const step = (x_max - x_min) / 20
      const lineData = []

      for (let x = x_min; x <= x_max; x += step) {
        lineData.push({
          x: Number(x.toFixed(2)),
          y: Number((a * x + b).toFixed(2)),
          group: group.label,
        })
      }

      return { label: group.label, data: lineData, color: colors[idx % colors.length] }
    })
  }, [groups, colors])

  // Calculate Y-axis domain with some padding
  const yValues = chartData.map((d) => d.y)
  const yMin = Math.min(...yValues)
  const yMax = Math.max(...yValues)
  const yPadding = (yMax - yMin) * 0.1
  const yDomain = [yMin - yPadding, yMax + yPadding]

  // Calculate X-axis domain with some padding
  const xValues = chartData.map((d) => d.x)
  const xMin = Math.min(...xValues)
  const xMax = Math.max(...xValues)
  const xPadding = (xMax - xMin) * 0.1
  const xDomain = [xMin - xPadding, xMax + xPadding]

  return (
    <div className="w-full bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900">
          📈 Análise de Regressão Linear - Infill vs Hounsfield Units
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          {metadata?.total_points || 0} pontos em {metadata?.total_groups || 0} grupo(s)
        </p>
      </div>

      {/* Chart */}
      <div className="mb-8 bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="x"
              type="number"
              domain={xDomain}
              label={{
                value: metadata?.x_axis_label || 'Infill (%)',
                position: 'insideBottomRight',
                offset: -10,
                fill: '#374151',
                fontSize: 13,
                fontWeight: 'bold',
              }}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              domain={yDomain}
              label={{
                value: metadata?.y_axis_label || 'HU Médio',
                angle: -90,
                position: 'insideLeft',
                fill: '#374151',
                fontSize: 13,
                fontWeight: 'bold',
              }}
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
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value: any, name: any) => {
                const label = String(name ?? '')
                if (label === 'x') return [Number(value).toFixed(2), 'Infill (%)']
                if (label === 'y') return [Number(value).toFixed(2), 'HU']
                if (label === 'group') return [value, 'Grupo']
                return [Number(value).toFixed(2), label]
              }}
              labelFormatter={() => ''}
            />
            <Legend
              wrapperStyle={{ paddingTop: '20px' }}
              verticalAlign="bottom"
              height={36}
            />

            {/* Render scatter plots for each group */}
            {groups.map((group, idx) => (
              <Scatter
                key={`scatter-${idx}`}
                name={group.label}
                data={group.points.map((p) => ({ x: p.x, y: p.y, group: group.label }))}
                fill={colors[idx % colors.length]}
                fillOpacity={0.7}
              />
            ))}

            {/* Render regression lines */}
            {showRegressionLine &&
              regressionLines.map(
                (line, idx) =>
                  line && (
                    <Line
                      key={`regression-${idx}`}
                      type="monotone"
                      dataKey="y"
                      data={line.data}
                      stroke={line.color}
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                      strokeOpacity={0.8}
                      name={`Regressão: ${line.label}`}
                    />
                  )
              )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((group, idx) => (
          <div
            key={`group-${idx}`}
            className="bg-gray-50 border border-gray-200 rounded-lg overflow-hidden"
          >
            {/* Group Header */}
            <button
              onClick={() =>
                setExpandedGroup(expandedGroup === group.label ? null : group.label)
              }
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-100 transition-colors"
              style={{
                borderLeft: `4px solid ${colors[idx % colors.length]}`,
              }}
            >
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-gray-900">{group.label}</div>
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded">
                  {group.point_count} pontos
                </span>
              </div>
              {expandedGroup === group.label ? (
                <ChevronUp className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              )}
            </button>

            {/* Group Details */}
            {expandedGroup === group.label && group.regression && (
              <div className="px-4 py-4 border-t border-gray-200 bg-white">
                <div className="space-y-2">
                  {/* Equation */}
                  {showEquation && (
                    <div className="text-sm">
                      <p className="text-gray-600 font-medium">Equação:</p>
                      <p className="font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded text-xs mt-1">
                        HU = {group.regression.a.toFixed(3)} × Infill + ({group.regression.b.toFixed(2)})
                      </p>
                    </div>
                  )}

                  {/* R² and Statistics */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {showR2 && (
                      <div>
                        <p className="text-gray-600">R²:</p>
                        <p className="font-semibold text-gray-900">
                          {group.regression.r2.toFixed(4)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-gray-600">P-value:</p>
                      <p className="font-semibold text-gray-900">
                        {group.regression.p_value.toExponential(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Slope (a):</p>
                      <p className="font-semibold text-gray-900">
                        {group.regression.a.toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Intercept (b):</p>
                      <p className="font-semibold text-gray-900">
                        {group.regression.b.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Std. Err:</p>
                      <p className="font-semibold text-gray-900">
                        {group.regression.std_err.toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">N:</p>
                      <p className="font-semibold text-gray-900">
                        {group.regression.num_points}
                      </p>
                    </div>
                  </div>

                  {/* Range */}
                  <div className="text-xs mt-3 pt-3 border-t border-gray-200">
                    <p className="text-gray-600 mb-2">Range dos dados:</p>
                    <p className="text-gray-700">
                      X: [{group.regression.x_min.toFixed(2)}, {group.regression.x_max.toFixed(2)}]
                    </p>
                    <p className="text-gray-700">
                      Y: [{group.regression.y_min.toFixed(2)}, {group.regression.y_max.toFixed(2)}]
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Overall Statistics */}
      {overallRegression && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-900 mb-3">Estatísticas Globais</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-blue-700">Slope (a):</p>
              <p className="font-mono text-blue-900 font-semibold">
                {overallRegression.a.toFixed(3)}
              </p>
            </div>
            <div>
              <p className="text-blue-700">Intercept (b):</p>
              <p className="font-mono text-blue-900 font-semibold">
                {overallRegression.b.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-blue-700">R² Global:</p>
              <p className="font-mono text-blue-900 font-semibold">
                {overallRegression.r2.toFixed(4)}
              </p>
            </div>
            <div>
              <p className="text-blue-700">Total de Pontos:</p>
              <p className="font-mono text-blue-900 font-semibold">
                {overallRegression.num_points}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Legend explanation */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
        <p className="font-semibold text-gray-900 mb-2">💡 Como interpretar:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>
            <strong>Slope (a):</strong> Taxa de mudança de HU por unidade de infill (%)
          </li>
          <li>
            <strong>Intercept (b):</strong> Valor esperado de HU quando infill = 0%
          </li>
          <li>
            <strong>R²:</strong> Proporção da variância explicada (mais próximo de 1 = melhor)
          </li>
          <li>
            <strong>P-value:</strong> Significância estatística da regressão
          </li>
        </ul>
      </div>
    </div>
  )
}
