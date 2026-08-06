import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { suppliersApi } from '../api/suppliers.api'
import type { CreateSupplierRequest } from '../types/suppliers.types'

export const SUPPLIERS_QUERY_KEY = ['purchases', 'suppliers'] as const

export function useSuppliers() {
  return useQuery({
    queryKey: SUPPLIERS_QUERY_KEY,
    queryFn: suppliersApi.list,
  })
}

export function useCreateSupplier() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSupplierRequest) => suppliersApi.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUPPLIERS_QUERY_KEY }),
  })
}
