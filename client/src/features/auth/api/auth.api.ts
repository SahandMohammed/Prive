// Remove the dead me() call from auth API — it now lives in users/api/users.api.ts
import { apiClient } from '@/lib/apiClient'
import type { LoginRequest, LoginResponse, ChangePasswordRequest } from '../types/auth.types'

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', body),
  // Refresh uses the httpOnly cookie — no body needed.
  refresh: () => apiClient.post<LoginResponse>('/auth/refresh'),
  logout: () => apiClient.post<void>('/auth/logout'),
  changePassword: (body: ChangePasswordRequest) =>
    apiClient.post<void>('/auth/change-password', body),
}
