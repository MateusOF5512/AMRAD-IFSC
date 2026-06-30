import type { User } from '@/store/authStore'

export function normalizeUserType(userType: string | null | undefined): string {
  if (!userType) return 'pesquisador'
  return userType.trim().toLowerCase() === 'admin' ? 'admin' : 'pesquisador'
}

export function isAdminUser(user: Pick<User, 'user_type'> | null | undefined): boolean {
  return normalizeUserType(user?.user_type) === 'admin'
}
