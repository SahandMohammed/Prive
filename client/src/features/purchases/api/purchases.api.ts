import { apiClient } from '@/lib/apiClient'
import type { PurchaseInvoice, PurchaseInvoiceDraftInput, PurchaseInvoiceFilters, PurchaseInvoiceSummary } from '../types/purchase.types'

function queryString(filters: PurchaseInvoiceFilters) {
  const query = new URLSearchParams({ page: String(filters.page), pageSize: String(filters.pageSize) })
  Object.entries(filters).forEach(([key, value]) => {
    if (key !== 'page' && key !== 'pageSize' && value !== undefined && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const purchasesApi = {
  list: (filters: PurchaseInvoiceFilters) => apiClient.getPaginated<PurchaseInvoiceSummary>(`/purchases/invoices?${queryString(filters)}`),
  getById: (id: string) => apiClient.get<PurchaseInvoice>(`/purchases/invoices/${id}`),
  create: (body: PurchaseInvoiceDraftInput) => apiClient.post<PurchaseInvoice>('/purchases/invoices', body),
  update: (id: string, body: PurchaseInvoiceDraftInput) => apiClient.put<PurchaseInvoice>(`/purchases/invoices/${id}`, body),
  delete: (id: string) => apiClient.delete<void>(`/purchases/invoices/${id}`),
  post: (id: string) => apiClient.post<PurchaseInvoice>(`/purchases/invoices/${id}/post`),
}
