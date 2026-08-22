import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { salesApi } from '../api/sales.api'
import type { SalesInvoiceDraftInput, SalesInvoiceFilters, ServiceCategoryInput, ServiceInput } from '../types/sales.types'

export const SALES_CATEGORIES_KEY = ['sales', 'service-categories'] as const
export const SALES_SERVICES_KEY = ['sales', 'services'] as const
export const SALES_INVOICES_KEY = ['sales', 'invoices'] as const

export function useServiceCategories(filters: Record<string, string | number | boolean | undefined> = {}) {
  return useQuery({ queryKey: [...SALES_CATEGORIES_KEY, filters], queryFn: () => salesApi.categories(filters) })
}

export function useSaveServiceCategory(id: string | null) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ServiceCategoryInput) => id ? salesApi.updateCategory(id, body) : salesApi.createCategory(body),
    onSuccess: () => client.invalidateQueries({ queryKey: SALES_CATEGORIES_KEY }),
  })
}

export function useDeleteServiceCategory() {
  const client = useQueryClient()
  return useMutation({ mutationFn: salesApi.deleteCategory, onSuccess: () => client.invalidateQueries({ queryKey: SALES_CATEGORIES_KEY }) })
}

export function useServices(filters: Record<string, string | number | boolean | undefined> = {}) {
  return useQuery({ queryKey: [...SALES_SERVICES_KEY, filters], queryFn: () => salesApi.services(filters) })
}

export function useSaveService(id: string | null) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: ServiceInput) => id ? salesApi.updateService(id, body) : salesApi.createService(body),
    onSuccess: () => client.invalidateQueries({ queryKey: SALES_SERVICES_KEY }),
  })
}

export function useDeleteService() {
  const client = useQueryClient()
  return useMutation({ mutationFn: salesApi.deleteService, onSuccess: () => client.invalidateQueries({ queryKey: SALES_SERVICES_KEY }) })
}

export function useSalesInvoices(filters: SalesInvoiceFilters) {
  return useQuery({ queryKey: [...SALES_INVOICES_KEY, filters], queryFn: () => salesApi.invoices(filters) })
}

export function useSalesInvoice(id?: string) {
  return useQuery({ queryKey: [...SALES_INVOICES_KEY, id], queryFn: () => salesApi.getInvoice(id!), enabled: Boolean(id) })
}

export function useSaveSalesInvoice(id?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: SalesInvoiceDraftInput) => id ? salesApi.updateInvoice(id, body) : salesApi.createInvoice(body),
    onSuccess: (invoice) => {
      client.setQueryData([...SALES_INVOICES_KEY, invoice.id], invoice)
      return client.invalidateQueries({ queryKey: SALES_INVOICES_KEY })
    },
  })
}

export function usePostSalesInvoice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: salesApi.postInvoice,
    onSuccess: (invoice) => {
      client.setQueryData([...SALES_INVOICES_KEY, invoice.id], invoice)
      client.invalidateQueries({ queryKey: ['inventory'] })
      client.invalidateQueries({ queryKey: ['accounting'] })
      return client.invalidateQueries({ queryKey: SALES_INVOICES_KEY })
    },
  })
}

export function useDeleteSalesInvoice() {
  const client = useQueryClient()
  return useMutation({ mutationFn: salesApi.deleteInvoice, onSuccess: () => client.invalidateQueries({ queryKey: SALES_INVOICES_KEY }) })
}
