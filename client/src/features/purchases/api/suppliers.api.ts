import { apiClient } from '@/lib/apiClient'
import type { CreateSupplierRequest, Supplier } from '../types/suppliers.types'

export const suppliersApi = {
  list: () => apiClient.get<Supplier[]>('/purchases/suppliers'),
  create: (body: CreateSupplierRequest) => apiClient.post<Supplier>('/purchases/suppliers', body),
}
