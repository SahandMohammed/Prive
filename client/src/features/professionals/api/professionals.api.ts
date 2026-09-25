import { apiClient } from '@/lib/apiClient'
import type { Professional, ProfessionalInput, ProfessionalListParams, ProfessionalUserOption } from '../types/professionals.types'

function queryString(params: Record<string, string | number | boolean | undefined>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const professionalsApi = {
  list: (params: ProfessionalListParams) => apiClient.getPaginated<Professional>(`/professionals?${queryString({
    page: params.page,
    pageSize: params.pageSize,
    search: params.search,
    isActive: params.isActive,
    branchId: params.branchId,
  })}`),
  getById: (id: string) => apiClient.get<Professional>(`/professionals/${id}`),
  create: (input: ProfessionalInput) => apiClient.post<Professional>('/professionals', input),
  update: (id: string, input: ProfessionalInput) => apiClient.put<Professional>(`/professionals/${id}`, input),
  activate: (id: string) => apiClient.post<void>(`/professionals/${id}/activate`),
  deactivate: (id: string) => apiClient.post<void>(`/professionals/${id}/deactivate`),
  delete: (id: string) => apiClient.delete<void>(`/professionals/${id}`),
  userOptions: (professionalId: string | null, search?: string) => apiClient.getPaginated<ProfessionalUserOption>(
    `/professionals/user-options?${queryString({ page: 1, pageSize: 100, professionalId: professionalId ?? undefined, search })}`),
}
