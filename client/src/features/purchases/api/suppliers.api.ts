import { apiClient } from '@/lib/apiClient'
import type { CreateSupplierRequest, Supplier } from '../types/suppliers.types'

export const suppliersApi = {
  list: (params: { page: number; pageSize: number; search?: string; sortDirection?: string }) => {
    const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) })
    if (params.search) query.set('search', params.search)
    if (params.sortDirection) query.set('sortDirection', params.sortDirection)
    return apiClient.getPaginated<Supplier>(`/purchases/suppliers?${query}`)
  },
  create: (body: CreateSupplierRequest) => apiClient.post<Supplier>('/purchases/suppliers', body),
}
