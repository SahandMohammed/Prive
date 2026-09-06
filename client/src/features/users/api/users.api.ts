import { apiClient } from '@/lib/apiClient'
import type { User, MeResponse, CreateUserRequest, UpdateUserRequest, ResetPasswordRequest, UserRole } from '../types/users.types'

const roles: UserRole[] = ['Unassigned', 'SuperAdmin', 'Owner', 'Manager', 'Professional', 'Cashier']
type ApiUser = Omit<User, 'role'> & { role: UserRole | number }
const normalizeUser = (user: ApiUser): User => ({ ...user, role: typeof user.role === 'number' ? roles[user.role] ?? 'Unassigned' : user.role })

export const usersApi = {
  list: async (page = 1, pageSize = 20, search?: string) => {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
    if (search) query.set('search', search)
    const result = await apiClient.getPaginated<ApiUser>(`/users?${query}`)
    return { ...result, data: result.data.map(normalizeUser) }
  },
  getById: (id: string) => apiClient.get<ApiUser>(`/users/${id}`).then(normalizeUser),
  create: (body: CreateUserRequest) => apiClient.post<ApiUser>('/users', { ...body, role: roles.indexOf(body.role) }).then(normalizeUser),
  update: (id: string, body: UpdateUserRequest) => apiClient.put<ApiUser>(`/users/${id}`, { ...body, role: roles.indexOf(body.role) }).then(normalizeUser),
  resetPassword: (userId: string, body: ResetPasswordRequest) =>
    apiClient.post<void>(`/users/${userId}/reset-password`, body),
  delete: (userId: string) => apiClient.delete<void>(`/users/${userId}`),

  // GET /users/me — returns the authenticated user's own profile.
  me: (): Promise<MeResponse> => apiClient.get<ApiUser>('/users/me').then(normalizeUser),
}
