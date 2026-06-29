/** Centralized auth storage helpers for the frontend. */

export function clearAuthStorage(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem('user')
  localStorage.removeItem('auth_token')
  localStorage.removeItem('email_notifications')
}

export function getStoredAccessToken(): string | null {
  if (typeof window === 'undefined') return null
  const raw = localStorage.getItem('user')
  if (!raw) return null
  try {
    const data = JSON.parse(raw)
    return data.access_token || data.token || null
  } catch {
    return null
  }
}
