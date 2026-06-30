import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { isAdminUser } from '@/lib/auth-roles'

/**
 * Hook para proteger rotas de admin
 * Redireciona para login se não autenticado
 * Redireciona para experimentos se não for admin
 */
export function useAdminProtection() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const sessionReady = useAuthStore((state) => state.sessionReady)

  useEffect(() => {
    if (!sessionReady) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!isAdminUser(user)) {
      router.push('/experimentos')
    }
  }, [router, user, sessionReady])

  if (!sessionReady) return null
  return isAdminUser(user) ? user : null
}
