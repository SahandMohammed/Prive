import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { posApi } from '../api/pos.api'
import type { PosCatalogFilters, PosCustomerFilters, PosSaleFilters } from '../types/pos.types'

export const POS_KEY = ['pos'] as const

export const usePosSetup = () =>
  useQuery({ queryKey: [...POS_KEY, 'setup'], queryFn: posApi.setup })
export const usePosCatalog = (filters: PosCatalogFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'catalog', filters], queryFn: () => posApi.catalog(filters) })
export const usePosCustomers = (filters: PosCustomerFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'customers', filters], queryFn: () => posApi.customers(filters) })
export const usePosSales = (filters: PosSaleFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'sales', filters], queryFn: () => posApi.sales(filters) })
export const usePosSale = (id?: string) =>
  useQuery({ queryKey: [...POS_KEY, 'sales', id], queryFn: () => posApi.sale(id!), enabled: Boolean(id) })
export const usePosRefundability = (saleId?: string, enabled = true) =>
  useQuery({
    queryKey: [...POS_KEY, 'sales', saleId, 'refundability'],
    queryFn: () => posApi.refundability(saleId!),
    enabled: Boolean(saleId) && enabled,
  })
export const usePosRefund = (id?: string) =>
  useQuery({ queryKey: [...POS_KEY, 'refunds', id], queryFn: () => posApi.refund(id!), enabled: Boolean(id) })

function invalidateCommercialEffects(client: ReturnType<typeof useQueryClient>) {
  client.invalidateQueries({ queryKey: [...POS_KEY, 'setup'] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'catalog'] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'sales'] })
  client.invalidateQueries({ queryKey: ['sales'] })
  client.invalidateQueries({ queryKey: ['inventory'] })
  client.invalidateQueries({ queryKey: ['finance'] })
  client.invalidateQueries({ queryKey: ['accounting'] })
  client.invalidateQueries({ queryKey: ['dashboard'] })
}

export function useCompletePosSale() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: posApi.complete,
    onSuccess: (sale) => {
      client.setQueryData([...POS_KEY, 'sales', sale.id], sale)
      invalidateCommercialEffects(client)
    },
    onError: () => {
      client.invalidateQueries({ queryKey: [...POS_KEY, 'setup'] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'catalog'] })
    },
  })
}

export function useCorrectPosSettlement(salesInvoiceId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof posApi.correctSettlement>[1]) =>
      posApi.correctSettlement(salesInvoiceId, body),
    onSuccess: (sale) => {
      client.setQueryData([...POS_KEY, 'sales', sale.id], sale)
      invalidateCommercialEffects(client)
    },
  })
}

function invalidateRefundEffects(client: ReturnType<typeof useQueryClient>, saleId: string) {
  client.invalidateQueries({ queryKey: [...POS_KEY, 'sales', saleId] })
  client.invalidateQueries({ queryKey: [...POS_KEY, 'sales', saleId, 'refundability'] })
  invalidateCommercialEffects(client)
}

export function usePostPosRefund() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ saleId, body }: { saleId: string; body: Parameters<typeof posApi.postRefund>[1] }) =>
      posApi.postRefund(saleId, body),
    onSuccess: (refund) => {
      client.setQueryData([...POS_KEY, 'refunds', refund.id], refund)
      invalidateRefundEffects(client, refund.salesInvoiceId)
    },
  })
}

export function useVoidPosSale() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ saleId, body }: { saleId: string; body: Parameters<typeof posApi.voidSale>[1] }) =>
      posApi.voidSale(saleId, body),
    onSuccess: (refund) => {
      client.setQueryData([...POS_KEY, 'refunds', refund.id], refund)
      invalidateRefundEffects(client, refund.salesInvoiceId)
    },
  })
}
