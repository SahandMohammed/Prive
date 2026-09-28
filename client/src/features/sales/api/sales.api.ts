import { apiClient } from '@/lib/apiClient'
import type {
  SalesInvoice,
  SalesInvoiceDraftInput,
  SalesInvoiceFilters,
  PostedSalesInvoiceInput,
  SalesInvoiceHistory,
  DeletedSalesInvoice,
  DeletedSalesInvoiceFilters,
  SalesInvoiceSummary,
  Service,
  ServiceCategory,
  ServiceCategoryInput,
  ServiceInput,
} from '../types/sales.types'

function queryString(values: object) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]: [string, string | number | boolean | undefined]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const salesApi = {
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
  createInvoice: (body: SalesInvoiceDraftInput) => apiClient.post<SalesInvoice>('/sales/invoices', body),
  updateInvoice: (id: string, body: SalesInvoiceDraftInput) => apiClient.put<SalesInvoice>(`/sales/invoices/${id}`, body),
  deleteInvoice: (id: string) => apiClient.delete<void>(`/sales/invoices/${id}`),
  postInvoice: (id: string) => apiClient.post<SalesInvoice>(`/sales/invoices/${id}/post`),
  updatePostedInvoice: (id: string, body: PostedSalesInvoiceInput) => apiClient.put<SalesInvoice>(`/sales/invoices/${id}/posted`, body),
  deletePostedInvoice: (id: string, body: { reason: string; expectedUpdatedAtUtc: string }) => apiClient.delete<void>(`/sales/invoices/${id}/posted`, body),
  invoiceHistory: (id: string) => apiClient.get<SalesInvoiceHistory[]>(`/sales/invoices/${id}/history`),
  deletedInvoices: (filters: DeletedSalesInvoiceFilters) =>
    apiClient.getPaginated<DeletedSalesInvoice>(`/sales/invoices/deleted?${queryString(filters)}`),
}
