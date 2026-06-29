'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FlaskConical, Users, Building2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface DashboardStats {
  total_experiments: number
  total_researchers: number
  total_institutions: number
}

export default function Home() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<DashboardStats>({
    total_experiments: 0,
    total_researchers: 0,
    total_institutions: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'
        const response = await fetch(`${apiUrl}/experiments/stats/dashboard`)
        
        // Check if response is ok
        if (!response.ok) {
          console.warn(`API returned status ${response.status}`)
          setLoading(false)
          return
        }

        // Check content type
        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('application/json')) {
          console.warn('API did not return JSON')
          setLoading(false)
          return
        }

        const data = await response.json()
        if (data.success) {
          setStats({
            total_experiments: data.total_experiments || 0,
            total_researchers: data.total_researchers || 0,
            total_institutions: data.total_institutions || 0,
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Background Image */}
      <section 
        className="relative overflow-hidden px-4 sm:px-6 lg:px-8 py-32 sm:py-48 bg-cover"
        style={{
          backgroundImage: 'url(/bg_home.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'top center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          minHeight: '600px'
        }}
      >
        <div className="max-w-4xl mx-auto flex flex-col items-center justify-center text-center min-h-96">
          {/* Description with Frosted Glass Background */}
          <div className="border-2 border-white/40 bg-white/10 backdrop-blur-sm rounded-xl px-8 sm:px-12 py-8 sm:py-10 mb-12 max-w-3xl">
            <p className="text-center text-xl sm:text-2xl text-gray-900 font-bold drop-shadow-lg leading-relaxed">
              {t('home.hero.description')}
            </p>
          </div>

          {/* Primary CTA - White with Green Text */}
          <div className="flex justify-center">
            <Link
              href="/experimentos"
              className="group inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-white text-green-600 font-semibold rounded-lg hover:shadow-2xl hover:shadow-white/50 transition-all duration-300 transform hover:scale-105 drop-shadow-lg hover:bg-green-50"
            >
              <span>{t('home.hero.exploreButton')}</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {/* Experiments Card */}
            <div className="flex flex-col items-center p-6 sm:p-8 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl border border-blue-200">
              <div className="p-3 bg-blue-600 rounded-lg mb-4">
                <FlaskConical className="h-6 w-6 text-white" />
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-blue-900 mb-2">
                {loading ? '...' : stats.total_experiments.toLocaleString()}
              </p>
              <p className="text-center text-sm sm:text-base text-blue-700">
                {t('home.stats.registeredExperiments')}
              </p>
            </div>

            {/* Researchers Card */}
            <div className="flex flex-col items-center p-6 sm:p-8 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl border border-purple-200">
              <div className="p-3 bg-purple-600 rounded-lg mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-purple-900 mb-2">
                {loading ? '...' : stats.total_researchers.toLocaleString()}
              </p>
              <p className="text-center text-sm sm:text-base text-purple-700">
                {t('home.stats.activeResearchers')}
              </p>
            </div>

            {/* Institutions Card */}
            <div className="flex flex-col items-center p-6 sm:p-8 bg-gradient-to-br from-amber-50 to-amber-100 rounded-2xl border border-amber-200">
              <div className="p-3 bg-amber-600 rounded-lg mb-4">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-amber-900 mb-2">
                {loading ? '...' : stats.total_institutions.toLocaleString()}
              </p>
              <p className="text-center text-sm sm:text-base text-amber-700">
                {t('home.stats.participatingInstitutions')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-gradient-to-br from-gray-50 to-gray-100 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 text-center mb-12">
            {t('home.features.title')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col">
              <div className="p-3 bg-green-100 rounded-lg w-fit mb-4">
                <FlaskConical className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('home.features.registerTitle')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.registerDesc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col">
              <div className="p-3 bg-purple-100 rounded-lg w-fit mb-4">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('home.features.collaborateTitle')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.collaborateDesc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col">
              <div className="p-3 bg-blue-100 rounded-lg w-fit mb-4">
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t('home.features.trackTitle')}
              </h3>
              <p className="text-gray-600">
                {t('home.features.trackDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
