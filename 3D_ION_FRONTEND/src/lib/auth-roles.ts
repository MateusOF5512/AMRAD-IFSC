import type { User } from '@/store/authStore'

export type UserAccountStatus = 'regular' | 'irregular' | 'desativado'

export function normalizeUserType(userType: string | null | undefined): string {
  if (!userType) return 'pesquisador'
  return userType.trim().toLowerCase() === 'admin' ? 'admin' : 'pesquisador'
}

export function isAdminUser(user: Pick<User, 'user_type'> | null | undefined): boolean {
  return normalizeUserType(user?.user_type) === 'admin'
}

export function normalizeUserStatus(status: string | null | undefined): UserAccountStatus {
  const normalized = (status || 'regular').trim().toLowerCase()
  if (normalized === 'irregular' || normalized === 'desativado') {
    return normalized
  }
  return 'regular'
}

export function isIrregularUser(
  user: Pick<User, 'user_type' | 'status'> | null | undefined
): boolean {
  if (!user || isAdminUser(user)) return false
  return normalizeUserStatus(user.status) === 'irregular'
}

export function isDeactivatedUser(
  user: Pick<User, 'user_type' | 'status'> | null | undefined
): boolean {
  if (!user || isAdminUser(user)) return false
  return normalizeUserStatus(user.status) === 'desativado'
}

export function canWriteResearchData(
  user: Pick<User, 'user_type' | 'status'> | null | undefined
): boolean {
  if (!user) return false
  if isAdminUser(user)) return true
  return normalizeUserStatus(user.status) === 'regular'
}
