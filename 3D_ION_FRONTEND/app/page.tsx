'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { FlaskConical, Users, Building2, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { logger } from '@/lib/logger'
import { getNormalizedApiUrl } from '@/lib/api'

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
        const apiUrl = getNormalizedApiUrl()
        const response = await fetch(`${apiUrl}/experiments/stats/dashboard`)
        
        // Check if response is ok
        if (!response.ok) {
          logger.warn('home', `API returned status ${response.status}`)
          setLoading(false)
          return
        }

        // Check content type
        const contentType = response.headers.get('content-type')
        if (!contentType?.includes('application/json')) {
          logger.warn('home', 'API did not return JSON')
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
        logger.error('home', error instanceof Error ? error.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="min-h-screen bg-surface">
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
          <div className="border-2 border-white/40 bg-surface/10 backdrop-blur-sm rounded-xl px-8 sm:px-12 py-8 sm:py-10 mb-12 max-w-3xl">
            <p className="text-center text-xl sm:text-2xl text-foreground font-bold drop-shadow-lg leading-relaxed">
              {t('home.hero.description')}
            </p>
          </div>

          {/* Primary CTA - White with Green Text */}
          <div className="flex justify-center">
            <Link
              href="/experimentos"
              className="group inline-flex items-center gap-3 px-8 sm:px-10 py-4 bg-surface text-primary font-semibold rounded-lg hover:shadow-lg transition-all duration-150"
            >
              <span>{t('home.hero.exploreButton')}</span>
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-background px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Experiments Card */}
            <div className="flex flex-col items-center p-6 sm:p-8 bg-surface rounded-xl border border-border shadow-sm">
              <div className="p-3 bg-primary rounded-lg mb-4">
                <FlaskConical className="h-6 w-6 text-white" />
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
                {loading ? '...' : stats.total_experiments.toLocaleString()}
              </p>
              <p className="text-center text-sm text-muted">
                {t('home.stats.registeredExperiments')}
              </p>
            </div>

            {/* Researchers Card */}
            <div className="flex flex-col items-center p-6 sm:p-8 bg-surface rounded-xl border border-border shadow-sm">
              <div className="p-3 bg-primary/80 rounded-lg mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
                {loading ? '...' : stats.total_researchers.toLocaleString()}
              </p>
              <p className="text-center text-sm text-muted">
                {t('home.stats.activeResearchers')}
              </p>
            </div>

            {/* Institutions Card */}
            <div className="flex flex-col items-center p-6 sm:p-8 bg-surface rounded-xl border border-border shadow-sm">
              <div className="p-3 bg-primary-hover rounded-lg mb-4">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <p className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
                {loading ? '...' : stats.total_institutions.toLocaleString()}
              </p>
              <p className="text-center text-sm text-muted">
                {t('home.stats.participatingInstitutions')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground text-center mb-12">
            {t('home.features.title')}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col">
              <div className="p-3 bg-primary-light rounded-lg w-fit mb-4">
                <FlaskConical className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('home.features.registerTitle')}
              </h3>
              <p className="text-muted">
                {t('home.features.registerDesc')}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col">
              <div className="p-3 bg-primary-light rounded-lg w-fit mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('home.features.collaborateTitle')}
              </h3>
              <p className="text-muted">
                {t('home.features.collaborateDesc')}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col">
              <div className="p-3 bg-primary-light rounded-lg w-fit mb-4">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {t('home.features.trackTitle')}
              </h3>
              <p className="text-muted">
                {t('home.features.trackDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
