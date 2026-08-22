import { apiClient } from '@/lib/apiClient'
import type {
  CompletePosSaleInput,
  PosCatalogFilters,
  PosCatalogItem,
  PosCustomer,
  PosCustomerFilters,
  PosSale,
  PosSetup,
} from '../types/pos.types'

function queryString(values: object) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]: [string, string | number | undefined]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const posApi = {
  setup: () => apiClient.get<PosSetup>('/pos/setup'),
  catalog: (filters: PosCatalogFilters) =>
    apiClient.getPaginated<PosCatalogItem>(`/pos/catalog?${queryString(filters)}`),
  customers: (filters: PosCustomerFilters) =>
    apiClient.getPaginated<PosCustomer>(`/pos/customers?${queryString(filters)}`),
  sale: (id: string) => apiClient.get<PosSale>(`/pos/sales/${id}`),
  complete: (body: CompletePosSaleInput) => apiClient.post<PosSale>('/pos/sales', body),
}
