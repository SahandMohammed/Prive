import { apiClient } from '@/lib/apiClient'
import type { User, MeResponse, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest } from '../types/users.types'

export const usersApi = {
  list: () => apiClient.get<User[]>('/users'),
  getById: (id: string) => apiClient.get<User>(`/users/${id}`),
  create: (body: CreateUserRequest) => apiClient.post<User>('/users', body),
  update: (id: string, body: UpdateUserRequest) => apiClient.put<User>(`/users/${id}`, body),
  resetPassword: (userId: string, body: ResetPasswordRequest) =>
    apiClient.post<void>(`/users/${userId}/reset-password`, body),
  delete: (userId: string) => apiClient.delete<void>(`/users/${userId}`),

  // GET /users/me — returns the authenticated user's own profile.
  me: () => apiClient.get<MeResponse>('/users/me'),
}
