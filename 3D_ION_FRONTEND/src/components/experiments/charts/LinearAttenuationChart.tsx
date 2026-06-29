'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import type { AttenuationTestData } from '@/lib/utils/attenuationChartData'

interface LegacyPoint {
  thickness: number
  value_lambert_beer: number
}

interface LinearAttenuationChartProps {
  data?: LegacyPoint[]
  tests?: AttenuationTestData[]
}

export function LinearAttenuationChart({ data, tests }: LinearAttenuationChartProps) {
  let chartData: { thickness: number; transmission: number }[] = []

  if (tests?.length) {
    chartData = tests.flatMap((test) =>
      (test.measurements || []).map((m) => ({
        thickness: Number(m.thickness),
        transmission: Number(m.transmission),
      }))
    )
  } else if (data?.length) {
    chartData = data
      .filter(
        (item) =>
          item.thickness != null &&
          item.value_lambert_beer != null
      )
      .map((item) => ({
        thickness: Number(item.thickness),
        transmission: Number(item.value_lambert_beer),
      }))
  }

  chartData = chartData.filter((p) => Number.isFinite(p.thickness) && Number.isFinite(p.transmission))
  chartData.sort((a, b) => a.thickness - b.thickness)

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-gray-500 text-sm">Gráfico não presente</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white rounded-lg p-4">
      <h4 className="text-sm font-bold text-gray-700 mb-4">📊 Visualização de Atenuação Linear</h4>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 5, right: 30, left: 0, bottom: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="thickness"
            label={{ value: 'Espessura (mm)', position: 'insideBottomRight', offset: -10, fill: '#6b7280' }}
            stroke="#9ca3af"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            label={{ value: 'Transmissão', angle: -90, position: 'insideLeft', fill: '#6b7280' }}
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
            formatter={(value: any) => [Number(value).toFixed(4), '']}
            labelFormatter={() => ''}
          />
          <Legend wrapperStyle={{ paddingTop: '20px' }} formatter={() => 'Transmissão'} />
          <Line
            type="monotone"
            dataKey="transmission"
            stroke="#3b82f6"
            dot={{ fill: '#3b82f6', r: 5 }}
            activeDot={{ r: 7, fill: '#1e40af' }}
            strokeWidth={2}
            name="Transmissão"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
