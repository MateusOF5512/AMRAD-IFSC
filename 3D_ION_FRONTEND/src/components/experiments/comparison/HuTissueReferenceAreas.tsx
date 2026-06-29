'use client'

import { ReferenceArea } from 'recharts'
import { useTranslation } from 'react-i18next'
import {
  HU_REGRESSION_X_DOMAIN,
  HU_TISSUE_BANDS,
  type HuTissueBandId,
} from '@/lib/constants/huTissueBands'

interface HuTissueReferenceAreasProps {
  xMin?: number
  xMax?: number
}

export function HuTissueBandsLegend() {
  const { t } = useTranslation()

  const labeled = HU_TISSUE_BANDS.filter((b) => b.showLabel)

  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-gray-600">
      <span className="font-medium text-gray-700">
        {t('experiments.charts.regression.tissueBands.legendTitle')}:
      </span>
      {labeled.map((band) => (
        <span key={band.id} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-3 w-5 rounded-sm border border-gray-300"
            style={{ backgroundColor: band.fill, opacity: Math.min(1, band.fillOpacity + 0.25) }}
          />
          {t(`experiments.charts.regression.tissueBands.${band.id}`)}
          <span className="text-gray-400">
            ({band.yMin}–{band.yMax} HU)
          </span>
        </span>
      ))}
    </div>
  )
}

export function HuTissueReferenceAreas({
  xMin = HU_REGRESSION_X_DOMAIN[0],
  xMax = HU_REGRESSION_X_DOMAIN[1],
}: HuTissueReferenceAreasProps) {
  const { t } = useTranslation()

  const label = (id: HuTissueBandId) =>
    t(`experiments.charts.regression.tissueBands.${id}`, { defaultValue: id })

  return (
    <>
      {HU_TISSUE_BANDS.map((band) => (
        <ReferenceArea
          key={band.id}
          x1={xMin}
          x2={xMax}
          y1={band.yMin}
          y2={band.yMax}
          fill={band.fill}
          fillOpacity={band.fillOpacity}
          stroke={band.id === 'unlabeled' ? '#e5e7eb' : band.fill}
          strokeOpacity={band.id === 'unlabeled' ? 0.6 : 0.25}
          ifOverflow="hidden"
          label={
            band.showLabel
              ? {
                  value: label(band.id),
                  position: 'insideRight',
                  fill: '#374151',
                  fontSize: 10,
                  fontWeight: 600,
                }
              : undefined
          }
        />
      ))}
    </>
  )
}
