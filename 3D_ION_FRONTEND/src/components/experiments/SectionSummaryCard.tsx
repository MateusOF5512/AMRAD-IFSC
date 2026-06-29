import React from 'react'
import { CheckCircle2, Edit2, AlertCircle } from 'lucide-react'

interface SummaryItem {
  label: string
  value: string | number | React.ReactNode
  optional?: boolean
}

interface SectionSummaryCardProps {
  sectionTitle: string
  sectionIcon?: string
  items: SummaryItem[]
  isComplete: boolean
  onEdit?: () => void
  hasWarning?: boolean
  warningMessage?: string
}

/**
 * Card de resumo para exibição de seção completada
 * Mostra as principais informações preenchidas
 */
export default function SectionSummaryCard({
  sectionTitle,
  sectionIcon = '📋',
  items,
  isComplete,
  onEdit,
  hasWarning = false,
  warningMessage,
}: SectionSummaryCardProps) {
  return (
    <div
      className={`rounded-lg border-2 p-4 space-y-3 ${
        hasWarning
          ? 'bg-amber-50 border-amber-200'
          : isComplete
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{sectionIcon}</span>
          <div>
            <h4 className="font-semibold text-gray-900">{sectionTitle}</h4>
            {hasWarning ? (
              <p className="text-xs text-amber-700 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3 h-3" />
                {warningMessage || 'Informação incompleta'}
              </p>
            ) : (
              <p className="text-xs text-green-700 flex items-center gap-1 mt-1">
                <CheckCircle2 className="w-3 h-3" />
                Seção completada
              </p>
            )}
          </div>
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
            title="Editar seção"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Items List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-lg ${
              hasWarning
                ? 'bg-white bg-opacity-70'
                : 'bg-white bg-opacity-50'
            }`}
          >
            <p className="text-xs text-gray-600 font-medium">{item.label}</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{item.value}</p>
            {item.optional && (
              <p className="text-xs text-gray-500 mt-1">(opcional)</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
