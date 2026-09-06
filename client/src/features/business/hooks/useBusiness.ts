import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { PaginatedResponse } from '@/lib/apiResponse'
import { businessApi } from '../api/business.api'
import type { Branch, BranchInput, BusinessInput, Currency, CurrencyInput } from '../types/business.types'

export const BUSINESS_QUERY_KEY = ['business', 'current'] as const
export const CURRENCIES_QUERY_KEY = ['business', 'currencies'] as const
export const BRANCHES_QUERY_KEY = ['business', 'branches'] as const

export function useCurrentBusiness() {
  return useQuery({ queryKey: BUSINESS_QUERY_KEY, queryFn: businessApi.getCurrent, retry: false })
}

export function useSaveBusiness(hasExistingBusiness: boolean) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BusinessInput) => hasExistingBusiness ? businessApi.updateBusiness(body) : businessApi.createBusiness(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: BUSINESS_QUERY_KEY }),
  })
}

export function useCurrencies() {
  return useQuery({ queryKey: CURRENCIES_QUERY_KEY, queryFn: businessApi.listCurrencies })
}

export function useSaveCurrency(editingId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CurrencyInput) => editingId ? businessApi.updateCurrency(editingId, body) : businessApi.createCurrency(body),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: CURRENCIES_QUERY_KEY })
      const previous = queryClient.getQueryData<PaginatedResponse<Currency[]>>(CURRENCIES_QUERY_KEY)
      const optimisticId = editingId ?? `optimistic-${crypto.randomUUID()}`
      const optimisticCurrency: Currency = { id: optimisticId, ...input }

      queryClient.setQueryData<PaginatedResponse<Currency[]>>(CURRENCIES_QUERY_KEY, (current) => {
        if (!current) return current
        const data = editingId
          ? current.data.map((currency) => currency.id === editingId ? optimisticCurrency : currency)
          : [...current.data, optimisticCurrency]
        return { ...current, data: data.sort((left, right) => left.code.localeCompare(right.code)), meta: { ...current.meta, totalCount: editingId ? current.meta.totalCount : current.meta.totalCount + 1 } }
      })

      return { previous, optimisticId }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(CURRENCIES_QUERY_KEY, context?.previous)
    },
    onSuccess: (currency, _input, context) => {
      queryClient.setQueryData<PaginatedResponse<Currency[]>>(CURRENCIES_QUERY_KEY, (current) => current
        ? { ...current, data: current.data.map((item) => item.id === context.optimisticId ? currency : item) }
        : current)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: CURRENCIES_QUERY_KEY }),
  })
}

export function useBranches() {
  return useQuery({ queryKey: ['business', 'selected-branch'], queryFn: businessApi.selectedBranch })
}

export function useAllBranches() {
  return useQuery({ queryKey: BRANCHES_QUERY_KEY, queryFn: businessApi.listBranches })
}

export function useSaveBranch(editingId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: BranchInput) => editingId ? businessApi.updateBranch(editingId, body) : businessApi.createBranch(body),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: BRANCHES_QUERY_KEY })
      const previous = queryClient.getQueryData<PaginatedResponse<Branch[]>>(BRANCHES_QUERY_KEY)
      const optimisticId = editingId ?? `optimistic-${crypto.randomUUID()}`
      const optimisticBranch: Branch = { id: optimisticId, ...input }

      queryClient.setQueryData<PaginatedResponse<Branch[]>>(BRANCHES_QUERY_KEY, (current) => {
        if (!current) return current
        const currentBranches = input.isMainBranch
          ? current.data.map((branch) => ({ ...branch, isMainBranch: false }))
          : current.data
        const data = editingId
          ? currentBranches.map((branch) => branch.id === editingId ? optimisticBranch : branch)
          : [...currentBranches, optimisticBranch]
        return { ...current, data: sortBranches(data), meta: { ...current.meta, totalCount: editingId ? current.meta.totalCount : current.meta.totalCount + 1 } }
      })

      return { previous, optimisticId }
    },
    onError: (_error, _input, context) => {
      queryClient.setQueryData(BRANCHES_QUERY_KEY, context?.previous)
    },
    onSuccess: (branch, _input, context) => {
      queryClient.setQueryData<PaginatedResponse<Branch[]>>(BRANCHES_QUERY_KEY, (current) => current
        ? { ...current, data: current.data.map((item) => item.id === context.optimisticId ? branch : item) }
        : current)
    },
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY }), queryClient.invalidateQueries({ queryKey: ['branch-access'] })]),
  })
}

export function useDeactivateBranch() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: businessApi.deactivateBranch,
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: BRANCHES_QUERY_KEY })
      const previous = queryClient.getQueryData<PaginatedResponse<Branch[]>>(BRANCHES_QUERY_KEY)
      queryClient.setQueryData<PaginatedResponse<Branch[]>>(BRANCHES_QUERY_KEY, (current) => current
        ? { ...current, data: current.data.map((branch) => branch.id === id ? { ...branch, isActive: false } : branch) }
        : current)
      return { previous }
    },
    onError: (_error, _id, context) => {
      queryClient.setQueryData(BRANCHES_QUERY_KEY, context?.previous)
    },
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: BRANCHES_QUERY_KEY }), queryClient.invalidateQueries({ queryKey: ['branch-access'] })]),
  })
}

function sortBranches(branches: Branch[]) {
  return [...branches].sort((left, right) => Number(right.isMainBranch) - Number(left.isMainBranch) || left.name.localeCompare(right.name) || left.id.localeCompare(right.id))
}
