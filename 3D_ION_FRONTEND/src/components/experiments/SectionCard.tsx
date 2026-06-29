import React, { ReactNode, useState } from 'react'
import { ChevronDown, ChevronUp, AlertCircle, CheckCircle2 } from 'lucide-react'

interface SectionCardProps {
  id: string
  title: string
  description?: string
  status: 'pending' | 'in-progress' | 'completed' | 'error'
  requiredFields?: string[]
  filledFields?: string[]
  children: ReactNode
  onComplete?: () => void
  onEdit?: () => void
  isExpanded?: boolean
  onToggleExpand?: (expanded: boolean) => void
  submitButtonLabel?: string
  showValidationErrors?: boolean
  overrideFormValid?: boolean
  isOptional?: boolean
  hideButtons?: boolean
}

/**
 * Card para exibir uma seção do formulário
 * Com indicação de status, validação de campos e Toggle de expansão
 */
export default function SectionCard({
  id,
  title,
  description,
  status,
  requiredFields = [],
  filledFields = [],
  children,
  onComplete,
  onEdit,
  isExpanded = true,
  onToggleExpand,
  submitButtonLabel = '✅ Salvar & Continuar',
  showValidationErrors = false,
  overrideFormValid = false,
  isOptional = false,
  hideButtons = false,
}: SectionCardProps) {
  const missingFields = requiredFields.filter((field) => !filledFields.includes(field))
  const isValid = overrideFormValid || missingFields.length === 0

  const statusConfig = {
    pending: {
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      header: 'bg-gray-100',
      icon: null,
      label: 'Pendente',
    },
    'in-progress': {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      header: 'bg-blue-100',
      icon: <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />,
      label: 'Em Progresso',
    },
    completed: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      header: 'bg-green-100',
      icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
      label: 'Concluído',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      header: 'bg-red-100',
      icon: <AlertCircle className="w-4 h-4 text-red-600" />,
      label: 'Erro',
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`rounded-lg border-2 ${config.border} ${config.bg} overflow-hidden`}>
      {/* Header - Always Clickable */}
      <div
        onClick={() => onToggleExpand?.(!isExpanded)}
        className={`${config.header} px-6 py-4 cursor-pointer hover:bg-opacity-80 transition-colors flex items-center justify-between`}
      >
        <div className="flex items-center gap-3 flex-1">
          {config.icon && <div className="flex-shrink-0">{config.icon}</div>}
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 text-lg">{title}</h3>
            {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium px-2 py-1 bg-white bg-opacity-60 rounded">
            {config.label} {`(${filledFields.length}/${requiredFields.length})`}
          </span>
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-600" />
            )}
          </div>
        </div>
      </div>

      {/* Content - Conditionally Rendered */}
      {isExpanded && (
        <div className="px-6 py-6 space-y-6 border-t-2 border-opacity-20 border-current">
          {/* Validation Errors */}
          {showValidationErrors && !isValid && (
            <div className="bg-red-100 border border-red-300 rounded-lg p-4 flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-800">
                <p className="font-semibold mb-2">Campos obrigatórios faltando:</p>
                <ul className="list-disc list-inside space-y-1">
                  {missingFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Form Content */}
          <div className="space-y-4">{children}</div>

          {/* Footer Actions */}
          {!hideButtons && (
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              {status === 'completed' && onEdit && (
                <button
                  onClick={onEdit}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  ✏️ Editar
                </button>
              )}
              {status !== 'completed' && (
                <button
                  onClick={onComplete}
                  disabled={!isValid}
                  className={`flex-1 px-8 py-4 text-lg font-semibold rounded-3xl transition-colors ${
                    isValid
                      ? 'text-white bg-green-600 hover:bg-green-700'
                      : 'text-gray-400 bg-gray-100 cursor-not-allowed'
                  }`}
                >
                  {submitButtonLabel}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
