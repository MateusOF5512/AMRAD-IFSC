'use client'

import { useTranslation } from 'react-i18next'

export interface ComparisonLegendItem {
  key: string
  label: string
  color: string
}

interface ComparisonExperimentsLegendProps {
  items: ComparisonLegendItem[]
}

export function ComparisonExperimentsLegend({ items }: ComparisonExperimentsLegendProps) {
  const { t } = useTranslation()

  if (items.length === 0) return null

  return (
    <div className="mt-3 border-t border-gray-100 pt-3">
      <p className="mb-2 text-center text-xs font-medium text-gray-500">
        {t('experiments.charts.legend.experimentsInAnalysis', 'Experimentos em análise')}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-2 text-xs text-gray-700">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
