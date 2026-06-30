'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import { persistUserSession, syncSessionWithBackend } from '@/lib/supabase-auth'
import { CompleteProfileModal } from '@/components/auth/CompleteProfileModal'

const PUBLIC_ROUTES = ['/login', '/register', '/experimentos', '/']
const AUTH_FLOW_ROUTES = ['/auth/callback', '/auth/callback/complete']
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

function isAuthFlowRoute(pathname: string): boolean {
  return AUTH_FLOW_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route)
  )
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, setUser, signOut, setSessionReady } = useAuthStore()
  const [isAuthenticating, setIsAuthenticating] = useState(true)
  const [showProfileModal, setShowProfileModal] = useState(false)

  const applySession = (sessionUser: NonNullable<typeof user> & { access_token: string }) => {
    persistUserSession(sessionUser)
    setUser(sessionUser)
    setShowProfileModal(Boolean(sessionUser.needs_profile_completion))
  }

  useEffect(() => {
    setShowProfileModal(Boolean(user?.needs_profile_completion))
  }, [user?.needs_profile_completion, user?.user_id])

  useEffect(() => {
    const restoreSession = async () => {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
          setShowProfileModal(Boolean(userData.needs_profile_completion))
        } catch {
          localStorage.removeItem('user')
          signOut()
        }
      }

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.access_token) {
          const result = await syncSessionWithBackend(session.access_token)
          applySession(result.user)
        } else if (storedUser) {
          signOut()
        }
      } catch {
        // Keep local session if backend sync fails temporarily.
      }

      setIsAuthenticating(false)
      setSessionReady(true)
    }

    restoreSession()
  }, [])

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!session?.access_token) {
        if (!localStorage.getItem('user')) {
          signOut()
          setShowProfileModal(false)
        }
        return
      }

      try {
        const result = await syncSessionWithBackend(session.access_token)
        applySession(result.user)
      } catch {
        // Ignore transient sync errors during auth state changes.
      }
    })

    return () => subscription.unsubscribe()
  }, [setUser, signOut])

  useEffect(() => {
    const handleStorageChange = () => {
      const storedUser = localStorage.getItem('user')
      if (!storedUser) {
        signOut()
        setShowProfileModal(false)
      } else {
        try {
          const parsed = JSON.parse(storedUser)
          setUser(parsed)
          setShowProfileModal(Boolean(parsed.needs_profile_completion))
        } catch {
          signOut()
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [setUser, signOut])

  useEffect(() => {
    if (isAuthenticating || isAuthFlowRoute(pathname)) return

    const storedUser = localStorage.getItem('user')
    const isAuthenticated = !!storedUser && !!user

    if (!isAuthenticated && isProtectedRoute(pathname)) {
      router.push('/login')
    } else if (isAuthenticated && ['/login', '/register'].includes(pathname)) {
      router.push('/experimentos')
    } else if (
      isAuthenticated &&
      ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix)) &&
      user?.user_type !== 'admin'
    ) {
      router.push('/experimentos')
    }
  }, [user, pathname, router, isAuthenticating, signOut])

  const handleProfileComplete = () => {
    setShowProfileModal(false)
    if (isAuthFlowRoute(pathname) || ['/login', '/register'].includes(pathname)) {
      router.push('/experimentos')
    }
  }

  return (
    <>
      {children}
      <CompleteProfileModal isOpen={showProfileModal} onComplete={handleProfileComplete} />
    </>
  )
}
