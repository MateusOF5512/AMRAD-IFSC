'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
import { PersonalDataForm } from '@/components/settings/PersonalDataForm'
import { SystemSettings } from '@/components/settings/SystemSettings'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { getNormalizedApiUrl } from '@/lib/api'
import { useTranslation } from 'react-i18next'
import { logger } from '@/lib/logger'

export default function SettingsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState('personal')
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticating, setIsAuthenticating] = useState(true)

  // Check auth status on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (!storedUser && !user) {
      router.push('/login')
    }
    setIsAuthenticating(false)
  }, [])

  useEffect(() => {
    // Don't fetch if still authenticating or user is not present
    if (isAuthenticating || !user) {
      return
    }

    // Fetch user profile directly from backend API
    const fetchUserProfile = async () => {
      try {
        const token = (user as any).token || (user as any).access_token
        const apiUrl = getNormalizedApiUrl()
        
        if (!token) {
          logger.warn('settings', 'No token available, falling back to localStorage')
          loadFromLocalStorage()
          return
        }

        const response = await fetch(`${apiUrl}/users/profile`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })

        if (!response.ok) {
          throw new Error(`API returned ${response.status}`)
        }

        const responseData = await response.json()
        
        if (responseData.data) {
          const profileData = responseData.data
          const userDataObj = {
            id: profileData.id || '',
            name: profileData.name || '',
            institution: profileData.institution || '',
            email: profileData.email || '',
            phone_number: profileData.phone_number || '',
            instagram: profileData.instagram || '',
            country: profileData.country || '',
            language: profileData.language || '',
            email_notifications: profileData.email_notifications ?? (localStorage.getItem('email_notifications') === 'true'),
            user_type: profileData.user_type || 'pesquisador'
          }
          setUserData(userDataObj)
        }
      } catch (err) {
        logger.error('settings', err instanceof Error ? err.message : 'Unknown error')
        loadFromLocalStorage()
      } finally {
        setLoading(false)
      }
    }

    const loadFromLocalStorage = () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser)
          
          const userDataObj = {
            id: parsedUser.user_id || parsedUser.id || '',
            name: parsedUser.name || '',
            institution: parsedUser.institution || '',
            email: parsedUser.email || '',
            phone_number: parsedUser.phone_number || '',
            instagram: parsedUser.instagram || '',
            country: parsedUser.country || '',
            language: parsedUser.language || '',
            email_notifications: localStorage.getItem('email_notifications') === 'true',
            user_type: parsedUser.user_type || 'pesquisador'
          }
          setUserData(userDataObj)
        } catch (err) {
          logger.error('settings', err instanceof Error ? err.message : 'Unknown error')
          setUserData({
            id: user.user_id || '',
            name: user.name || '',
            institution: '',
            email: user.email || '',
            phone_number: '',
            instagram: '',
            country: '',
            language: '',
            email_notifications: false,
            user_type: user.user_type || 'pesquisador'
          })
        }
      } else {
        setUserData({
          id: user.user_id || '',
          name: user.name || '',
          institution: '',
          email: user.email || '',
          country: '',
          language: '',
          phone_number: '',
          instagram: '',
          email_notifications: false,
          user_type: user.user_type || 'pesquisador'
        })
      }
    }

    fetchUserProfile()
  }, [user, router, isAuthenticating])

  const handlePersonalDataSubmit = async (data: any) => {
    try {
      // Try to get token from user object first, then fall back to localStorage
      let token = (user as any).token || (user as any).access_token
      
      if (!token) {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser)
            token = parsedUser.access_token || parsedUser.token
          } catch (err) {
            logger.error('settings', err instanceof Error ? err.message : 'Unknown error')
          }
        }
      }

      const apiUrl = getNormalizedApiUrl()

      if (!token) {
        throw new Error('Token não encontrado. Por favor, faça login novamente.')
      }

      const response = await fetch(`${apiUrl}/users/update`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: data.name || '',
          institution: data.institution || '',
          country: data.country || '',
          language: data.language || '',
          phone_number: data.phone_number || '',
          instagram: data.instagram || '',
        })
      })

      if (!response.ok) {
        let errorMessage = 'Erro ao atualizar dados'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          // Se não conseguir fazer parse do JSON, tenta ler como texto
          const errorText = await response.text()
          logger.error('settings', 'Error response from profile update API')
          if (errorText.includes('<!DOCTYPE')) {
            errorMessage = 'Erro do servidor: Verifique a conexão com a API'
          }
        }
        throw new Error(errorMessage)
      }

      const responseData = await response.json()
      setUserData(responseData.data)
      
      // Update AuthStore with new user data to trigger LanguageProvider sync
      const { setUser } = useAuthStore.getState()
      const updatedUser = {
        user_id: user?.user_id || responseData.data.id || '',
        name: responseData.data.name || user?.name || '',
        email: user?.email || '',
        institution: responseData.data.institution || user?.institution || '',
        phone_number: responseData.data.phone_number || user?.phone_number || '',
        instagram: responseData.data.instagram || user?.instagram,
        country: responseData.data.country || user?.country,
        language: responseData.data.language || user?.language,
        user_type: user?.user_type || 'pesquisador'
      }
      setUser(updatedUser)
    } catch (err: any) {
      logger.error('settings', err instanceof Error ? err.message : 'Unknown error')
      throw new Error(err.message || t('settings.personalData.errors.updateError'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-muted">{t('settings.loading')}</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Alert variant="danger" className="max-w-md">
          {t('settings.loadError')}
        </Alert>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <PageHeader title={t('settings.title')} />

        <Card className="flex flex-col md:flex-row overflow-hidden">
          {/* Sidebar */}
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 md:p-8">
            {activeTab === 'personal' && userData && (
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 sm:mb-6">{t('settings.personalData.title')}</h2>
                <PersonalDataForm
                  initialData={{
                    name: userData?.name || '',
                    institution: userData?.institution || '',
                    email: userData?.email || '',
                    phone_number: userData?.phone_number || '',
                    instagram: userData?.instagram || '',
                    country: userData?.country || '',
                    language: userData?.language || ''
                  }}
                  onSubmit={handlePersonalDataSubmit}
                />
              </div>
            )}

            {activeTab === 'system' && (
              <div>
                <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-4 sm:mb-6">{t('settings.sidebar.system')}</h2>
                <SystemSettings
                  initialData={{
                    email_notifications: userData.email_notifications ?? true
                  }}
                />
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
