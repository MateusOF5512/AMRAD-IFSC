'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Sprout, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { adminApi } from '@/lib/api'
import { AdminSecurityConfirmModal } from './AdminSecurityConfirmModal'

interface DatabaseDangerZoneProps {
  onDataChanged?: () => void
}

export function DatabaseDangerZone({ onDataChanged }: DatabaseDangerZoneProps) {
  const { t } = useTranslation()
  const [rowCount, setRowCount] = useState(0)
  const [statusLoading, setStatusLoading] = useState(true)
  const [isTruncating, setIsTruncating] = useState(false)
  const [isSeeding, setIsSeeding] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const refreshStatus = useCallback(async () => {
    setStatusLoading(true)
    try {
      const status = await adminApi.getDatabaseSeedStatus()
      setRowCount(status.sample_count ?? status.experimental_row_count)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('admin.advanced.databaseTab.dangerZone.statusError')
      setFeedback({ type: 'error', text: message })
    } finally {
      setStatusLoading(false)
    }
  }, [t])

  useEffect(() => {
    refreshStatus()
  }, [refreshStatus])

  const handleTruncateConfirm = async (password: string) => {
    setIsTruncating(true)
    setFeedback(null)
    try {
      await adminApi.truncateExperimentalData(password)
      setFeedback({ type: 'success', text: t('admin.advanced.databaseTab.dangerZone.truncateSuccess') })
      setShowPasswordModal(false)
      await refreshStatus()
      onDataChanged?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('admin.advanced.databaseTab.dangerZone.truncateError')
      throw new Error(message)
    } finally {
      setIsTruncating(false)
    }
  }

  const handleSeed = async () => {
    setIsSeeding(true)
    setFeedback(null)
    try {
      const result = await adminApi.seedExperimentalData()
      setFeedback({
        type: 'success',
        text: result.message || t('admin.advanced.databaseTab.dangerZone.seedSuccess'),
      })
      await refreshStatus()
      onDataChanged?.()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : t('admin.advanced.databaseTab.dangerZone.seedError')
      setFeedback({ type: 'error', text: message })
    } finally {
      setIsSeeding(false)
    }
  }

  const busy = isTruncating || isSeeding

  return (
    <>
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-bold text-red-900 mb-2">
          {t('admin.advanced.databaseTab.dangerZone.truncateCard.title')}
        </h3>
        <p className="text-sm text-red-700 mb-4">
          {t('admin.advanced.databaseTab.dangerZone.truncateCard.description')}
        </p>
        <button
          type="button"
          onClick={() => setShowPasswordModal(true)}
          disabled={busy || statusLoading}
          className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
            busy || statusLoading
              ? 'bg-red-400 cursor-not-allowed'
              : 'bg-red-600 hover:bg-red-700'
          }`}
        >
          {isTruncating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('admin.advanced.databaseTab.dangerZone.truncating')}
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4" />
              {t('admin.advanced.databaseTab.dangerZone.truncateButton')}
            </>
          )}
        </button>
      </div>

      <div className="bg-primary-light border border-primary/30 rounded-lg p-4">
        <h3 className="font-bold text-primary mb-2">
          {t('admin.advanced.databaseTab.dangerZone.seedCard.title')}
        </h3>
        <p className="text-sm text-primary mb-4">
          {t('admin.advanced.databaseTab.dangerZone.seedCard.description')}
        </p>
        {statusLoading ? (
          <p className="text-xs text-primary mb-3 flex items-center gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            {t('admin.advanced.databaseTab.dangerZone.checkingStatus')}
          </p>
        ) : (
          <p className="text-xs text-primary mb-3">
            {t('admin.advanced.databaseTab.dangerZone.recordCount', { count: rowCount })}
          </p>
        )}
        <button
          type="button"
          onClick={handleSeed}
          disabled={busy || statusLoading}
          className={`px-4 py-2 text-white rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
            busy || statusLoading
              ? 'bg-primary/60 cursor-not-allowed'
              : 'bg-primary hover:bg-primary-hover'
          }`}
        >
          {isSeeding ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('admin.advanced.databaseTab.dangerZone.seeding')}
            </>
          ) : (
            <>
              <Sprout className="h-4 w-4" />
              {t('admin.advanced.databaseTab.dangerZone.seedButton')}
            </>
          )}
        </button>
      </div>

      {feedback && (
        <div
          className={`md:col-span-2 p-3 rounded text-sm ${
            feedback.type === 'success' ? 'bg-primary-muted text-primary' : 'bg-red-100 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      <AdminSecurityConfirmModal
        isOpen={showPasswordModal}
        onCancel={() => setShowPasswordModal(false)}
        onConfirm={handleTruncateConfirm}
        isLoading={isTruncating}
        actionDescription={t('admin.advanced.databaseTab.dangerZone.truncateConfirmDescription')}
      />
    </>
  )
}
