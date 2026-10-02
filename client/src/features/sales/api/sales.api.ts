import { apiClient } from '@/lib/apiClient'
import type {
  InvoicePaymentInput,
  UpdateInvoicePaymentInput,
  SalesInvoice,
  SalesInvoiceDraftInput,
  SalesInvoiceFilters,
  PostedSalesInvoiceInput,
  SalesInvoiceHistory,
  DeletedSalesInvoice,
  DeletedSalesInvoiceFilters,
  SalesInvoiceSummary,
  SalesCatalogItem,
  Service,
  ServiceCategory,
  ServiceCategoryInput,
  ServiceInput,
} from '../types/sales.types'
import type { Payment } from '@/features/finance'

function queryString(values: object) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]: [string, string | number | boolean | undefined]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const salesApi = {
  items: (filters: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.getPaginated<SalesCatalogItem>(`/sales/items?${queryString({ page: 1, pageSize: 50, ...filters })}`),

  categories: (filters: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.getPaginated<ServiceCategory>(`/sales/service-categories?${queryString({ page: 1, pageSize: 100, ...filters })}`),
  createCategory: (body: ServiceCategoryInput) => apiClient.post<ServiceCategory>('/sales/service-categories', body),
  updateCategory: (id: string, body: ServiceCategoryInput) => apiClient.put<ServiceCategory>(`/sales/service-categories/${id}`, body),
  deleteCategory: (id: string) => apiClient.delete<void>(`/sales/service-categories/${id}`),

  services: (filters: Record<string, string | number | boolean | undefined> = {}) =>
    apiClient.getPaginated<Service>(`/sales/services?${queryString({ page: 1, pageSize: 100, ...filters })}`),
  getService: (id: string) => apiClient.get<Service>(`/sales/services/${id}`),
  createService: (body: ServiceInput) => apiClient.post<Service>('/sales/services', body),
  updateService: (id: string, body: ServiceInput) => apiClient.put<Service>(`/sales/services/${id}`, body),
  deleteService: (id: string) => apiClient.delete<void>(`/sales/services/${id}`),

  invoices: (filters: SalesInvoiceFilters) =>
    apiClient.getPaginated<SalesInvoiceSummary>(`/sales/invoices?${queryString(filters)}`),
  getInvoice: (id: string) => apiClient.get<SalesInvoice>(`/sales/invoices/${id}`),
  createActiveInvoice: (body: SalesInvoiceDraftInput) => apiClient.post<SalesInvoice>('/sales/invoices/active', body),
  updateActiveInvoice: (id: string, body: PostedSalesInvoiceInput) => apiClient.put<SalesInvoice>(`/sales/invoices/${id}/active`, body),
  deleteActiveInvoice: (id: string, body: { reason: string; expectedUpdatedAtUtc: string }) => apiClient.delete<void>(`/sales/invoices/${id}/active`, body),
  invoiceHistory: (id: string) => apiClient.get<SalesInvoiceHistory[]>(`/sales/invoices/${id}/history`),
  deletedInvoices: (filters: DeletedSalesInvoiceFilters) =>
    apiClient.getPaginated<DeletedSalesInvoice>(`/sales/invoices/deleted?${queryString(filters)}`),
  createInvoicePayment: (invoiceId: string, body: InvoicePaymentInput) => apiClient.post<Payment>(`/sales/invoices/${invoiceId}/payments`, body),
  updateInvoicePayment: (invoiceId: string, paymentId: string, body: UpdateInvoicePaymentInput) => apiClient.put<Payment>(`/sales/invoices/${invoiceId}/payments/${paymentId}`, body),
  deleteInvoicePayment: (invoiceId: string, paymentId: string, body: { reason: string; expectedUpdatedAtUtc: string }) => apiClient.delete<void>(`/sales/invoices/${invoiceId}/payments/${paymentId}`, body),
}
