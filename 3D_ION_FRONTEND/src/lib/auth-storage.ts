/** Centralized auth storage helpers for the frontend. */

import type { User } from '@/store/authStore'

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user')
  localStorage.removeItem('auth_token')
  localStorage.removeItem('email_notifications')
}

export function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function getStoredAccessToken(): string | null {
  const user = getStoredUser()
  if (!user) return null
  return user.access_token || null
}

export function hasStoredUser(): boolean {
  return getStoredUser() !== null
}
