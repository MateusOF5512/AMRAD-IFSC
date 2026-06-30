import { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Alert } from '@/components/ui/Alert'
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
      bg: 'bg-slate-50',
      border: 'border-border',
      header: 'bg-slate-100',
      icon: null,
      label: 'Pendente',
      badge: 'default' as const,
    },
    'in-progress': {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      header: 'bg-blue-100',
      icon: <div className="w-2 h-2 bg-info rounded-full animate-pulse" />,
      label: 'Em Progresso',
      badge: 'info' as const,
    },
    completed: {
      bg: 'bg-primary-light',
      border: 'border-primary/30',
      header: 'bg-primary-muted',
      icon: <CheckCircle2 className="w-4 h-4 text-primary" />,
      label: 'Concluído',
      badge: 'success' as const,
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      header: 'bg-red-100',
      icon: <AlertCircle className="w-4 h-4 text-danger" />,
      label: 'Erro',
      badge: 'danger' as const,
    },
  }

  const config = statusConfig[status]

  return (
    <div className={`rounded-xl border ${config.border} ${config.bg} overflow-hidden shadow-sm`}>
      {/* Header - Always Clickable */}
      <div
        onClick={() => onToggleExpand?.(!isExpanded)}
        className={`${config.header} px-6 py-4 cursor-pointer hover:bg-opacity-80 transition-colors flex items-center justify-between`}
      >
        <div className="flex items-center gap-3 flex-1">
          {config.icon && <div className="flex-shrink-0">{config.icon}</div>}
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg">{title}</h3>
            {description && <p className="text-sm text-muted mt-1">{description}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={config.badge}>
            {config.label} ({filledFields.length}/{requiredFields.length})
          </Badge>
          <div className="flex-shrink-0">
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-muted" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted" />
            )}
          </div>
        </div>
      </div>

      {/* Content - Conditionally Rendered */}
      {isExpanded && (
        <div className="px-6 py-6 space-y-6 border-t-2 border-opacity-20 border-current">
          {/* Validation Errors */}
          {showValidationErrors && !isValid && (
            <Alert variant="danger" title="Campos obrigatórios faltando:">
              <ul className="list-disc list-inside space-y-1">
                {missingFields.map((field) => (
                  <li key={field}>{field}</li>
                ))}
              </ul>
            </Alert>
          )}

          {/* Form Content */}
          <div className="space-y-4">{children}</div>

          {/* Footer Actions */}
          {!hideButtons && (
            <div className="flex gap-3 pt-6 border-t border-border">
              {status === 'completed' && onEdit && (
                <Button variant="outline" onClick={onEdit}>
                  Editar
                </Button>
              )}
              {status !== 'completed' && (
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onComplete}
                  disabled={!isValid}
                  className="flex-1"
                >
                  {submitButtonLabel}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
