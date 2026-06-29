import { AdminUser, UserStatus } from '@/lib/types/admin'
import { formatDateTime, formatDateTimeByLanguage } from '@/lib/utils'
import { Badge, Eye } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface UsersTableProps {
  users: AdminUser[]
  status: UserStatus
  isLoading: boolean
  error?: string | null
  onStatusChange?: (user: AdminUser) => void
  onViewDetails?: (user: AdminUser) => void
}

const statusColorMap: Record<UserStatus, { bg: string; text: string; badge: string }> = {
  regular: { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-green-100 text-green-800' },
  irregular: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
  desativado: { bg: 'bg-gray-50', text: 'text-gray-700', badge: 'bg-gray-100 text-gray-800' },
}

const statusLabelMap: Record<UserStatus, string> = {
  regular: 'Regular',
  irregular: 'Irregular',
  desativado: 'Desativado',
}

export function UsersTable({ users, status, isLoading, error, onStatusChange, onViewDetails }: UsersTableProps) {
  const { t, i18n } = useTranslation()
  const colors = statusColorMap[status]

  // DEBUG: Log exatamente o que foi recebido
  console.log(`[UsersTable-${status}] Received ${users.length} users`)
  if (users.length > 0) {
    console.log(`[UsersTable-${status}] First user:`, users[0])
    console.log(`[UsersTable-${status}] First user user_type:`, users[0].user_type)
    console.log(`[UsersTable-${status}] Type of user_type:`, typeof users[0].user_type)
    console.log(`[UsersTable-${status}] All users user_type values:`, users.map(u => ({ name: u.name, user_type: u.user_type })))
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">{t('admin.advanced.usersTab.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
        <div className="flex items-start">
          <div className="shrink-0 text-red-500 font-bold text-lg">⚠</div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">{t('common.error')}</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
            <p className="text-xs text-red-600 mt-2">
              {t('usersTable.backendUnavailable')}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('usersTable.noUsersFound', { status: statusLabelMap[status] })}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
          <tr>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.status')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.name')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.email')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Role</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Instituição</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">País</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">Criado em</th>
            <th className="px-3 sm:px-4 py-3 text-center font-semibold text-gray-700 uppercase tracking-wider">Experimentos</th>
            <th className="px-3 sm:px-4 py-3 text-center font-semibold text-gray-700 uppercase tracking-wider">Detalhes</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr
              key={user.id}
              className="transition hover:bg-blue-50 cursor-pointer font-medium"
              onClick={() => onStatusChange?.(user)}
              title="Clique para alterar status"
            >
              <td className="px-3 sm:px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colors.badge}`}>
                  {statusLabelMap[user.status]}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-gray-900">{user.name}</td>
              <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                {user.email || '-'}
              </td>
              <td className="px-3 sm:px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  user.user_type === 'admin'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {(() => {
                    console.log(`[UsersTable RENDER] User: ${user.name}, user_type: "${user.user_type}", equals 'admin': ${user.user_type === 'admin'}`)
                    return user.user_type === 'admin' ? '🔐 Admin' : '👤 Pesquisador'
                  })()}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">{user.institution || '-'}</td>
              <td className="px-3 sm:px-4 py-3 text-gray-600 whitespace-nowrap">{user.country || '-'}</td>
              <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                {formatDateTimeByLanguage(user.created_at, i18n.language)}
              </td>
              <td className="px-3 sm:px-4 py-3 text-center font-semibold">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {(() => {
                    const value = user.experimentos_criados_total
                    console.log(`[UsersTable RENDER] User: ${user.name}, experimentos_criados_total: ${value}, type: ${typeof value}`)
                    return value
                  })()}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewDetails?.(user)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors"
                  title="Ver detalhes"
                >
                  <Eye className="h-4 w-4" />
                  Ver
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
