'use client'

import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react'

interface FinalizationConfirmationModalProps {
  isOpen: boolean
  isLoading?: boolean
  isEditMode?: boolean
  onConfirm: () => Promise<void>
  onCancel: () => void
}

/**
 * Modal de confirmação para finalização do cadastro de experimento
 * Informa o usuário sobre dados sendo salvos e validação
 */
export default function FinalizationConfirmationModal({
  isOpen,
  isLoading = false,
  isEditMode = false,
  onConfirm,
  onCancel,
}: FinalizationConfirmationModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleConfirm = async () => {
    setIsSubmitting(true)
    setError(null)
    try {
      await onConfirm()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao finalizar cadastro'
      setError(message)
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-b border-gray-200 p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {isEditMode ? 'Finalizar Edição' : 'Finalizar Cadastro'}
              </h2>
              <p className="text-lg text-gray-600 mt-1">
                {isEditMode ? 'Confirmação de alterações' : 'Confirmação de dados'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Info Alert */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <h3 className="text-xl font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              ℹ️ Informações Importantes
            </h3>
            <ul className="text-base text-blue-900 space-y-2">
              {isEditMode ? (
                <>
                  <li>✓ Suas alterações serão salvas na base de dados</li>
                  <li>✓ Os dados atualizados passarão por análise e validação</li>
                  <li>✓ Você será redirecionado para "Meus Experimentos"</li>
                  <li>✓ Receberá notificação sobre o status de análise</li>
                </>
              ) : (
                <>
                  <li>✓ Seus dados serão salvos na base de dados</li>
                  <li>✓ Os dados passarão por análise e validação</li>
                  <li>✓ O experimento poderá ser editado em "Meus Experimentos"</li>
                  <li>✓ Você receberá notificação sobre o status de análise</li>
                </>
              )}
            </ul>
          </div>

          {/* Error Message (if any) */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
              <p className="text-base text-red-900 font-semibold">Erro:</p>
              <p className="text-base text-red-800 mt-1">{error}</p>
            </div>
          )}

          {/* Success Message (while submitting) */}
          {isSubmitting && !error && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 text-green-600 animate-spin" />
                <p className="text-base text-green-900 font-semibold">
                  {isEditMode ? 'Salvando alterações...' : 'Finalizando cadastro...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex gap-3">
          <button
            onClick={onCancel}
            disabled={isSubmitting || isLoading}
            className="flex-1 px-4 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continuar Editando
          </button>
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || isLoading}
            className={`flex-1 px-4 py-3 text-base font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isSubmitting || isLoading
                ? 'text-white bg-green-400 cursor-not-allowed'
                : 'text-white bg-green-600 hover:bg-green-700'
            }`}
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                {isEditMode ? 'Salvando...' : 'Finalizando...'}
              </>
            ) : (
              <>✅ {isEditMode ? 'Salvar Alterações' : 'Finalizar Cadastro'}</>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
