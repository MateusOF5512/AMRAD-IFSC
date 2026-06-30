'use client'

import { formatDateByLanguage, formatTimeByLanguage } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface TableDateCellProps {
  value?: string | Date | null
  className?: string
}

export function TableDateCell({ value, className = '' }: TableDateCellProps) {
  const { i18n } = useTranslation()

  if (!value) {
    return <span className="text-muted">-</span>
  }

  const date = new Date(value)
  if (isNaN(date.getTime())) {
    return <span className="text-muted">-</span>
  }

  const dateStr = formatDateByLanguage(date, i18n.language)
  const timeStr = formatTimeByLanguage(date, i18n.language)

  return (
    <div className={`whitespace-nowrap ${className}`}>
      <div className="text-sm font-semibold text-foreground">{dateStr}</div>
      <div className="text-xs text-muted font-normal">{timeStr}</div>
    </div>
  )
}
