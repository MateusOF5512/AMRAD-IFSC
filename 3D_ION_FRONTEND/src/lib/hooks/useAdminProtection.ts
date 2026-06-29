import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/store/authStore'

/**
 * Hook para proteger rotas de admin
 * Redireciona para login se não autenticado
 * Redireciona para experimentos se não for admin
 */
export function useAdminProtection() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  useEffect(() => {
    const userData = localStorage.getItem('user')

    if (!userData) {
      router.push('/login')
      return
    }

    try {
      const parsedUser = JSON.parse(userData)
      if (parsedUser.user_type !== 'admin') {
        router.push('/experimentos')
      }
    } catch {
      router.push('/login')
    }
  }, [router, user])

  const isAdmin = user && user.user_type === 'admin'
  return isAdmin ? user : null
}
