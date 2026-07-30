import { create } from 'zustand'
import { setAccessToken } from '@/lib/apiClient'

interface AuthSessionState {
  isAuthenticated: boolean
  mustChangePassword: boolean
  setSession: (accessToken: string, mustChangePassword: boolean) => void
  clearSession: () => void
}

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  isAuthenticated: false,
  mustChangePassword: false,
  setSession: (accessToken, mustChangePassword) => {
    setAccessToken(accessToken)
    set({ isAuthenticated: true, mustChangePassword })
  },
  clearSession: () => {
    setAccessToken(null)
    set({ isAuthenticated: false, mustChangePassword: false })
  },
}))
