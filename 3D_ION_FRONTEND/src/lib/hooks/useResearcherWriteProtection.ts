import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'
import { canWriteResearchData } from '@/lib/auth-roles'

/**
 * Protects routes that create or modify research data.
 * Irregular users are redirected to read-only views.
 */
export function useResearcherWriteProtection(redirectTo = '/meus-experimentos') {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)
  const sessionReady = useAuthStore((state) => state.sessionReady)

  useEffect(() => {
    if (!sessionReady) return

    if (!user) {
      router.push('/login')
      return
    }

    if (!canWriteResearchData(user)) {
      router.push(redirectTo)
    }
  }, [router, user, sessionReady, redirectTo])

  if (!sessionReady) return null
  return canWriteResearchData(user) ? user : null
}
