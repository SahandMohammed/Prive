import { apiClient } from '@/lib/apiClient'
import type { User, CreateUserRequest, ResetPasswordRequest } from '../types/users.types'

export const usersApi = {
  list: () => apiClient.get<User[]>('/users'),
  create: (body: CreateUserRequest) => apiClient.post<User>('/users', body),
  resetPassword: (userId: string, body: ResetPasswordRequest) =>
    apiClient.post<void>(`/users/${userId}/reset-password`, body),
  delete: (userId: string) => apiClient.delete<void>(`/users/${userId}`),
}
