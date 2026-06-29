'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { SettingsSidebar } from '@/components/settings/SettingsSidebar'
import { PersonalDataForm } from '@/components/settings/PersonalDataForm'
import { SystemSettings } from '@/components/settings/SystemSettings'
import { AlertCircle } from 'lucide-react'
import { getNormalizedApiUrl } from '@/lib/api'
import { useTranslation } from 'react-i18next'

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

    console.log('Starting to fetch user profile...')
    // Fetch user profile directly from backend API
    const fetchUserProfile = async () => {
      try {
        const token = (user as any).token || (user as any).access_token
        const apiUrl = getNormalizedApiUrl()
        
        if (!token) {
          console.warn('No token available, falling back to localStorage')
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
        console.log('User profile from API:', responseData)
        
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
          console.log('Loaded userData from API with country:', userDataObj.country, 'language:', userDataObj.language)
          setUserData(userDataObj)
        }
      } catch (err) {
        console.error('Error fetching profile from API:', err)
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
          console.log('Loaded user from localStorage:', parsedUser)
          
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
          console.log('Setting userData from localStorage:', userDataObj)
          setUserData(userDataObj)
        } catch (err) {
          console.error('Error parsing user data:', err)
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
            console.error('Error parsing stored user:', err)
          }
        }
      }

      const apiUrl = getNormalizedApiUrl()

      if (!token) {
        throw new Error('Token não encontrado. Por favor, faça login novamente.')
      }

      console.log('Updating profile with data:', data)
      console.log('Using API URL:', `${apiUrl}/users/update`)

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
          oldPassword: data.oldPassword || undefined,
          newPassword: data.newPassword || undefined,
          confirmPassword: data.confirmPassword
        })
      })

      console.log('API Response Status:', response.status)

      if (!response.ok) {
        let errorMessage = 'Erro ao atualizar dados'
        try {
          const errorData = await response.json()
          errorMessage = errorData.detail || errorMessage
        } catch (e) {
          // Se não conseguir fazer parse do JSON, tenta ler como texto
          const errorText = await response.text()
          console.error('Error response text:', errorText)
          if (errorText.includes('<!DOCTYPE')) {
            errorMessage = 'Erro do servidor: Verifique a conexão com a API'
          }
        }
        throw new Error(errorMessage)
      }

      const responseData = await response.json()
      console.log('Profile updated successfully:', responseData)
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
      console.log('AuthStore updated with new language:', updatedUser.language)
    } catch (err: any) {
      console.error('Error in handlePersonalDataSubmit:', err)
      throw new Error(err.message || t('settings.personalData.errors.updateError'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">{t('settings.loading')}</p>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <p>{t('settings.loadError')}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          {t('settings.title')}
        </h1>

        <div className="flex flex-col md:flex-row gap-8 bg-white rounded-lg shadow">
          {/* Sidebar */}
          <SettingsSidebar activeTab={activeTab} onTabChange={setActiveTab} />

          {/* Content */}
          <div className="flex-1 p-6 md:p-8">
            {activeTab === 'personal' && userData && (
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.personalData.title')}</h2>
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
                <h2 className="text-2xl font-bold text-gray-900 mb-6">{t('settings.sidebar.system')}</h2>
                <SystemSettings
                  initialData={{
                    email_notifications: userData.email_notifications ?? true
                  }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
