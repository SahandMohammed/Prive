import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { posApi } from '../api/pos.api'
import type { PosCatalogFilters, PosCustomerFilters } from '../types/pos.types'

export const POS_KEY = ['pos'] as const

export const usePosSetup = () =>
  useQuery({ queryKey: [...POS_KEY, 'setup'], queryFn: posApi.setup })
export const usePosCatalog = (filters: PosCatalogFilters) =>
  useQuery({ queryKey: [...POS_KEY, 'catalog', filters], queryFn: () => posApi.catalog(filters) })
export const usePosCustomers = (filters: PosCustomerFilters) =>
  useQuery({
    queryKey: [...POS_KEY, 'customers', filters],
    queryFn: () => posApi.customers(filters),
  })
export const usePosSale = (id?: string) =>
  useQuery({
    queryKey: [...POS_KEY, 'sales', id],
    queryFn: () => posApi.sale(id!),
    enabled: Boolean(id),
  })

export function useCompletePosSale() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: posApi.complete,
    onSuccess: (sale) => {
      client.setQueryData([...POS_KEY, 'sales', sale.id], sale)
      client.invalidateQueries({ queryKey: [...POS_KEY, 'setup'] })
      client.invalidateQueries({ queryKey: [...POS_KEY, 'catalog'] })
      client.invalidateQueries({ queryKey: ['sales'] })
      client.invalidateQueries({ queryKey: ['inventory'] })
      client.invalidateQueries({ queryKey: ['finance'] })
      return client.invalidateQueries({ queryKey: ['accounting'] })
    },
    onError: () => client.invalidateQueries({ queryKey: [...POS_KEY, 'setup'] }),
  })
}
