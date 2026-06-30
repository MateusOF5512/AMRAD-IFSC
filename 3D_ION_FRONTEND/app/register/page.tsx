'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { Card, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'

function RegisterContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTranslation()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const oauthError = searchParams.get('error')

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      router.push('/experimentos')
    } else {
      setIsCheckingAuth(false)
    }
  }, [router])

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <BrandLogo className="h-14" priority />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {t('auth.register.title')}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t('auth.google.registerSubtitle')}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6">
            {oauthError && (
              <Alert variant="danger">{t('auth.google.errors.loginFailed')}</Alert>
            )}

            <GoogleSignInButton mode="register" />

            <p className="text-center text-xs text-muted">
              {t('auth.google.registerNote')}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm">
          <span className="text-muted">{t('auth.register.alreadyHaveAccount')}</span>{' '}
          <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
            {t('auth.register.signIn')}
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  )
}
