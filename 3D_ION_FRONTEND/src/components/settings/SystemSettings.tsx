'use client'

import { useState } from 'react'
import { Bell, Info } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface SystemSettingsProps {
  initialData: {
    email_notifications: boolean
  }
  onSubmit?: (data: any) => Promise<void>
  isLoading?: boolean
}

export function SystemSettings({ initialData }: SystemSettingsProps) {
  const { t } = useTranslation()
  const [emailNotifications, setEmailNotifications] = useState(initialData.email_notifications)

  const handleToggle = () => {
    setEmailNotifications(!emailNotifications)
  }

  return (
    <div className="space-y-6">
      {/* Email Notifications */}
      <div className="border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="h-5 w-5 text-foreground" />
          <h3 className="text-lg font-semibold text-foreground">{t('settings.system.title')}</h3>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1">
                {t('settings.system.emailNotifications.label')}
              </label>
              <p className="text-sm text-muted">
                {t('settings.system.emailNotifications.description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggle}
                className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors ${
                  emailNotifications
                    ? 'bg-primary'
                    : 'bg-slate-300'
                } cursor-pointer`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-surface transition-transform ${
                    emailNotifications ? 'translate-x-9' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className="text-sm font-medium text-foreground w-12">
                {emailNotifications ? t('settings.system.emailNotifications.active') : t('settings.system.emailNotifications.inactive')}
              </span>
            </div>
          </div>

          {/* Info message when enabled */}
          {emailNotifications && (
            <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  {t('settings.system.emailNotifications.enabledTitle')}
                </p>
                <p className="text-sm text-blue-700">
                  {t('settings.system.emailNotifications.enabledDescription')}
                </p>
                <p className="text-xs text-blue-600 mt-2 italic">
                  {t('settings.system.emailNotifications.betaNote')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
