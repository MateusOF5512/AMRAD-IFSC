import { createClient } from '@/lib/supabase/client'
import { getNormalizedApiUrl } from '@/lib/api'
import type { User } from '@/store/authStore'

export type AuthMode = 'login' | 'register'

function mapBackendUser(data: Record<string, unknown>): User & { access_token: string } {
  return {
    user_id: String(data.user_id || data.id),
    name: String(data.name || ''),
    email: String(data.email || ''),
    institution: String(data.institution || ''),
    phone_number: String(data.phone_number || ''),
    instagram: data.instagram ? String(data.instagram) : undefined,
    country: data.country ? String(data.country) : undefined,
    language: data.language ? String(data.language) : undefined,
    user_type: String(data.user_type || 'pesquisador'),
    needs_profile_completion: Boolean(data.needs_profile_completion),
    access_token: String(data.access_token),
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
  const apiUrl = getNormalizedApiUrl()
  const response = await fetch(`${apiUrl}/auth/oauth/session`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.detail || 'Failed to sync session')
  }

  const data = await response.json()
  const user = mapBackendUser(data)
  return {
    user,
    needsProfileCompletion: Boolean(data.needs_profile_completion),
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

  return mapBackendUser(data)
}

export async function signOutFromSupabase() {
  const supabase = createClient()
  await supabase.auth.signOut()
}

export function persistUserSession(user: User & { access_token: string }) {
  localStorage.setItem('user', JSON.stringify(user))
  window.dispatchEvent(new Event('userLoggedIn'))
}
