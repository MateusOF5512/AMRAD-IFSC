'use client'

import Link from 'next/link'
import { Mail, MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/authStore'
import { canWriteResearchData } from '@/lib/auth-roles'

export function Footer() {
  const currentYear = new Date().getFullYear()
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)

  return (
    <footer className="bg-primary text-white mt-10 sm:mt-16 pb-[env(safe-area-inset-bottom)]">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
          {/* About Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.about.title')}</h3>
            <p className="text-primary-light text-sm leading-relaxed">
              {t('footer.about.description')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks.title')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/experimentos" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.quickLinks.exploreExperiments')}
                </Link>
              </li>
              <li>
                <Link href="/meus-experimentos" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.quickLinks.myExperiments')}
                </Link>
              </li>
              {canWriteResearchData(user) && (
              <li>
                <Link href="/novo-experimento" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.quickLinks.newExperiment')}
                </Link>
              </li>
              )}
              <li>
                <Link href="/settings" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.quickLinks.settings')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.whoWeAre.title')}</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.whoWeAre.aboutProject')}
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.whoWeAre.ourMission')}
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.whoWeAre.scientificResources')}
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.whoWeAre.blogAndArticles')}
                </a>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.support.title')}</h3>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-2">
                <Mail className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <a href="mailto:suporte@amrad.com" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.support.email')}
                </a>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <span className="text-green-50">{t('footer.support.location')}</span>
              </li>
              <li>
                <a href="#" className="text-primary-light hover:text-white transition-colors">
                  {t('footer.support.helpCenter')}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-primary-hover my-8" />

        {/* Bottom Footer */}
        <div className="flex flex-col md:flex-row justify-between items-center text-sm text-primary-light gap-4">
          <p className="text-center md:text-left">{t('footer.rights', { year: currentYear })}</p>
          
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 md:mt-0">
            <a href="#" className="hover:text-white transition-colors">
              {t('footer.privacy')}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t('footer.terms')}
            </a>
            <a href="#" className="hover:text-white transition-colors">
              {t('footer.cookies')}
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
