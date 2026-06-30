import { create } from 'zustand'
import { clearAuthStorage } from '@/lib/auth-storage'

export interface User {
  user_id: string
  name: string
  email: string
  institution: string
  phone_number: string
  instagram?: string
  country?: string
  language?: string
  user_type: string
  needs_profile_completion?: boolean
  access_token?: string
}

interface AuthState {
  user: User | null
  isLoading: boolean
  sessionReady: boolean
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  setSessionReady: (sessionReady: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  sessionReady: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setSessionReady: (sessionReady) => set({ sessionReady }),
  signOut: () => {
    clearAuthStorage()
    set({ user: null, sessionReady: false })
  },
}))
