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
  // DEBUG: Log the data received
  console.log('[AdminsTable] Received admins:', admins)
  if (admins.length > 0) {
    console.log('[AdminsTable] First admin:', admins[0])
    console.log('[AdminsTable] First admin experimentos_criados_total:', admins[0].experimentos_criados_total)
    console.log('[AdminsTable] Type of experimentos_criados_total:', typeof admins[0].experimentos_criados_total)
  }

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">{t('admin.advanced.adminsTab.loading')}</p>
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
        <p className="text-gray-500">{t('admin.advanced.adminsTab.noAdminsFound')}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs sm:text-sm">
        <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
          <tr>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.name')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.email')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.role')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.institution')}</th>
            <th className="px-3 sm:px-4 py-3 text-center font-semibold text-gray-700 uppercase tracking-wider">{t('admin.advanced.adminsTab.experiments')}</th>
            <th className="px-3 sm:px-4 py-3 text-left font-semibold text-gray-700 uppercase tracking-wider">{t('common.createdAt')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {admins.map((admin) => (
            <tr
              key={admin.id}
              className="transition hover:bg-blue-50"
            >
              <td className="px-3 sm:px-4 py-3 font-medium text-gray-900">
                {admin.name}
              </td>
              <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
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
              <td className="px-3 sm:px-4 py-3 text-gray-600 truncate max-w-xs">
                {admin.institution || '-'}
              </td>
              <td className="px-3 sm:px-4 py-3 text-center font-semibold">
                <span className="inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                  {(() => {
                    const value = admin.experimentos_criados_total
                    console.log(`[AdminsTable RENDER] Admin: ${admin.name}, experimentos_criados_total: ${value}, type: ${typeof value}`)
                    return value ?? 'N/A'
                  })()}
                </span>
              </td>
              <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs whitespace-nowrap">
                {formatDateTimeByLanguage(admin.created_at, i18n.language)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
