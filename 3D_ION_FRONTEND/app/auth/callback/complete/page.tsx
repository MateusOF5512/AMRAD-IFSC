'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { persistUserSession, syncSessionWithBackend } from '@/lib/supabase-auth'
import { clearAuthStorage } from '@/lib/auth-storage'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'

export default function AuthCallbackCompletePage() {
  const router = useRouter()
  const { t } = useTranslation()
  const setUser = useAuthStore((state) => state.setUser)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const finishLogin = async () => {
      try {
        clearAuthStorage()

        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (!session?.access_token) {
          throw new Error(t('auth.google.errors.noSession'))
        }

        const result = await syncSessionWithBackend(session.access_token)
        persistUserSession(result.user)
        setUser(result.user)
        router.replace('/experimentos')
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : t('auth.google.errors.loginFailed')
        setError(message)
      }
    }

    finishLogin()
  }, [router, setUser, t])

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="text-center text-sm text-red-700">{error}</p>
        <button
          type="button"
          onClick={() => router.push('/login')}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-light0"
        >
          {t('auth.google.backToLogin')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="mt-4 text-sm text-muted">{t('auth.google.completingSignIn')}</p>
      </div>
    </div>
  )
}
