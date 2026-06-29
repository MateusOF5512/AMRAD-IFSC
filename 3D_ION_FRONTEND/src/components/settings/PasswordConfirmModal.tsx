'use client'

import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface PasswordConfirmModalProps {
  isOpen: boolean
  onConfirm: (password: string) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  errorMessage?: string
}

export function PasswordConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  isLoading = false,
  errorMessage
}: PasswordConfirmModalProps) {
  const { t } = useTranslation()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent) => {
    e.preventDefault?.()
    setError(null)

    if (!password) {
      setError(t('settings.passwordConfirm.errors.required'))
      return
    }

    setLoading(true)
    try {
      await onConfirm(password)
      setPassword('')
      setShowPassword(false)
    } catch (err: any) {
      setError(err.message || t('settings.passwordConfirm.errors.confirmError'))
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
    onCancel()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-green-100 p-2 rounded-full">
            <Lock className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900">{t('settings.passwordConfirm.title')}</h2>
        </div>

        <p className="text-gray-600 text-sm mb-6">
          {t('settings.passwordConfirm.description')}
        </p>

        <div className="space-y-4">
          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-2">
              {t('settings.passwordConfirm.label')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                id="confirm-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading || loading}
                placeholder={t('settings.passwordConfirm.placeholder')}
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || loading}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 rounded p-3">
              <p className="text-red-700 text-sm">{errorMessage}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isLoading || loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed font-medium"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || loading}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
            >
              {loading ? t('settings.passwordConfirm.confirming') : t('common.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
