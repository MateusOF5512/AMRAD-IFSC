'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

// Country options: value = stable backend key (Portuguese), key = i18n translation key
const COUNTRY_OPTIONS: { value: string; key: string }[] = [
  { value: 'Brasil', key: 'countries.brasil' },
  { value: 'Portugal', key: 'countries.portugal' },
  { value: 'Angola', key: 'countries.angola' },
  { value: 'Moçambique', key: 'countries.mozambique' },
  { value: 'Cabo Verde', key: 'countries.capeVerde' },
  { value: 'Timor-Leste', key: 'countries.timorLeste' },
  { value: 'Guiné-Bissau', key: 'countries.guineaBissau' },
  { value: 'São Tomé e Príncipe', key: 'countries.saoTomePrincipe' },
  { value: 'Estados Unidos', key: 'countries.unitedStates' },
  { value: 'Canada', key: 'countries.canada' },
  { value: 'Reino Unido', key: 'countries.unitedKingdom' },
  { value: 'Irlanda', key: 'countries.ireland' },
  { value: 'Alemanha', key: 'countries.germany' },
  { value: 'França', key: 'countries.france' },
  { value: 'Itália', key: 'countries.italy' },
  { value: 'Espanha', key: 'countries.spain' },
  { value: 'Suécia', key: 'countries.sweden' },
  { value: 'Noruega', key: 'countries.norway' },
  { value: 'Dinamarca', key: 'countries.denmark' },
  { value: 'Holanda', key: 'countries.netherlands' },
  { value: 'Bélgica', key: 'countries.belgium' },
  { value: 'Suíça', key: 'countries.switzerland' },
  { value: 'Áustria', key: 'countries.austria' },
  { value: 'Polônia', key: 'countries.poland' },
  { value: 'República Checa', key: 'countries.czechRepublic' },
  { value: 'Hungria', key: 'countries.hungary' },
  { value: 'Romênia', key: 'countries.romania' },
  { value: 'Grécia', key: 'countries.greece' },
  { value: 'Turquia', key: 'countries.turkey' },
  { value: 'Rússia', key: 'countries.russia' },
  { value: 'Ucrânia', key: 'countries.ukraine' },
  { value: 'Japão', key: 'countries.japan' },
  { value: 'China', key: 'countries.china' },
  { value: 'Índia', key: 'countries.india' },
  { value: 'Cingapura', key: 'countries.singapore' },
  { value: 'Austrália', key: 'countries.australia' },
  { value: 'Nova Zelândia', key: 'countries.newZealand' },
  { value: 'México', key: 'countries.mexico' },
  { value: 'Argentina', key: 'countries.argentina' },
  { value: 'Chile', key: 'countries.chile' },
  { value: 'Colômbia', key: 'countries.colombia' },
  { value: 'Peru', key: 'countries.peru' },
  { value: 'Vietnã', key: 'countries.vietnam' },
  { value: 'Tailândia', key: 'countries.thailand' },
  { value: 'Malásia', key: 'countries.malaysia' },
  { value: 'Indonésia', key: 'countries.indonesia' },
  { value: 'Filipinas', key: 'countries.philippines' },
  { value: 'Outros', key: 'countries.other' },
]

// Language options: value = stable backend key
const LANGUAGE_OPTIONS: { value: string; key: string }[] = [
  { value: 'Português', key: 'languages.portuguese' },
  { value: 'Inglês', key: 'languages.english' },
]

export default function RegisterPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)
  const [formData, setFormData] = useState({
    name: '',
    institution: '',
    email: '',
    phone_number: '',
    instagram: '',
    country: '',
    language: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    // Validations
    if (!formData.name.trim()) {
      setError(t('auth.register.errors.nameRequired'))
      return
    }

    if (!formData.institution.trim()) {
      setError(t('auth.register.errors.institutionRequired'))
      return
    }

    if (!formData.email.includes('@')) {
      setError(t('auth.register.errors.invalidEmail'))
      return
    }

    if (!formData.phone_number || formData.phone_number.length < 8) {
      setError(t('auth.register.errors.invalidPhone'))
      return
    }

    if (!formData.phone_number.match(/^\d+$/)) {
      setError(t('auth.register.errors.phoneNumbersOnly'))
      return
    }

    if (formData.password.length < 8) {
      setError(t('auth.register.errors.passwordMin'))
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.register.errors.passwordMismatch'))
      return
    }

    if (!formData.country) {
      setError(t('auth.register.errors.countryRequired'))
      return
    }

    if (!formData.language) {
      setError(t('auth.register.errors.languageRequired'))
      return
    }

    setLoading(true)

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          institution: formData.institution.trim(),
          email: formData.email.trim().toLowerCase(),
          phone_number: formData.phone_number.trim(),
          password: formData.password,
          instagram: formData.instagram.trim() || undefined,
          country: formData.country.trim() || undefined,
          language: formData.language.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || t('auth.register.errors.createError'))
      }

      setSuccess(t('auth.register.success'))
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err: any) {
      setError(err.message || t('auth.register.errors.createErrorRetry'))
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
            {t('auth.register.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth.register.subtitle')}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleRegister}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Nome Completo */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t('auth.register.fullName')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={formData.name}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.register.placeholders.fullName')}
              />
            </div>

            {/* Instituição */}
            <div>
              <label htmlFor="institution" className="block text-sm font-medium text-gray-700">
                {t('auth.register.institution')}
              </label>
              <input
                id="institution"
                name="institution"
                type="text"
                required
                value={formData.institution}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.register.placeholders.institution')}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth.register.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.register.placeholders.email')}
              />
            </div>

            {/* Telefone */}
            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700">
                {t('auth.register.phone')}
              </label>
              <input
                id="phone_number"
                name="phone_number"
                type="tel"
                required
                value={formData.phone_number}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.register.placeholders.phone')}
              />
            </div>

            {/* Instagram (Opcional) */}
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700">
                {t('auth.register.instagram')}
              </label>
              <input
                id="instagram"
                name="instagram"
                type="text"
                value={formData.instagram}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.register.placeholders.instagram')}
              />
            </div>

            {/* País e Idioma - 2 colunas */}
            <div className="grid grid-cols-2 gap-4">
              {/* País */}
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700">
                  {t('auth.register.country')}
                </label>
                <select
                  id="country"
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                  required
                >
                  <option value="">{t('auth.register.placeholders.selectCountry')}</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {t(c.key)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Idioma */}
              <div>
                <label htmlFor="language" className="block text-sm font-medium text-gray-700">
                  {t('auth.register.language')}
                </label>
                <select
                  id="language"
                  name="language"
                  value={formData.language}
                  onChange={handleChange}
                  className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                  required
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

            {/* Senha */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth.register.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.register.placeholders.password')}
              />
            </div>

            {/* Confirmar Senha */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth.register.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-0 px-3 py-2 text-gray-900 ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-600 sm:text-sm sm:leading-6"
                placeholder={t('auth.register.placeholders.confirmPassword')}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 disabled:opacity-50"
          >
            {loading ? t('auth.register.creating') : t('auth.register.createButton')}
          </button>

          <p className="text-center text-sm text-gray-600">
            {t('auth.register.alreadyHaveAccount')}
            <Link href="/login" className="font-semibold text-green-600 hover:text-green-500">
              {t('auth.register.signIn')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
