import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { POS_Z_REPORT_KEY, POS_Z_REPORTS_KEY } from '@/features/pos'
import { salesApi } from '../api/sales.api'
import type { DeletedSalesInvoiceFilters, InvoicePaymentInput, PostedSalesInvoiceInput, SalesInvoiceFilters, ServiceCategoryInput, ServiceInput, UpdateInvoicePaymentInput } from '../types/sales.types'

export const SALES_ITEMS_KEY = ['sales', 'items'] as const
export const SALES_CATEGORIES_KEY = ['sales', 'service-categories'] as const
export const SALES_SERVICES_KEY = ['sales', 'services'] as const
export const SALES_INVOICES_KEY = ['sales', 'invoices'] as const

export function useSalesItems(filters: Record<string, string | number | boolean | undefined> = {}) {
  return useQuery({ queryKey: [...SALES_ITEMS_KEY, filters], queryFn: () => salesApi.items(filters) })
}

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

export function useCreateActiveSalesInvoice() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: salesApi.createActiveInvoice,
    onSuccess: (invoice) => {
      client.setQueryData([...SALES_INVOICES_KEY, invoice.id], invoice)
      client.invalidateQueries({ queryKey: ['inventory'] })
      client.invalidateQueries({ queryKey: ['accounting'] })
      client.invalidateQueries({ queryKey: ['finance'] })
      if (invoice.posContext) {
        client.invalidateQueries({ queryKey: ['pos', 'sales'] })
        client.invalidateQueries({ queryKey: ['pos', 'sessions'] })
        client.invalidateQueries({ queryKey: POS_Z_REPORTS_KEY })
        client.invalidateQueries({ queryKey: POS_Z_REPORT_KEY })
      }
      return client.invalidateQueries({ queryKey: SALES_INVOICES_KEY })
    },
  })
}

export function useUpdateActiveSalesInvoice(id?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: PostedSalesInvoiceInput) => salesApi.updateActiveInvoice(id!, body),
    onSuccess: (invoice) => {
      client.setQueryData([...SALES_INVOICES_KEY, invoice.id], invoice)
      client.invalidateQueries({ queryKey: ['inventory'] })
      client.invalidateQueries({ queryKey: ['accounting'] })
      client.invalidateQueries({ queryKey: ['finance'] })
      if (invoice.posContext) {
        client.invalidateQueries({ queryKey: ['pos', 'sales'] })
        client.invalidateQueries({ queryKey: ['pos', 'sessions'] })
        client.invalidateQueries({ queryKey: POS_Z_REPORTS_KEY })
        client.invalidateQueries({ queryKey: POS_Z_REPORT_KEY })
      }
      return client.invalidateQueries({ queryKey: SALES_INVOICES_KEY })
    },
  })
}

export function useInvoicePaymentActions(invoiceId: string) {
  const client = useQueryClient()
  const done = () => {
    client.invalidateQueries({ queryKey: SALES_INVOICES_KEY })
    client.invalidateQueries({ queryKey: ['finance'] })
    client.invalidateQueries({ queryKey: ['accounting'] })
  }
  return {
    create: useMutation({ mutationFn: (body: InvoicePaymentInput) => salesApi.createInvoicePayment(invoiceId, body), onSuccess: done }),
    update: useMutation({ mutationFn: ({ paymentId, body }: { paymentId: string; body: UpdateInvoicePaymentInput }) => salesApi.updateInvoicePayment(invoiceId, paymentId, body), onSuccess: done }),
    remove: useMutation({ mutationFn: ({ paymentId, reason, expectedUpdatedAtUtc }: { paymentId: string; reason: string; expectedUpdatedAtUtc: string }) => salesApi.deleteInvoicePayment(invoiceId, paymentId, { reason, expectedUpdatedAtUtc }), onSuccess: done }),
  }
}

export function useDeleteActiveSalesInvoice(id?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: { reason: string; expectedUpdatedAtUtc: string; id?: string }) => {
      const targetId = body.id ?? id
      if (!targetId) throw new Error('Invoice id is required for deletion')
      return salesApi.deleteActiveInvoice(targetId, {
        reason: body.reason,
        expectedUpdatedAtUtc: body.expectedUpdatedAtUtc,
      })
    },
    onSuccess: (_, variables) => {
      const targetId = variables.id ?? id
      if (targetId) client.removeQueries({ queryKey: [...SALES_INVOICES_KEY, targetId] })
      client.invalidateQueries({ queryKey: ['inventory'] })
      client.invalidateQueries({ queryKey: ['accounting'] })
      client.invalidateQueries({ queryKey: ['finance'] })
      client.invalidateQueries({ queryKey: ['pos', 'sales'] })
      client.invalidateQueries({ queryKey: ['pos', 'sessions'] })
      client.invalidateQueries({ queryKey: POS_Z_REPORTS_KEY })
      client.invalidateQueries({ queryKey: POS_Z_REPORT_KEY })
      return client.invalidateQueries({ queryKey: SALES_INVOICES_KEY })
    },
  })
}

export function useSalesInvoiceHistory(id?: string, enabled = true) {
  return useQuery({
    queryKey: [...SALES_INVOICES_KEY, id, 'history'],
    queryFn: () => salesApi.invoiceHistory(id!),
    enabled: Boolean(id) && enabled,
  })
}

export function useDeletedSalesInvoices(filters: DeletedSalesInvoiceFilters) {
  return useQuery({
    queryKey: [...SALES_INVOICES_KEY, 'deleted', filters],
    queryFn: () => salesApi.deletedInvoices(filters),
  })
}
