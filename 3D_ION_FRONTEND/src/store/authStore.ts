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
}

interface AuthState {
  user: User | null
  isLoading: boolean
  setUser: (user: User | null) => void
  setLoading: (isLoading: boolean) => void
  signOut: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: false,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () => {
    clearAuthStorage()
    set({ user: null })
  },
}))
