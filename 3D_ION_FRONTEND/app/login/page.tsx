'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'
import { BrandLogo } from '@/components/layout/BrandLogo'
import { Card, CardContent } from '@/components/ui/Card'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

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
            {t('auth.login.title')}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {t('auth.google.loginSubtitle')}
          </p>
        </div>

        <Card>
          <CardContent className="space-y-6">
            <GoogleSignInButton mode="login" />
            <p className="text-center text-xs text-muted">
              {t('auth.google.secureSessionNote')}
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm">
          <span className="text-muted">{t('auth.login.noAccount')}</span>{' '}
          <Link href="/register" className="font-medium text-primary hover:text-primary-hover">
            {t('auth.login.registerLink')}
          </Link>
        </p>
      </div>
    </div>
  )
}
