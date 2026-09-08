import { apiClient } from '@/lib/apiClient'
import type {
  ClosePosSessionInput,
  CompletePosSaleInput,
  OpenPosSessionInput,
  PosCatalogFilters,
  PosCatalogItem,
  PosCustomer,
  PosCustomerFilters,
  PosRegister,
  PosSale,
  PosSession,
  PosSessionFilters,
  PosSessionSummary,
  PosXReport,
  PosZReport,
  PosZReportFilters,
  PosZReportSummary,
  PosSetup,
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
  sale: (id: string) => apiClient.get<PosSale>(`/pos/sales/${id}`),
  complete: (body: CompletePosSaleInput) => apiClient.post<PosSale>('/pos/sales', body),

  registers: (includeInactive = false) =>
    apiClient.get<PosRegister[]>(`/pos/registers?includeInactive=${includeInactive}`),
  createRegister: (body: { code: string; name: string }) =>
    apiClient.post<PosRegister>('/pos/registers', body),
  updateRegister: (id: string, body: { code: string; name: string; isActive: boolean }) =>
    apiClient.put<PosRegister>(`/pos/registers/${id}`, body),

  activeSession: () => apiClient.get<PosSession | null>('/pos/sessions/active'),
  openSession: (body: OpenPosSessionInput) => apiClient.post<PosSession>('/pos/sessions/open', body),
  session: (id: string) => apiClient.get<PosSession>(`/pos/sessions/${id}`),
  sessions: (filters: PosSessionFilters) =>
    apiClient.getPaginated<PosSessionSummary>(`/pos/sessions?${queryString(filters)}`),
  xReport: (id: string) => apiClient.get<PosXReport>(`/pos/sessions/${id}/x-report`),
  closeSession: (id: string, body: ClosePosSessionInput) =>
    apiClient.post<PosZReport>(`/pos/sessions/${id}/close`, body),
  zReports: (filters: PosZReportFilters) =>
    apiClient.getPaginated<PosZReportSummary>(`/pos/z-reports?${queryString(filters)}`),
  zReport: (id: string) => apiClient.get<PosZReport>(`/pos/z-reports/${id}`),
}
