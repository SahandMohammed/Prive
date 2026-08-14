import { apiClient } from '@/lib/apiClient'
import type { PaginatedResponse } from '@/lib/apiResponse'
import type { Account, AccountInput, GeneralLedger, JournalEntry, JournalInput, TrialBalance } from '../types/accounting.types'

function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  })
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export const accountingApi = {
  getAccountTree: (filters: Record<string, string | boolean | undefined | null> = {}) =>
    apiClient.get<Account[]>(`/accounting/accounts/tree${query(filters)}`),
  createAccount: (body: AccountInput) => apiClient.post<Account>('/accounting/accounts', body),
  updateAccount: (id: string, body: AccountInput) => apiClient.put<Account>(`/accounting/accounts/${id}`, body),
  deleteAccount: (id: string) => apiClient.delete<void>(`/accounting/accounts/${id}`),
  getJournals: (filters: Record<string, string | number | boolean | undefined | null> = {}) =>
    apiClient.getPaginated<JournalEntry>(`/accounting/journals${query({ page: '1', pageSize: '10', ...filters })}`),
  getJournal: (id: string) => apiClient.get<JournalEntry>(`/accounting/journals/${id}`),
  createJournal: (body: JournalInput) => apiClient.post<JournalEntry>('/accounting/journals', body),
  updateJournal: (id: string, body: JournalInput) => apiClient.put<JournalEntry>(`/accounting/journals/${id}`, body),
  deleteJournal: (id: string) => apiClient.delete<void>(`/accounting/journals/${id}`),
  postJournal: (id: string) => apiClient.post<JournalEntry>(`/accounting/journals/${id}/post`),
  reverseJournal: (id: string) => apiClient.post<JournalEntry>(`/accounting/journals/${id}/reverse`),
  getLedger: (filters: Record<string, string | boolean | undefined | null>) =>
    apiClient.get<GeneralLedger>(`/accounting/general-ledger${query(filters)}`),
  getTrialBalance: (filters: Record<string, string | boolean | undefined | null> = {}) =>
    apiClient.get<TrialBalance>(`/accounting/trial-balance${query(filters)}`),
}

export type { PaginatedResponse }
