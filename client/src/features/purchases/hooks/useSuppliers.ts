import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { suppliersApi } from '../api/suppliers.api'
import type { CreateSupplierRequest } from '../types/suppliers.types'

export const SUPPLIERS_QUERY_KEY = ['purchases', 'suppliers'] as const

export function useSuppliers(query: { page: number; pageSize: number; search?: string; sortDirection?: string }) {
  return useQuery({
    queryKey: [...SUPPLIERS_QUERY_KEY, query],
    queryFn: () => suppliersApi.list(query),
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSupplierRequest) => suppliersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY }),
  })
}
