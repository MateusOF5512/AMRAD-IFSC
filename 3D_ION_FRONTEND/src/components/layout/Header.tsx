'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useTranslation } from 'react-i18next'

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, signOut } = useAuthStore()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { t } = useTranslation()

  useEffect(() => {
    setMounted(true)
    
    // Initial load from localStorage
    const userData = localStorage.getItem('user')
    if (userData) {
      try {
        setUser(JSON.parse(userData))
      } catch {
        signOut()
      }
    }

    // Listen for storage changes
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
    signOut()
    window.dispatchEvent(new Event('userLoggedOut'))
    // Small delay to ensure state updates before navigation
    await new Promise(resolve => setTimeout(resolve, 100))
    router.push('/login')
  }

  // Handle click outside menu to close
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

  return (
    <header className="bg-white shadow-md border-b border-gray-200 sticky top-0 z-50">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link href="/" className="flex items-center justify-center hover:opacity-80 transition-opacity">
            <img src="/logo_ion3d.png" alt="ION3D Logo" className="h-12 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Public links - always visible */}
            <Link
              href="/experimentos"
              className={`${
                isActive('/experimentos')
                  ? 'text-green-600 font-semibold border-b-2 border-green-600'
                  : 'text-gray-700 hover:text-green-600'
              } transition-colors pb-1`}
            >
              {t('nav.allExperiments')}
            </Link>

            {/* Authenticated links */}
            {user && (
              <>
                <Link
                  href="/meus-experimentos"
                  className={`${
                    isActive('/meus-experimentos')
                      ? 'text-green-600 font-semibold border-b-2 border-green-600'
                      : 'text-gray-700 hover:text-green-600'
                  } transition-colors pb-1`}
                >
                  {t('nav.myExperiments')}
                </Link>

                {/* Admin only links */}
                {user.user_type === 'admin' && (
                  <Link
                    href="/admin/configuracoes-avancadas"
                    className={`${
                      isActive('/admin/configuracoes-avancadas')
                        ? 'text-orange-600 font-semibold border-b-2 border-orange-600'
                        : 'text-gray-700 hover:text-orange-600'
                    } transition-colors pb-1`}
                  >
                    {t('nav.advancedSettings')}
                  </Link>
                )}
              </>
            )}

            {/* Auth buttons */}
            <div className="flex items-center gap-4 border-l border-gray-300 pl-4">
              {user ? (
                <>
                  <Link
                    href="/settings"
                    className="text-sm text-gray-600 hover:text-green-600 font-medium transition-colors"
                  >
                    {user.name || user.email}
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="px-4 py-2 text-green-600 font-medium hover:bg-green-50 rounded-lg transition-colors"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    href="/register"
                    className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
                  >
                    {t('nav.register')}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            id="menu-button"
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100"
          >
            {isOpen ? (
              <X className="h-6 w-6 text-gray-700" />
            ) : (
              <Menu className="h-6 w-6 text-gray-700" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div
            id="mobile-menu"
            className="md:hidden mt-4 pt-4 border-t border-gray-200 space-y-3"
          >
            <Link
              href="/experimentos"
              className={`block px-4 py-2 rounded-lg ${
                isActive('/experimentos')
                  ? 'bg-green-100 text-green-600 font-semibold'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {t('nav.allExperiments')}
            </Link>

            {user && (
              <>
                <Link
                  href="/meus-experimentos"
                  className={`block px-4 py-2 rounded-lg ${
                    isActive('/meus-experimentos')
                      ? 'bg-green-100 text-green-600 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  {t('nav.myExperiments')}
                </Link>

                {/* Admin only mobile link */}
                {user.user_type === 'admin' && (
                  <Link
                    href="/admin/configuracoes-avancadas"
                    className={`block px-4 py-2 rounded-lg ${
                      isActive('/admin/configuracoes-avancadas')
                        ? 'bg-orange-100 text-orange-600 font-semibold'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    onClick={() => setIsOpen(false)}
                  >
                    ⚙️ {t('nav.advancedSettings')}
                  </Link>
                )}
              </>
            )}

            <div className="pt-4 border-t border-gray-200 space-y-2">
              {user ? (
                <>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-gray-600 hover:bg-green-50 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {user.name || user.email}
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout()
                      setIsOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="h-5 w-5" />
                    {t('nav.logout')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-4 py-2 text-center text-green-600 font-medium hover:bg-green-50 rounded-lg transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    href="/register"
                    className="block px-4 py-2 bg-green-600 text-white font-medium text-center rounded-lg hover:bg-green-700 transition-colors"
                    onClick={() => setIsOpen(false)}
                  >
                    {t('nav.register')}
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
