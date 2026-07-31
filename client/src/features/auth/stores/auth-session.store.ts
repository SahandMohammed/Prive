import { create } from 'zustand'
import { setAccessToken } from '@/lib/apiClient'

interface AuthSessionState {
  isAuthenticated: boolean
  mustChangePassword: boolean
  // Stored so the refresh interceptor can proactively refresh before expiry.
  // null when not logged in.
  accessTokenExpiresAtUtc: string | null
  setSession: (
    accessToken: string,
    accessTokenExpiresAtUtc: string,
    mustChangePassword: boolean,
  ) => void
  clearSession: () => void
}

export const useAuthSessionStore = create<AuthSessionState>((set) => ({
  isAuthenticated: false,
  mustChangePassword: false,
  accessTokenExpiresAtUtc: null,
  setSession: (accessToken, accessTokenExpiresAtUtc, mustChangePassword) => {
    setAccessToken(accessToken)
    set({ isAuthenticated: true, accessTokenExpiresAtUtc, mustChangePassword })
  },
  clearSession: () => {
    setAccessToken(null)
    set({ isAuthenticated: false, accessTokenExpiresAtUtc: null, mustChangePassword: false })
  },
}))
