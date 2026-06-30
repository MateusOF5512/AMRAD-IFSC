'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'
import { signOutFromSupabase } from '@/lib/supabase-auth'
import { cn } from '@/lib/cn'
import { Button } from '@/components/ui/Button'
import { BrandLogo } from '@/components/layout/BrandLogo'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, signOut } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    setMounted(true)

    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        signOut()
      }
    }

    const handleStorageChange = () => {
      const updatedUserData = localStorage.getItem('user')
      if (updatedUserData) {
        try {
          setUser(JSON.parse(updatedUserData))
        } catch {
          signOut()
        }
      } else {
        signOut()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('userLoggedIn', handleStorageChange)
    window.addEventListener('userLoggedOut', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('userLoggedIn', handleStorageChange)
      window.removeEventListener('userLoggedOut', handleStorageChange)
    }
  }, [setUser, signOut])

  const handleLogout = async () => {
    await signOutFromSupabase()
    signOut()
    window.dispatchEvent(new Event('userLoggedOut'))
    await new Promise(resolve => setTimeout(resolve, 100))
    router.push('/login')
  }

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const menu = document.getElementById('mobile-menu')
      const button = document.getElementById('menu-button')
      if (menu && button && !menu.contains(e.target as Node) && !button.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [isOpen])

  if (!mounted) return null

  const isActive = (href: string) => pathname === href

  const navLinkClass = (href: string, admin = false) =>
    cn(
      'transition-colors pb-1 text-sm font-medium',
      isActive(href)
        ? admin
          ? 'text-admin border-b-2 border-admin'
          : 'text-primary border-b-2 border-primary'
        : 'text-foreground hover:text-primary'
    )

  const mobileLinkClass = (href: string, admin = false) =>
    cn(
      'block px-4 py-2 rounded-lg text-sm font-medium',
      isActive(href)
        ? admin
          ? 'bg-admin-light text-admin'
          : 'bg-primary-light text-primary'
        : 'text-foreground hover:bg-slate-100'
    )

  return (
    <header className="bg-surface shadow-sm border-b border-border sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          <Link href="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
            <BrandLogo priority />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <Link href="/experimentos" className={navLinkClass('/experimentos')}>
              {t('nav.allExperiments')}
            </Link>

            {user && (
              <>
                <Link href="/meus-experimentos" className={navLinkClass('/meus-experimentos')}>
                  {t('nav.myExperiments')}
                </Link>

                {user.user_type === 'admin' && (
                  <Link
                    href="/admin/configuracoes-avancadas"
                    className={navLinkClass('/admin/configuracoes-avancadas', true)}
                  >
                    {t('nav.advancedSettings')}
                  </Link>
                )}
              </>
            )}

            <div className="flex items-center gap-3 border-l border-border pl-4">
              {user ? (
                <>
                  <Link
                    href="/settings"
                    className="text-sm text-muted hover:text-primary font-medium transition-colors"
                  >
                    {user.name || user.email}
                  </Link>
                  <Button variant="ghost" size="sm" onClick={handleLogout} className="text-danger hover:bg-red-50">
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-primary">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="primary" size="sm">
                      {t('nav.register')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>

          <button
            id="menu-button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-slate-100"
          >
            {isOpen ? <X className="h-6 w-6 text-foreground" /> : <Menu className="h-6 w-6 text-foreground" />}
          </button>
        </div>

        {isOpen && (
          <div id="mobile-menu" className="md:hidden mt-4 pt-4 border-t border-border space-y-2">
            <Link href="/experimentos" className={mobileLinkClass('/experimentos')} onClick={() => setIsOpen(false)}>
              {t('nav.allExperiments')}
            </Link>

            {user && (
              <>
                <Link
                  href="/meus-experimentos"
                  className={mobileLinkClass('/meus-experimentos')}
                  onClick={() => setIsOpen(false)}
                >
                  {t('nav.myExperiments')}
                </Link>

                {user.user_type === 'admin' && (
                  <Link
                    href="/admin/configuracoes-avancadas"
                    className={mobileLinkClass('/admin/configuracoes-avancadas', true)}
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.advancedSettings')}
                  </Link>
                )}
              </>
            )}

            <div className="pt-4 border-t border-border space-y-2">
              {user ? (
                <>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-muted hover:bg-primary-light rounded-lg"
                    onClick={() => setIsOpen(false)}
                  >
                    {user.name || user.email}
                  </Link>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-danger hover:bg-red-50"
                    onClick={() => {
                      handleLogout()
                      setIsOpen(false)
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    {t('nav.logout')}
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {t('nav.login')}
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setIsOpen(false)}>
                    <Button variant="primary" className="w-full">
                      {t('nav.register')}
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
