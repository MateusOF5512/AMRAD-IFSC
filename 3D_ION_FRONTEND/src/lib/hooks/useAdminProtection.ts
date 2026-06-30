import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { isAdminUser } from '@/lib/auth-roles'
import { getStoredAccessToken } from '@/lib/auth-storage'
import { persistUserSession, refreshUserFromBackend } from '@/lib/supabase-auth'
import type { User } from '@/store/authStore'

/**
 * Hook para proteger rotas de admin.
 * Revalida user_type no backend antes de redirecionar (evita falso negativo por cache local).
 */
export function useAdminProtection() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const sessionReady = useAuthStore((state) => state.sessionReady)
  const setUser = useAuthStore((state) => state.setUser)
  const [verifiedAdmin, setVerifiedAdmin] = useState<User | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)

  useEffect(() => {
    if (!sessionReady) return

    let cancelled = false

    const verifyAccess = async () => {
      setIsVerifying(true)

      if (!user) {
        setVerifiedAdmin(null)
        setIsVerifying(false)
        router.push('/login')
        return
      }

      if (isAdminUser(user)) {
        setVerifiedAdmin(user)
        setIsVerifying(false)
        return
      }

      const token = user.access_token || getStoredAccessToken()
      if (token) {
        try {
          const freshUser = await refreshUserFromBackend(token)
          if (cancelled) return

          if (isAdminUser(freshUser)) {
            persistUserSession(freshUser)
            setUser(freshUser)
            setVerifiedAdmin(freshUser)
            setIsVerifying(false)
            return
          }
        } catch {
          // Backend unavailable or session invalid — fall through to redirect.
        }
      }

      if (!cancelled) {
        setVerifiedAdmin(null)
        setIsVerifying(false)
        router.push('/experimentos')
      }
    }

    verifyAccess()

    return () => {
      cancelled = true
    }
  }, [router, user, sessionReady, setUser])

  if (!sessionReady || isVerifying) return null
  return verifiedAdmin
}
