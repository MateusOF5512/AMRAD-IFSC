import type { User } from '@/store/authStore'

export type UserAccountStatus = 'regular' | 'irregular' | 'desativado'

/** Minimal user fields for role/status checks (localStorage may omit user_type). */
export type AuthRoleUser =
  | Pick<User, 'user_type' | 'status'>
  | { user_type?: string | null; status?: string | null }
  | null
  | undefined

export function normalizeUserType(userType: string | null | undefined): string {
  if (!userType) return 'pesquisador'
  return userType.trim().toLowerCase() === 'admin' ? 'admin' : 'pesquisador'
}

export function isAdminUser(user: AuthRoleUser): boolean {
  return normalizeUserType(user?.user_type) === 'admin'
}

export function normalizeUserStatus(status: string | null | undefined): UserAccountStatus {
  const normalized = (status || 'regular').trim().toLowerCase()
  if (normalized === 'irregular' || normalized === 'desativado') {
    return normalized
  }
  return 'regular'
}

export function isIrregularUser(user: AuthRoleUser): boolean {
  if (!user || isAdminUser(user)) return false
  return normalizeUserStatus(user.status) === 'irregular'
}

export function isDeactivatedUser(user: AuthRoleUser): boolean {
  if (!user || isAdminUser(user)) return false
  return normalizeUserStatus(user.status) === 'desativado'
}

export function canWriteResearchData(user: AuthRoleUser): boolean {
  if (!user) return false
  if (isAdminUser(user)) return true
  return normalizeUserStatus(user.status) === 'regular'
}
