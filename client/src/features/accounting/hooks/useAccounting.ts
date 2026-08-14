import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { accountingApi } from '../api/accounting.api'
import type { AccountInput, JournalInput } from '../types/accounting.types'

export const ACCOUNT_TREE_QUERY_KEY = ['accounting', 'accounts', 'tree'] as const
export const JOURNALS_QUERY_KEY = ['accounting', 'journals'] as const

export function useAccountTree(filters: Record<string, string | boolean | undefined | null> = {}) {
  return useQuery({ queryKey: [...ACCOUNT_TREE_QUERY_KEY, filters], queryFn: () => accountingApi.getAccountTree(filters) })
}

export function useSaveAccount(id: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AccountInput) => id ? accountingApi.updateAccount(id, body) : accountingApi.createAccount(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_TREE_QUERY_KEY }),
  })
}

export function useDeleteAccount() {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: accountingApi.deleteAccount, onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_TREE_QUERY_KEY }) })
}

export function useJournals(filters: Record<string, string | number | boolean | undefined | null> = {}) {
  return useQuery({ queryKey: [...JOURNALS_QUERY_KEY, filters], queryFn: () => accountingApi.getJournals(filters) })
}

export function useJournal(id: string | null) {
  return useQuery({
    queryKey: [...JOURNALS_QUERY_KEY, id],
    queryFn: () => id ? accountingApi.getJournal(id) : Promise.reject('No ID'),
    enabled: Boolean(id),
  })
}

export function useSaveJournal(id: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: JournalInput) => id ? accountingApi.updateJournal(id, body) : accountingApi.createJournal(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JOURNALS_QUERY_KEY }),
  })
}

export function useJournalActions() {
  const queryClient = useQueryClient()
  const refresh = () => queryClient.invalidateQueries({ queryKey: JOURNALS_QUERY_KEY })
  return {
    post: useMutation({ mutationFn: accountingApi.postJournal, onSuccess: refresh }),
    reverse: useMutation({ mutationFn: accountingApi.reverseJournal, onSuccess: refresh }),
    remove: useMutation({ mutationFn: accountingApi.deleteJournal, onSuccess: refresh }),
  }
}

export function useGeneralLedger(filters: Record<string, string | boolean | undefined | null>, enabled: boolean) {
  return useQuery({ queryKey: ['accounting', 'ledger', filters], queryFn: () => accountingApi.getLedger(filters), enabled })
}

export function useTrialBalance(filters: Record<string, string | boolean | undefined | null> = {}) {
  return useQuery({ queryKey: ['accounting', 'trial-balance', filters], queryFn: () => accountingApi.getTrialBalance(filters) })
}
