'use client'

import { useState } from 'react'
import { Eye, EyeOff, AlertTriangle, Loader2 } from 'lucide-react'

interface AdminSecurityConfirmModalProps {
  isOpen: boolean
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
  actionDescription: string
  isLoading?: boolean
}

export function AdminSecurityConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  actionDescription,
  isLoading = false
}: AdminSecurityConfirmModalProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault?.()
    setError(null)
    setSuccess(false)

    if (!password) {
      setError('Senha é obrigatória')
      return
    }

    setLoading(true)
    try {
      await onConfirm(password)
      setSuccess(true)
      // Limpar após sucesso
      setTimeout(() => {
        setPassword('')
        setShowPassword(false)
        setError(null)
        setSuccess(false)
      }, 1000)
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar senha')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading && !loading) {
      handleSubmit(e as any)
    }
  }

  const handleCancel = () => {
    setPassword('')
    setShowPassword(false)
    setError(null)
    setSuccess(false)
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-surface rounded-lg shadow-2xl max-w-md w-full overflow-hidden border border-orange-200">
        {/* Orange Header */}
        <div className="bg-linear-to-r from-orange-500 to-orange-600 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-400 bg-opacity-30 p-2 rounded-full">
              <AlertTriangle className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Confirmação de Segurança</h2>
              <p className="text-xs text-orange-100">Área restrita - autenticação obrigatória</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-4">
          {/* Warning Box */}
          <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded-sm">
            <p className="text-sm text-orange-800 font-medium">
              Ação Sensível Detectada
            </p>
            <p className="text-xs text-orange-700 mt-1">
              {actionDescription}
            </p>
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="admin-password" className="block text-sm font-semibold text-foreground mb-2">
              Digite a senha de administração para confirmar
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="admin-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || loading}
                placeholder="Senha de administração"
                className="w-full px-4 py-2 pr-10 border-2 border-border rounded-lg focus:ring-orange-500 focus:border-orange-500 outline-none disabled:bg-slate-100 disabled:cursor-not-allowed transition-colors"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || loading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-orange-600 disabled:cursor-not-allowed transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-sm">
              <p className="text-red-700 text-sm font-medium">Erro</p>
              <p className="text-red-600 text-xs mt-1">{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="bg-primary-light border-l-4 border-primary p-3 rounded-sm">
              <p className="text-primary text-sm font-medium">✓ Confirmado com sucesso</p>
            </div>
          )}

          {/* Info Tip */}
          <div className="bg-background border border-border rounded p-3">
            <p className="text-xs text-muted">
              Por segurança, ações sensíveis exigem a senha de administração configurada no sistema.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-background px-6 py-4 flex gap-3 border-t border-border">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isLoading || loading}
            className="flex-1 px-4 py-2 border-2 border-border rounded-lg text-foreground hover:bg-slate-100 disabled:bg-slate-100 disabled:cursor-not-allowed font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || loading || !password}
            className="flex-1 px-4 py-2 bg-linear-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2 transition-all"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? 'Confirmando...' : 'Confirmar Ação'}
          </button>
        </div>
      </div>
    </div>
  )
}
