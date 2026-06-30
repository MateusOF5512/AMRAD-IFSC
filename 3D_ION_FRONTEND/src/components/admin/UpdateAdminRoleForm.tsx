'use client'

import { AdminInfo, UserRole } from '@/lib/types/admin'
import { useState, useEffect } from 'react'
import { AdminSecurityConfirmModal } from './AdminSecurityConfirmModal'
import { adminApi } from '@/lib/api'

interface UpdateAdminRoleFormProps {
  admin?: AdminInfo | null
  onSubmit: (email: string, newRole: UserRole, password: string) => Promise<void>
  isLoading?: boolean
  onSuccess?: () => void
}

export function UpdateAdminRoleForm({
  admin,
  onSubmit,
  isLoading = false,
  onSuccess,
}: UpdateAdminRoleFormProps) {
  const [email, setEmail] = useState(admin?.email || '')
  const [newRole, setNewRole] = useState<UserRole>(admin?.user_type === 'admin' ? 'pesquisador' : 'admin')
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning'; text: string } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [pendingRole, setPendingRole] = useState<UserRole>('admin')

  // Se admin for selecionado, definir email e novo role
  useEffect(() => {
    if (admin) {
      setEmail(admin.email)
      // Quando há um admin selecionado, o novo role é o oposto do atual
      setNewRole(admin.user_type === 'admin' ? 'pesquisador' : 'admin')
    }
  }, [admin])

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setMessage({ type: 'error', text: 'Por favor, insira um e-mail' })
      return false
    }

    // Se editando um admin, impedir mudar para o mesmo role
    if (admin && admin.user_type === newRole) {
      setMessage({ 
        type: 'error', 
        text: `O usuário já possui o role '${admin.user_type === 'admin' ? 'Admin' : 'Pesquisador'}'. Nenhuma mudança foi necessária.` 
      })
      return false
    }

    return true
  }

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      return
    }

    // Validations passed - now validate with backend before requesting password
    setIsSubmitting(true)
    setMessage(null)

    try {
      // Perform backend validation
      const validationResult = await adminApi.validateAdminRoleChange(email, newRole)
      
      if (validationResult.can_proceed) {
        // Validation passed - open security confirmation modal
        setPendingEmail(email)
        setPendingRole(newRole)
        setShowPasswordModal(true)
      } else {
        setMessage({
          type: 'warning',
          text: validationResult.message
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao validar mudança'
      
      // Treat as warning: conflicts (409), status validation (400), permission denied (403), not found (404)
      if (errorMessage.includes('já possui') || 
          errorMessage.includes('Conflito') ||
          errorMessage.includes('status') ||
          errorMessage.includes('permissão') ||
          errorMessage.includes('não pode remover') ||
          errorMessage.includes('não encontrado') ||
          errorMessage.includes('não existe') ||
          errorMessage.includes('não cadastrado') ||
          errorMessage.includes('rebaixar') ||
          errorMessage.includes('próprias permissões') ||
          errorMessage.includes('promover a si mesmo')) {
        setMessage({
          type: 'warning',
          text: errorMessage
        })
      } else {
        setMessage({
          type: 'error',
          text: errorMessage
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordConfirm = async (password: string) => {
    setIsSubmitting(true)
    setMessage(null)

    try {
      await onSubmit(pendingEmail, pendingRole, password)
      
      setMessage({ type: 'success', text: 'Role atualizado com sucesso! O usuário assumirá o novo papel ao fazer login novamente.' })
      
      // Reset form if not editing a specific admin
      if (!admin) {
        setEmail('')
        setNewRole('admin')
      }
      
      // Fechar modal e limpar
      setShowPasswordModal(false)
      setPendingEmail('')
      setPendingRole('admin')
      
      onSuccess?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao atualizar role'
      
      // Tratar como warning: conflitos (409), validação de status (400), permissão negada (403), não encontrado (404)
      if (errorMessage.includes('já possui') || 
          errorMessage.includes('Conflito') ||
          errorMessage.includes('status') ||
          errorMessage.includes('permissão') ||
          errorMessage.includes('não pode remover') ||
          errorMessage.includes('não encontrado') ||
          errorMessage.includes('não existe') ||
          errorMessage.includes('não cadastrado') ||
          errorMessage.includes('rebaixar') ||
          errorMessage.includes('próprias permissões') ||
          errorMessage.includes('promover a si mesmo')) {
        setMessage({
          type: 'warning',
          text: errorMessage
        })
      } else {
        setMessage({
          type: 'error',
          text: errorMessage
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }


  const isEditingExistingAdmin = !!admin
  const isPromotingToAdmin = newRole === 'admin'
  const isSameRole = admin && admin.user_type === newRole

  return (
    <>
      <form onSubmit={handleFormSubmit} className="space-y-4 bg-surface p-6 rounded-lg border-2 border-orange-300">
        {/* Info Box - Requisitos */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-orange-800">
            ℹ️ <strong>Todo usuário é pesquisador por padrão.</strong> Apenas um administrador autenticado, com senha de confirmação, pode promover outro usuário regular a administrador. Ninguém pode se promover sozinho.
          </p>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
            E-mail <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isSubmitting}
            placeholder="usuario@dominio.com"
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
          <p className="text-xs text-muted mt-1">Digite o e-mail do pesquisador que deseja promover a administrador</p>
        </div>

        <div>
          <label htmlFor="role" className="block text-sm font-medium text-foreground mb-2">
            Novo Role <span className="text-red-500">*</span>
            {isEditingExistingAdmin && (
              <span className="text-muted text-xs ml-2">
                (Atual: {admin?.user_type === 'admin' ? 'Admin' : 'Pesquisador'})
              </span>
            )}
          </label>
          <select
            id="role"
            value={newRole}
            onChange={(e) => setNewRole(e.target.value as UserRole)}
            disabled={isSubmitting}
            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-slate-200 disabled:text-muted"
          >
            <option value="pesquisador">🔎 Pesquisador</option>
            <option value="admin">💼 Administrador</option>
          </select>
          {isSameRole && (
            <p className="text-xs text-red-600 mt-1">⚠️ O usuário já possui este role</p>
          )}
        </div>

        {message && (
          <div
            className={`p-3 rounded-lg text-sm ${
              message.type === 'success'
                ? 'bg-primary-light text-primary border border-primary/30'
                : message.type === 'warning'
                ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.type === 'success' ? '✓ ' : message.type === 'warning' ? '⚠️ ' : '✗ '}
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || Boolean(isLoading) || !!isSameRole}
          className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Processando...' : isEditingExistingAdmin ? 'Confirmar Alteração' : 'Adicionar como Admin'}
        </button>
      </form>

      {/* Security Confirmation Modal */}
      <AdminSecurityConfirmModal
        isOpen={showPasswordModal}
        onConfirm={handlePasswordConfirm}
        onCancel={() => {
          setShowPasswordModal(false)
          setPendingEmail('')
          setPendingRole('admin')
        }}
        actionDescription={`Você está alterando as permissões de ${pendingEmail} para ${pendingRole === 'admin' ? 'Administrador' : 'Pesquisador'}. Esta é uma ação sensível que será registrada nos logs de auditoria.`}
        isLoading={isSubmitting}
      />
    </>
  )
}
