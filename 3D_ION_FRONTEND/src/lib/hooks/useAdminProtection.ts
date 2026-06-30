import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { isAdminUser } from '@/lib/auth-roles'
import { getStoredAccessToken, getStoredUser } from '@/lib/auth-storage'
import { persistUserSession, refreshUserFromBackend } from '@/lib/supabase-auth'
import type { User } from '@/store/authStore'

const BACKEND_RETRY_ATTEMPTS = 3
const BACKEND_RETRY_DELAY_MS = 400

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Hook para proteger rotas de admin.
 * Confia no perfil admin em cache enquanto revalida no backend — evita expulsar
 * o usuário durante carregamento de dados ou falhas transitórias de rede.
 */
export function useAdminProtection() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const sessionReady = useAuthStore((state) => state.sessionReady)
  const setUser = useAuthStore((state) => state.setUser)
  const [verifiedAdmin, setVerifiedAdmin] = useState<User | null>(null)
  const [isVerifying, setIsVerifying] = useState(true)
  const adminGrantedRef = useRef(false)

  useEffect(() => {
    if (!sessionReady) return

    const storedUser = getStoredUser()
    const effectiveUser = user ?? storedUser

    if (adminGrantedRef.current && effectiveUser && isAdminUser(effectiveUser)) {
      setVerifiedAdmin(effectiveUser)
      setIsVerifying(false)
      return
    }

    let cancelled = false

    const verifyAccess = async () => {
      setIsVerifying(true)

      const storedUser = getStoredUser()
      const effectiveUser = user ?? storedUser

      if (!effectiveUser) {
        if (!cancelled) {
          setVerifiedAdmin(null)
          setIsVerifying(false)
          router.push('/login')
        }
        return
      }

      const token = effectiveUser.access_token || getStoredAccessToken()

      // Admin em cache: libera acesso imediatamente e revalida em segundo plano.
      if (isAdminUser(effectiveUser)) {
        adminGrantedRef.current = true
        if (!cancelled) {
          setVerifiedAdmin(effectiveUser)
          setIsVerifying(false)
        }

        if (token) {
          try {
            const freshUser = await refreshUserFromBackend(token)
            if (cancelled) return
            if (isAdminUser(freshUser)) {
              persistUserSession(freshUser)
              setUser(freshUser)
              setVerifiedAdmin(freshUser)
            }
          } catch {
            // Mantém acesso com perfil admin em cache.
          }
        }
        return
      }

      // Sem admin em cache: tenta confirmar no backend antes de redirecionar.
      if (!token) {
        if (!cancelled) {
          setVerifiedAdmin(null)
          setIsVerifying(false)
          router.push('/login')
        }
        return
      }

      for (let attempt = 0; attempt < BACKEND_RETRY_ATTEMPTS; attempt++) {
        try {
          const freshUser = await refreshUserFromBackend(token)
          if (cancelled) return

          if (isAdminUser(freshUser)) {
            adminGrantedRef.current = true
            persistUserSession(freshUser)
            setUser(freshUser)
            setVerifiedAdmin(freshUser)
            setIsVerifying(false)
            return
          }

          break
        } catch {
          if (attempt < BACKEND_RETRY_ATTEMPTS - 1) {
            await sleep(BACKEND_RETRY_DELAY_MS * (attempt + 1))
          }
        }
      }

      if (!cancelled) {
        adminGrantedRef.current = false
        setVerifiedAdmin(null)
        setIsVerifying(false)
        router.push('/experimentos')
      }
    }

    void verifyAccess()

    return () => {
      cancelled = true
    }
  }, [router, user, sessionReady, setUser])

  if (!sessionReady || isVerifying) return null
  return verifiedAdmin
}
