import { apiClient } from '@/lib/apiClient'
import type {
  CompletePosSaleInput,
  CorrectPosSettlementInput,
  CreatePosRefundInput,
  PosCatalogFilters,
  PosCatalogItem,
  PosCustomer,
  PosCustomerFilters,
  PosRefund,
  PosRefundability,
  PosRefundSummary,
  PosSale,
  PosSaleFilters,
  PosSaleSummary,
  PosSetup,
  VoidPosSaleInput,
} from '../types/pos.types'

function queryString(values: object) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  return query.toString()
}

export const posApi = {
  setup: () => apiClient.get<PosSetup>('/pos/setup'),
  catalog: (filters: PosCatalogFilters) =>
    apiClient.getPaginated<PosCatalogItem>(`/pos/catalog?${queryString(filters)}`),
  customers: (filters: PosCustomerFilters) =>
    apiClient.getPaginated<PosCustomer>(`/pos/customers?${queryString(filters)}`),
  sales: (filters: PosSaleFilters) =>
    apiClient.getPaginated<PosSaleSummary>(`/pos/sales?${queryString(filters)}`),
  sale: (id: string) => apiClient.get<PosSale>(`/pos/sales/${id}`),
  complete: (body: CompletePosSaleInput) =>
    apiClient.post<PosSale>('/pos/sales', { ...body, clientRequestId: body.clientRequestId ?? crypto.randomUUID() }),
  correctSettlement: (salesInvoiceId: string, body: CorrectPosSettlementInput) =>
    apiClient.put<PosSale>(`/pos/sales/${salesInvoiceId}/settlement`, body),
  refundability: (saleId: string) =>
    apiClient.get<PosRefundability>(`/pos/sales/${saleId}/refundability`),
  saleRefunds: (saleId: string) =>
    apiClient.getPaginated<PosRefundSummary>(`/pos/sales/${saleId}/refunds?page=1&pageSize=100`),
  refund: (id: string) => apiClient.get<PosRefund>(`/pos/refunds/${id}`),
  postRefund: (saleId: string, body: CreatePosRefundInput) =>
    apiClient.post<PosRefund>(`/pos/sales/${saleId}/refunds`, { ...body, clientRequestId: body.clientRequestId ?? crypto.randomUUID() }),
  voidSale: (saleId: string, body: VoidPosSaleInput) =>
    apiClient.post<PosRefund>(`/pos/sales/${saleId}/void`, { ...body, clientRequestId: body.clientRequestId ?? crypto.randomUUID() }),
}
