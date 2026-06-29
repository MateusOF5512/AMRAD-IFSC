import { useState } from 'react'
import { UserStatus } from '@/lib/types/admin'
import { adminApi } from '@/lib/api'
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { AdminSecurityConfirmModal } from './AdminSecurityConfirmModal'

interface UpdateStatusFormProps {
  onStatusUpdate?: () => void
  onDismiss?: () => void
  prefilledEmail?: string
}

const statusOptions: { value: UserStatus; label: string }[] = [
  { value: 'regular', label: 'Regular' },
  { value: 'irregular', label: 'Irregular' },
  { value: 'desativado', label: 'Desativado' },
]

export function UpdateStatusForm({ onStatusUpdate, onDismiss, prefilledEmail }: UpdateStatusFormProps) {
  const [email, setEmail] = useState(prefilledEmail || '')
  const [newStatus, setNewStatus] = useState<UserStatus>('regular')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingStatus, setPendingStatus] = useState<UserStatus>('regular')

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setError('E-mail é obrigatório')
      return false
    }

    if (!email.includes('@')) {
      setError('E-mail inválido')
      return false
    }

    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validate form
    if (!validateForm()) {
      return
    }

    // Validations passed - now validate with backend before requesting password
    setIsLoading(true)

    try {
      // Perform backend validation
      const validationResult = await adminApi.validateStatusChange(email.trim().toLowerCase(), newStatus)
      
      if (validationResult.can_proceed) {
        // Validation passed - open security confirmation modal
        setPendingEmail(email)
        setPendingStatus(newStatus)
        setShowPasswordModal(true)
      } else {
        setError(validationResult.message)
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao validar mudança de status')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordConfirm = async (password: string) => {
    setIsLoading(true)
    setError(null)
    setSuccess(null)

    try {
      // Verify password first
      await adminApi.verifyAdminPassword(password)
      
      // Password verified - now update status (validation already done before opening modal)
      const response = await adminApi.updateUserStatus(pendingEmail.trim().toLowerCase(), pendingStatus)

      if (!response.success) {
        throw new Error(response.message || 'Erro ao atualizar status')
      }

      setSuccess(
        `Status atualizado com sucesso para "${response.new_status}"` +
        (response.old_status ? ` (era ${response.old_status})` : '')
      )

      // Clear form after success
      setTimeout(() => {
        setEmail(prefilledEmail || '')
        setNewStatus('regular')
        setShowPasswordModal(false)
        setPendingEmail('')
        setPendingStatus('regular')
        onStatusUpdate?.()
      }, 1500)
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar status')
      setShowPasswordModal(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4 border-2 border-orange-300">
        {/* Info Box - Requisitos */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-orange-800">
            ℹ️ <strong>Altere o status de qualquer usuário</strong> de forma manual. Status: Regular, Irregular ou Desativado. A mudança entra em vigor imediatamente.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-800">Erro</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">Sucesso</p>
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              E-mail do Usuário <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              placeholder="exemplo@instituicao.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
              Novo Status <span className="text-red-500">*</span>
            </label>
            <select
              id="status"
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value as UserStatus)}
              disabled={isLoading}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 transition-colors font-medium flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Atualizando...
              </>
            ) : (
              'Atualizar Status'
            )}
          </button>
        </form>
      </div>

      {/* Security Confirmation Modal */}
      <AdminSecurityConfirmModal
        isOpen={showPasswordModal}
        onConfirm={handlePasswordConfirm}
        onCancel={() => {
          setShowPasswordModal(false)
          setPendingEmail('')
          setPendingStatus('regular')
        }}
        actionDescription={`Você está alterando o status de ${pendingEmail} para ${statusOptions.find(o => o.value === pendingStatus)?.label}. Esta é uma ação sensível que será registrada nos logs de auditoria do sistema.`}
        isLoading={isLoading}
      />
    </>
  )
}
