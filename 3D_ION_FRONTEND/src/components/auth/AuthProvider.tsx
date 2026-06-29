'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

const PUBLIC_ROUTES = ['/login', '/register', '/experimentos', '/']
const PROTECTED_PREFIXES = [
  '/settings',
  '/meus-experimentos',
  '/novo-experimento',
  '/experiments/',
  '/admin/',
]

const ADMIN_PREFIXES = ['/admin']

function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, signOut } = useAuthStore()
  const [isAuthenticating, setIsAuthenticating] = useState(true)

  useEffect(() => {
    // Check if user is logged in on mount
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (err) {
        localStorage.removeItem('user')
        signOut()
      }
    } else {
      // If localStorage is empty but store has user, clear it
      if (user) {
        signOut()
      }
    }
    setIsAuthenticating(false)
  }, [])

  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      const storedUser = localStorage.getItem('user')
      if (!storedUser) {
        signOut()
      } else {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
        } catch {
          signOut()
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [setUser, signOut])

  useEffect(() => {
    // Only redirect after authentication is complete
    if (isAuthenticating) return

    // Check localStorage directly to ensure consistency
    const storedUser = localStorage.getItem('user')
    const isAuthenticated = !!storedUser && !!user

    // Redirect logic based on auth state
    if (!isAuthenticated && isProtectedRoute(pathname)) {
      router.push('/login')
    } else if (isAuthenticated && ['/login', '/register'].includes(pathname)) {
      router.push('/experimentos')
    } else if (
      isAuthenticated &&
      ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
    ) {
      try {
        const userData = JSON.parse(storedUser!)
        if (userData.user_type !== 'admin') {
          router.push('/experimentos')
        }
      } catch {
        signOut()
        router.push('/login')
      }
    }
  }, [user, pathname, router, isAuthenticating])

  return <>{children}</>
}
