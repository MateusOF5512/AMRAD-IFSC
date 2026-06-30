import { createClient } from '@/lib/supabase/client'
import { getNormalizedApiUrl } from '@/lib/api'
import { clearAuthStorage, hasStoredUser } from '@/lib/auth-storage'
import { normalizeUserType, normalizeUserStatus } from '@/lib/auth-roles'
import type { User } from '@/store/authStore'

export type AuthMode = 'login' | 'register'

export class AuthApiError extends Error {
  constructor(
    message: string,
    readonly statusCode?: number,
    readonly isNetworkError = false,
  ) {
    super(message)
    this.name = 'AuthApiError'
  }
}

function isFetchNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (error instanceof Error) {
    const msg = error.message.toLowerCase()
    return (
      msg.includes('failed to fetch') ||
      msg.includes('network') ||
      msg.includes('load failed') ||
      msg.includes('err_')
    )
  }
  return false
}

async function authApiFetch(path: string, init: RequestInit): Promise<Response> {
  const apiUrl = getNormalizedApiUrl()
  try {
    return await fetch(`${apiUrl}${path}`, init)
  } catch (error) {
    throw new AuthApiError(
      error instanceof Error ? error.message : 'Network error',
      undefined,
      true,
    )
  }
}

/** True only when the session is definitively invalid — not on network/backend outages. */
export function isDefinitiveSessionLoss(error: unknown): boolean {
  if (error instanceof AuthApiError) {
    if (error.isNetworkError) return false
    if (error.statusCode === 401) return isSessionExpiredAuthError(error.message)
    return error.statusCode === 403
  }
  if (error instanceof Error && isFetchNetworkError(error)) return false
  return false
}

function mapBackendUser(
  data: Record<string, unknown>,
  fallbackAccessToken?: string
): User & { access_token: string } {
  const accessToken = String(data.access_token || fallbackAccessToken || '')
  return {
    user_id: String(data.user_id || data.id),
    name: String(data.name || ''),
    email: String(data.email || ''),
    institution: String(data.institution || ''),
    phone_number: String(data.phone_number || ''),
    instagram: data.instagram ? String(data.instagram) : undefined,
    country: data.country ? String(data.country) : undefined,
    language: data.language ? String(data.language) : undefined,
    user_type: normalizeUserType(String(data.user_type || 'pesquisador')),
    status: normalizeUserStatus(String(data.status || 'regular')),
    needs_profile_completion: Boolean(data.needs_profile_completion),
    access_token: accessToken,
  }
}

export async function signInWithGoogle(mode: AuthMode = 'login') {
  const supabase = createClient()
  const redirectTo = `${window.location.origin}/auth/callback?mode=${mode}`

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function syncSessionWithBackend(accessToken: string) {
  const response = await authApiFetch('/auth/oauth/session', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new AuthApiError(
      String(data.detail || 'Failed to sync session'),
      response.status,
    )
  }

  const data = await response.json()
  const user = mapBackendUser(data, accessToken)
  return {
    user,
    needsProfileCompletion: Boolean(data.needs_profile_completion),
  }
}

export async function refreshUserFromBackend(accessToken: string) {
  const response = await authApiFetch('/auth/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new AuthApiError(
      String(data.detail || 'Failed to refresh session'),
      response.status,
    )
  }

  const data = await response.json()
  return mapBackendUser(data, accessToken)
}

export async function clearStaleAuthSession(): Promise<void> {
  clearAuthStorage()
  try {
    await signOutFromSupabase()
  } catch {
    // Ignore Supabase cleanup errors.
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('userLoggedOut'))
  }
}

export async function completeOAuthProfile(
  accessToken: string,
  profile: {
    institution?: string
    phone_number?: string
    instagram?: string
    country?: string
    language?: string
  }
) {
  const apiUrl = getNormalizedApiUrl()
  const response = await fetch(`${apiUrl}/auth/oauth/complete-profile`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profile),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.detail || 'Failed to complete profile')
  }

  return mapBackendUser(data, accessToken)
}

export async function signOutFromSupabase() {
  try {
    const supabase = createClient()
    // Local scope only — never call global logout (403 when session is already invalid).
    await supabase.auth.signOut({ scope: 'local' })
  } catch {
    // Session may already be gone; app storage is cleared separately.
  }
}

export function persistUserSession(user: User & { access_token: string }) {
  localStorage.setItem('user', JSON.stringify(user))
  window.dispatchEvent(new Event('userLoggedIn'))
}

export function updateStoredAccessToken(accessToken: string) {
  if (typeof window === 'undefined') return
  const raw = localStorage.getItem('user')
  if (!raw) return
  try {
    const user = JSON.parse(raw)
    user.access_token = accessToken
    localStorage.setItem('user', JSON.stringify(user))
  } catch {
    // ignore invalid stored session
  }
}

/** Returns true when a 401 means the session is gone (not a wrong admin password, etc.). */
export function isSessionExpiredAuthError(detail: string | undefined): boolean {
  if (!detail) return true
  const normalized = detail.toLowerCase()
  const nonSessionErrors = [
    'senha incorreta',
    'incorrect password',
    'invalid email',
    'invalid password',
  ]
  return !nonSessionErrors.some((msg) => normalized.includes(msg))
}

let refreshAccessTokenPromise: Promise<string | null> | null = null

async function refreshAccessTokenIfNeededImpl(force = false): Promise<string | null> {
  if (typeof window === 'undefined') return null
  if (!hasStoredUser()) return null

  const raw = localStorage.getItem('user')
  let storedToken: string | null = null
  if (raw) {
    try {
      storedToken = JSON.parse(raw).access_token || null
    } catch {
      storedToken = null
    }
  }

  if (!storedToken) return null

  const syncBackendJwt = async (token: string): Promise<string | null> => {
    try {
      const user = await refreshUserFromBackend(token)
      updateStoredAccessToken(user.access_token)
      return user.access_token
    } catch (error) {
      if (error instanceof AuthApiError && error.isNetworkError) {
        return storedToken
      }
      return null
    }
  }

  try {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (session?.access_token) {
      const expiresAt = session.expires_at ?? 0
      const now = Math.floor(Date.now() / 1000)
      const shouldRefresh = force || (expiresAt > 0 && expiresAt - now < 120)

      if (shouldRefresh) {
        const { data: refreshed, error } = await supabase.auth.refreshSession()
        const supabaseToken = refreshed.session?.access_token
        if (!error && supabaseToken) {
          const backendToken = await syncBackendJwt(supabaseToken)
          if (backendToken) return backendToken
        }
      }

      if (force) {
        const backendToken = await syncBackendJwt(session.access_token)
        if (backendToken) return backendToken
      }

      return storedToken
    }
  } catch {
    // Fall through to stored token.
  }

  if (force) {
    const backendToken = await syncBackendJwt(storedToken)
    if (backendToken) return backendToken
  }

  return storedToken
}

/**
 * Refresh the Supabase OAuth session when the access token is close to expiry.
 * Only runs for users with a persisted app session (localStorage user).
 * Concurrent callers share one in-flight refresh to avoid token races.
 */
export async function refreshAccessTokenIfNeeded(force = false): Promise<string | null> {
  if (!refreshAccessTokenPromise) {
    refreshAccessTokenPromise = refreshAccessTokenIfNeededImpl(force).finally(() => {
      refreshAccessTokenPromise = null
    })
  }
  return refreshAccessTokenPromise
}
