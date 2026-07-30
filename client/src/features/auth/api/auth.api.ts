import { apiClient } from '@/lib/apiClient'
import type { LoginRequest, LoginResponse, ChangePasswordRequest, MeResponse } from '../types/auth.types'

export const authApi = {
  login: (body: LoginRequest) => apiClient.post<LoginResponse>('/auth/login', body),
  logout: () => apiClient.post<void>('/auth/logout'),
  changePassword: (body: ChangePasswordRequest) =>
    apiClient.post<void>('/auth/change-password', body),
  me: () => apiClient.get<MeResponse>('/auth/me'),
}
