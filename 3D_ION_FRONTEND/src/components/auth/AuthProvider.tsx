'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { createClient } from '@/lib/supabase/client'
import { persistUserSession, refreshUserFromBackend, syncSessionWithBackend, clearStaleAuthSession, signOutFromSupabase } from '@/lib/supabase-auth'
import { getStoredAccessToken, getStoredUser, hasStoredUser } from '@/lib/auth-storage'
import { isAdminUser, canWriteResearchData } from '@/lib/auth-roles'
import { CompleteProfileModal } from '@/components/auth/CompleteProfileModal'

const PUBLIC_ROUTES = ['/login', '/register', '/experimentos', '/']
const AUTH_FLOW_ROUTES = ['/auth/callback', '/auth/callback/complete']
const WRITE_PROTECTED_PREFIXES = [
  '/novo-experimento',
  '/experiments/new',
  '/experiments/edit',
]

const PROTECTED_PREFIXES = [
  '/settings',
  '/meus-experimentos',
  '/novo-experimento',
  '/experiments/',
  '/admin/',
]

const ADMIN_PREFIXES = ['/admin']

function isAdminRoute(pathname: string): boolean {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isWriteProtectedRoute(pathname: string): boolean {
  return WRITE_PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix)
  )
}

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
  const pathnameRef = useRef(pathname)

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

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
      if (isAuthFlowRoute(pathname)) {
        setIsAuthenticating(false)
        setSessionReady(true)
        return
      }

      const storedUserRaw = localStorage.getItem('user')
      let storedAccessToken: string | null = null

      if (storedUserRaw) {
        try {
          const userData = JSON.parse(storedUserRaw)
          storedAccessToken = userData.access_token || null
          setUser(userData)
          setShowProfileModal(Boolean(userData.needs_profile_completion))
        } catch {
          await clearStaleAuthSession()
          signOut()
        }
      }

      try {
        const supabase = createClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()

        // Sem sessão persistida no app: limpa Supabase órfão só em telas de login.
        // Não fazer isso durante OAuth (/auth/callback*) — correria com o handshake.
        if (!storedUserRaw) {
          const onLoginScreen = pathname === '/login' || pathname === '/register'
          if (session && onLoginScreen && !isAuthFlowRoute(pathname)) {
            await signOutFromSupabase()
          }
          setIsAuthenticating(false)
          setSessionReady(true)
          return
        }

        const accessToken = storedAccessToken || session?.access_token || null

        if (accessToken) {
          try {
            const refreshedUser = await refreshUserFromBackend(accessToken)
            applySession(refreshedUser)
          } catch {
            if (session?.access_token) {
              try {
                const result = await syncSessionWithBackend(session.access_token)
                applySession(result.user)
              } catch {
                await clearStaleAuthSession()
                signOut()
              }
            } else {
              await clearStaleAuthSession()
              signOut()
            }
          }
        } else {
          await clearStaleAuthSession()
          signOut()
        }
      } catch {
        // Falha transitória: mantém usuário em cache se existir.
      }

      setIsAuthenticating(false)
      setSessionReady(true)
    }

    restoreSession()
  }, [pathname, setSessionReady, setUser, signOut])

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentPath = pathnameRef.current

      if (!session?.access_token) {
        if (!hasStoredUser()) {
          signOut()
          setShowProfileModal(false)
        }
        return
      }

      if (event === 'INITIAL_SESSION' || isAuthFlowRoute(currentPath)) {
        return
      }

      if (!hasStoredUser() && event !== 'SIGNED_IN') {
        return
      }

      try {
        const result = await syncSessionWithBackend(session.access_token)
        applySession(result.user)
      } catch {
        try {
          const refreshedUser = await refreshUserFromBackend(session.access_token)
          applySession(refreshedUser)
        } catch {
          if (hasStoredUser()) {
            await clearStaleAuthSession()
            signOut()
          }
        }
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
      isAdminRoute(pathname) &&
      !isAdminUser(user) &&
      !isAdminUser(getStoredUser())
    ) {
      // Revalida role no backend sem expulsar admin em cache (useAdminProtection faz o gate final).
      const revalidateAdminAccess = async () => {
        const token = user?.access_token || getStoredAccessToken()
        if (!token) return

        try {
          const freshUser = await refreshUserFromBackend(token)
          if (isAdminUser(freshUser)) {
            applySession(freshUser)
          }
        } catch {
          // Falha transitória: useAdminProtection decide o redirecionamento.
        }
      }

      void revalidateAdminAccess()
    } else if (isAuthenticated && isWriteProtectedRoute(pathname) && !canWriteResearchData(user)) {
      router.push('/meus-experimentos')
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
