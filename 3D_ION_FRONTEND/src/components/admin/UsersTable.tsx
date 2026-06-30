import { AdminUser, UserStatus } from '@/lib/types/admin'
import { TableDateCell } from '@/components/ui/TableDateCell'
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
  regular: { bg: 'bg-primary-light', text: 'text-primary', badge: 'bg-primary-muted text-primary' },
  irregular: { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-800' },
  desativado: { bg: 'bg-background', text: 'text-foreground', badge: 'bg-slate-100 text-foreground' },
}

const statusLabelMap: Record<UserStatus, string> = {
  regular: 'Regular',
  irregular: 'Irregular',
  desativado: 'Desativado',
}

export function UsersTable({ users, status, isLoading, error, onStatusChange, onViewDetails }: UsersTableProps) {
  const { t, i18n } = useTranslation()
  const colors = statusColorMap[status]

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-muted">{t('admin.advanced.usersTab.loading')}</p>
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
        <p className="text-muted">{t('usersTable.noUsersFound', { status: statusLabelMap[status] })}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead className="bg-background border-b border-border sticky top-0">
          <tr>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.status')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.name')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.email')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">Role</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">Instituição</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">País</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">Criado em</th>
            <th className="px-3 sm:px-4 py-3 text-center font-semibold text-foreground uppercase tracking-wider">Experimentos</th>
            <th className="px-3 sm:px-4 py-3 text-center font-semibold text-foreground uppercase tracking-wider">Detalhes</th>
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
              <td className="px-3 sm:px-4 py-3 text-foreground">{user.name}</td>
              <td className="px-3 sm:px-4 py-3 text-muted truncate max-w-xs">
                {user.email || '-'}
              </td>
              <td className="px-3 sm:px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  user.user_type === 'admin'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {user.user_type === 'admin' ? '🔐 Admin' : '👤 Pesquisador'}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-muted truncate max-w-xs">{user.institution || '-'}</td>
              <td className="px-3 sm:px-4 py-3 text-muted whitespace-nowrap">{user.country || '-'}</td>
              <td className="px-3 sm:px-4 py-3">
                <TableDateCell value={user.created_at} />
              </td>
              <td className="px-3 sm:px-4 py-3 text-center font-semibold">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {user.experimentos_criados_total}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onViewDetails?.(user)
                  }}
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-primary-muted hover:bg-green-200 text-primary rounded-lg text-xs font-medium transition-colors"
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
