'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'
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

interface PersonalDataFormProps {
  initialData: {
    name: string
    institution: string
    email: string
    phone_number: string
    instagram?: string
    country?: string
    language?: string
  }
  onSubmit: (data: any) => Promise<void>
  isLoading?: boolean
}

export function PersonalDataForm({ initialData, onSubmit, isLoading = false }: PersonalDataFormProps) {
  const { t } = useTranslation()
  const [formData, setFormData] = useState<any>(initialData)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [formLoading, setFormLoading] = useState(false)

  useEffect(() => {
    const newFormData = {
      name: initialData.name || '',
      institution: initialData.institution || '',
      email: initialData.email || '',
      phone_number: initialData.phone_number || '',
      instagram: initialData.instagram || '',
      country: initialData.country || '',
      language: initialData.language || ''
    }
    setFormData(newFormData)
  }, [initialData])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev: typeof formData) => ({
      ...prev,
      [name]: value
    }))
  }

  const validateFormData = () => {
    if (!formData.country) {
      setMessage({ type: 'error', text: t('settings.personalData.errors.countryRequired') })
      return false
    }
    if (!formData.language) {
      setMessage({ type: 'error', text: t('settings.personalData.errors.languageRequired') })
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setMessage(null)

    if (!validateFormData()) {
      return
    }

    setFormLoading(true)
    try {
      await onSubmit({ ...formData })

      setMessage({ type: 'success', text: t('settings.personalData.success') })

      const userData = localStorage.getItem('user')
      if (userData) {
        const user = JSON.parse(userData)
        localStorage.setItem('user', JSON.stringify({
          ...user,
          name: formData.name,
          institution: formData.institution,
          country: formData.country,
          language: formData.language,
          phone_number: formData.phone_number,
          instagram: formData.instagram
        }))
        window.dispatchEvent(new Event('userUpdated'))
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message || t('settings.personalData.errors.updateError')
      })
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name Field */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-foreground mb-2">
          {t('settings.personalData.fields.fullName')}
        </label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary/40 focus:border-transparent outline-none"
        />
      </div>

      {/* Institution Field */}
      <div>
        <label htmlFor="institution" className="block text-sm font-medium text-foreground mb-2">
          {t('settings.personalData.fields.institution')}
        </label>
        <input
          type="text"
          id="institution"
          name="institution"
          value={formData.institution}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary/40 focus:border-transparent outline-none"
        />
      </div>

      {/* Email Field (Read-only) */}
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
          {t('settings.personalData.fields.email')}
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          disabled
          className="w-full px-4 py-2 border border-border rounded-lg bg-slate-100 cursor-not-allowed"
        />
        <p className="text-xs text-muted mt-1">{t('settings.personalData.emailNote')}</p>
      </div>

      {/* Phone Number Field */}
      <div>
        <label htmlFor="phone_number" className="block text-sm font-medium text-foreground mb-2">
          {t('settings.personalData.fields.phone')}
        </label>
        <input
          type="tel"
          id="phone_number"
          name="phone_number"
          value={formData.phone_number}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary/40 focus:border-transparent outline-none"
        />
      </div>

      {/* Instagram Field */}
      <div>
        <label htmlFor="instagram" className="block text-sm font-medium text-foreground mb-2">
          {t('settings.personalData.fields.instagram')}
        </label>
        <input
          type="text"
          id="instagram"
          name="instagram"
          value={formData.instagram || ''}
          onChange={handleInputChange}
          placeholder="@seuinstagram"
          className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary/40 focus:border-transparent outline-none"
        />
      </div>

      {/* País e Idioma - 2 colunas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Country Field */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-foreground mb-2">
            {t('settings.personalData.country')}
          </label>
          <select
            id="country"
            name="country"
            value={formData.country || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary/40 focus:border-transparent outline-none"
            required
          >
            <option value="">{t('settings.personalData.selectCountry')}</option>
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {t(c.key)}
              </option>
            ))}
          </select>
        </div>

        {/* Language Field */}
        <div>
          <label htmlFor="language" className="block text-sm font-medium text-foreground mb-2">
            {t('settings.personalData.fields.language')}
          </label>
          <select
            id="language"
            name="language"
            value={formData.language || ''}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-border rounded-lg focus:ring-primary/40 focus:border-transparent outline-none"
            required
          >
            <option value="">{t('settings.personalData.selectLanguage')}</option>
            {LANGUAGE_OPTIONS.map((l) => (
              <option key={l.value} value={l.value}>
                {t(l.key)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className={`flex items-center gap-2 p-4 rounded-lg ${
          message.type === 'success'
            ? 'bg-primary-light text-primary'
            : 'bg-red-50 text-red-700'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex gap-4">
        <button
          type="submit"
          disabled={isLoading || formLoading}
          className="px-6 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading || formLoading ? t('common.saving') : t('settings.personalData.saveButton')}
        </button>
      </div>
    </form>
  )
}
