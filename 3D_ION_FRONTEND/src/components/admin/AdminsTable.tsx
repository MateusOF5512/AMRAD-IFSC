'use client'

import { AdminInfo } from '@/lib/types/admin'
import { formatDateTime, formatDateTimeByLanguage } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface AdminsTableProps {
  admins: AdminInfo[]
  isLoading: boolean
  error?: string | null
}

export function AdminsTable({ admins, isLoading, error }: AdminsTableProps) {
  const { t, i18n } = useTranslation()

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-muted">{t('admin.advanced.adminsTab.loading')}</p>
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
          </div>
        </div>
      </div>
    )
  }

  if (admins.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted">{t('admin.advanced.adminsTab.noAdminsFound')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead className="bg-background border-b border-border sticky top-0">
          <tr>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.name')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.email')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.role')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.institution')}</th>
            <th className="px-3 sm:px-4 py-3 text-center font-semibold text-foreground uppercase tracking-wider">{t('admin.advanced.adminsTab.experiments')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-foreground uppercase tracking-wider">{t('common.createdAt')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {admins.map((admin) => (
            <tr
              key={admin.id}
              className="transition hover:bg-blue-50"
            >
              <td className="px-3 sm:px-4 py-3 font-medium text-foreground">
                {admin.name}
              </td>
              <td className="px-3 sm:px-4 py-3 text-muted truncate max-w-xs">
                {admin.email}
              </td>
              <td className="px-3 sm:px-4 py-3">
                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  admin.user_type === 'admin'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {admin.user_type === 'admin' ? '🔐 Admin' : '👤 Pesquisador'}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-muted truncate max-w-xs">
                {admin.institution || '-'}
              </td>
              <td className="px-3 sm:px-4 py-3 text-center font-semibold">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {admin.experimentos_criados_total ?? 'N/A'}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-muted text-xs whitespace-nowrap">
                {formatDateTimeByLanguage(admin.created_at, i18n.language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
