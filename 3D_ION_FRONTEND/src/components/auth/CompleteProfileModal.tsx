'use client'

import { useEffect, useState } from 'react'
import { Loader2, UserCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { createClient } from '@/lib/supabase/client'
import {
  completeOAuthProfile,
  persistUserSession,
} from '@/lib/supabase-auth'
import { useAuthStore } from '@/store/authStore'

const COUNTRY_OPTIONS: { value: string; key: string }[] = [
  { value: 'Brasil', key: 'countries.brasil' },
  { value: 'Portugal', key: 'countries.portugal' },
  { value: 'Angola', key: 'countries.angola' },
  { value: 'Moçambique', key: 'countries.mozambique' },
  { value: 'Estados Unidos', key: 'countries.unitedStates' },
  { value: 'Outros', key: 'countries.other' },
]

const LANGUAGE_OPTIONS: { value: string; key: string }[] = [
  { value: 'Português', key: 'languages.portuguese' },
  { value: 'Inglês', key: 'languages.english' },
]

interface CompleteProfileModalProps {
  isOpen: boolean
  onComplete: () => void
}

export function CompleteProfileModal({ isOpen, onComplete }: CompleteProfileModalProps) {
  const { t } = useTranslation()
  const setUser = useAuthStore((state) => state.setUser)
  const user = useAuthStore((state) => state.user)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    institution: '',
    phone_number: '',
    instagram: '',
    country: '',
    language: '',
  })

  useEffect(() => {
    if (!isOpen) return

    const init = async () => {
      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          setError(t('auth.google.errors.noSession'))
          return
        }

        setAccessToken(session.access_token)
        setFormData({
          institution: user?.institution || '',
          phone_number: user?.phone_number || '',
          instagram: user?.instagram || '',
          country: user?.country || '',
          language: user?.language || '',
        })
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t('auth.google.errors.sessionFailed')
        setError(message)
      }
    }

    init()
  }, [isOpen, user, t])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const finishProfile = async (payload: {
    institution?: string
    phone_number?: string
    instagram?: string
    country?: string
    language?: string
  }) => {
    if (!accessToken) {
      setError(t('auth.google.errors.noSession'))
      return
    }

    setSubmitting(true)
    setError(null)

    try {
      const updatedUser = await completeOAuthProfile(accessToken, payload)
      persistUserSession(updatedUser)
      setUser(updatedUser)
      onComplete()
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('auth.register.errors.createErrorRetry')
      setError(message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.phone_number && formData.phone_number.length < 8) {
      setError(t('auth.register.errors.invalidPhone'))
      return
    }
    if (formData.phone_number && !/^\d+$/.test(formData.phone_number)) {
      setError(t('auth.register.errors.phoneNumbersOnly'))
      return
    }

    await finishProfile({
      institution: formData.institution.trim() || undefined,
      phone_number: formData.phone_number.trim() || undefined,
      instagram: formData.instagram.trim() || undefined,
      country: formData.country || undefined,
      language: formData.language || undefined,
    })
  }

  const handleSkip = async () => {
    await finishProfile({})
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="max-h-[92dvh] sm:max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl sm:rounded-lg bg-surface p-4 sm:p-6 shadow-xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-primary-muted p-2">
            <UserCircle className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">
              {t('auth.google.completeProfileTitle')}
            </h2>
            <p className="text-sm text-muted">
              {t('auth.google.completeProfileSubtitle')}
            </p>
          </div>
        </div>

        {user?.name && (
          <p className="mb-4 rounded-md bg-background px-3 py-2 text-sm text-foreground">
            {t('auth.google.welcomeUser', { name: user.name })}
          </p>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div>
            <label htmlFor="modal-institution" className="block text-sm font-medium text-foreground">
              {t('auth.register.institution')} {t('auth.google.optional')}
            </label>
            <input
              id="modal-institution"
              name="institution"
              type="text"
              value={formData.institution}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-foreground ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="modal-phone_number" className="block text-sm font-medium text-foreground">
              {t('auth.register.phone')} {t('auth.google.optional')}
            </label>
            <input
              id="modal-phone_number"
              name="phone_number"
              type="tel"
              value={formData.phone_number}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-foreground ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="modal-instagram" className="block text-sm font-medium text-foreground">
              {t('auth.register.instagram')} {t('auth.google.optional')}
            </label>
            <input
              id="modal-instagram"
              name="instagram"
              type="text"
              value={formData.instagram}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-foreground ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="modal-country" className="block text-sm font-medium text-foreground">
                {t('auth.register.country')} {t('auth.google.optional')}
              </label>
              <select
                id="modal-country"
                name="country"
                value={formData.country}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-foreground ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
              >
                <option value="">{t('auth.register.placeholders.selectCountry')}</option>
                {COUNTRY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {t(c.key)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="modal-language" className="block text-sm font-medium text-foreground">
                {t('auth.register.language')} {t('auth.google.optional')}
              </label>
              <select
                id="modal-language"
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-foreground ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-green-600 sm:text-sm"
              >
                <option value="">{t('auth.register.placeholders.selectLanguage')}</option>
                {LANGUAGE_OPTIONS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {t(l.key)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              disabled={submitting}
              className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-background disabled:opacity-50"
            >
              {t('auth.google.skipForNow')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary-light0 disabled:opacity-50"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('auth.register.creating')}
                </span>
              ) : (
                t('auth.google.saveProfile')
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
