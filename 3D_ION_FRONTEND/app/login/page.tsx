'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/authStore'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function LoginPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const setUser = useAuthStore((state) => state.setUser)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  // Verificar se já está autenticado (verifica localStorage)
  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      // Já está logado, redireciona para experimentos
      router.push('/experimentos')
    } else {
      setIsCheckingAuth(false)
    }
  }, [router])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email.trim()) {
      setError(t('auth.login.errors.emailRequired'))
      return
    }

    if (!password) {
      setError(t('auth.login.errors.passwordRequired'))
      return
    }

    setLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email_or_instagram: email.trim().toLowerCase(),
          password: password,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || t('auth.login.errors.invalidCredentials'))
      }

      // Ensure we have a token in the response
      if (!data.access_token && !data.token) {
        throw new Error(t('auth.login.errors.invalidResponse'))
      }

      // Store user info in both localStorage AND Zustand store
      localStorage.setItem('user', JSON.stringify(data))
      setUser(data)
      
      // Dispatch event to notify other components (e.g., Header)
      window.dispatchEvent(new Event('userLoggedIn'))
      
      // Small delay to ensure localStorage is synced
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Redirect to experiments
      router.push('/experimentos')
    } catch (err: any) {
      setError(err.message || t('auth.login.errors.loginError'))
    } finally {
      setLoading(false)
    }
  }

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            {t('auth.login.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.login.subtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="-space-y-px rounded-md shadow-sm">
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.login.emailOrInstagram')}
              </label>
              <input
                id="email"
                name="email"
                type="text"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="relative block w-full rounded-t-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.login.emailOrInstagram')}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('auth.login.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="relative block w-full rounded-b-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:z-10 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.login.password')}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
            >
              {loading ? t('auth.login.loggingIn') : t('auth.login.loginButton')}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">{t('auth.login.noAccount')}</span>
            <Link
              href="/register"
              className="font-medium text-green-600 hover:text-green-500"
            >
              {t('auth.login.registerLink')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
