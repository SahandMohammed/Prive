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
  getUserBranchAccess: (userId: string) => apiClient.get<string[]>(`/branches/access/${userId}`),
  setUserBranchAccess: (userId: string, branchIds: string[]) => apiClient.put<void>(`/branches/access/${userId}`, { branchIds }),
  getCurrent: () => apiClient.get<Business>('/business/current'),
  createBusiness: (body: BusinessInput) => apiClient.post<Business>('/business', body),
  updateBusiness: (body: BusinessInput) => apiClient.put<Business>('/business/current', body),

  listCurrencies: () => apiClient.getPaginated<Currency>('/currencies?page=1&pageSize=100'),
  createCurrency: (body: CurrencyInput) => apiClient.post<Currency>('/currencies', body),
  updateCurrency: (id: string, body: CurrencyInput) => apiClient.put<Currency>(`/currencies/${id}`, body),

  listAccessibleBranches: async () => {
    const branches: Branch[] = []
    let page = 1
    while (true) {
      const result = await apiClient.getPaginated<Branch>(`/branches/accessible?page=${page}&pageSize=100`)
      branches.push(...result.data)
      if (!result.meta.hasNextPage) return branches
      page++
    }
  },
  selectedBranch: async () => {
    const branch = await apiClient.get<Branch>('/branches/selected')
    return { data: [branch], meta: { page: 1, pageSize: 1, totalCount: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false } }
  },
  listBranches: () => apiClient.getPaginated<Branch>('/branches?page=1&pageSize=100'),
  createBranch: (body: BranchInput) => apiClient.post<Branch>('/branches', body),
  updateBranch: (id: string, body: BranchInput) => apiClient.put<Branch>(`/branches/${id}`, body),
  deactivateBranch: (id: string) => apiClient.delete<void>(`/branches/${id}`),
}
