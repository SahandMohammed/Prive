import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { purchasesApi } from '../api/purchases.api'
import type { PurchaseInvoiceDraftInput, PurchaseInvoiceFilters } from '../types/purchase.types'

export const PURCHASES_QUERY_KEY = ['purchases', 'invoices'] as const

export function usePurchaseInvoices(filters: PurchaseInvoiceFilters) {
  return useQuery({ queryKey: [...PURCHASES_QUERY_KEY, filters], queryFn: () => purchasesApi.list(filters) })
}

export function usePurchaseInvoice(id?: string) {
  return useQuery({ queryKey: [...PURCHASES_QUERY_KEY, id], queryFn: () => purchasesApi.getById(id!), enabled: Boolean(id) })
}

export function useSavePurchaseInvoice(id?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: PurchaseInvoiceDraftInput) => id ? purchasesApi.update(id, body) : purchasesApi.create(body),
    onSuccess: (invoice) => {
      client.setQueryData([...PURCHASES_QUERY_KEY, invoice.id], invoice)
      return client.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
    },
  })
}

export function usePostPurchaseInvoice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: purchasesApi.post,
    onSuccess: (invoice) => {
      client.setQueryData([...PURCHASES_QUERY_KEY, invoice.id], invoice)
      client.invalidateQueries({ queryKey: ['inventory'] })
      client.invalidateQueries({ queryKey: ['accounting'] })
      return client.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY })
    },
  })
}

export function useDeletePurchaseInvoice() {
  const client = useQueryClient()
  return useMutation({ mutationFn: purchasesApi.delete, onSuccess: () => client.invalidateQueries({ queryKey: PURCHASES_QUERY_KEY }) })
}
