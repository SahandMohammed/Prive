import { apiClient } from '@/lib/apiClient'
import type {
  Branch,
  Business,
  BusinessInput,
  Currency,
  CurrencyInput,
  BranchInput,
} from '../types/business.types'

export const businessApi = {
  getCurrent: () => apiClient.get<Business>('/business/current'),
  createBusiness: (body: BusinessInput) => apiClient.post<Business>('/business', body),
  updateBusiness: (body: BusinessInput) => apiClient.put<Business>('/business/current', body),

  listCurrencies: () => apiClient.getPaginated<Currency>('/currencies?page=1&pageSize=100'),
  createCurrency: (body: CurrencyInput) => apiClient.post<Currency>('/currencies', body),
  updateCurrency: (id: string, body: CurrencyInput) => apiClient.put<Currency>(`/currencies/${id}`, body),

  listBranches: () => apiClient.getPaginated<Branch>('/branches?page=1&pageSize=100'),
  createBranch: (body: BranchInput) => apiClient.post<Branch>('/branches', body),
  updateBranch: (id: string, body: BranchInput) => apiClient.put<Branch>(`/branches/${id}`, body),
  deactivateBranch: (id: string) => apiClient.delete<void>(`/branches/${id}`),
}
