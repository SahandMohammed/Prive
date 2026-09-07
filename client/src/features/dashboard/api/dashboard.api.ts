import { apiClient } from '@/lib/apiClient'
import type {
  DashboardSummary,
  DashboardTrendResponse,
  DashboardSalesMix,
  DashboardRecentTransaction,
  DashboardRecentActivity,
} from '../types/dashboard.types'

export const dashboardApi = {
  getSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary'),
  getTrends: (days = 14) => apiClient.get<DashboardTrendResponse>(`/dashboard/trends?days=${days}`),
  getSalesMix: () => apiClient.get<DashboardSalesMix>('/dashboard/sales-mix'),
  getRecentTransactions: (limit = 10) =>
    apiClient.get<DashboardRecentTransaction[]>(`/dashboard/recent-transactions?limit=${limit}`),
  getRecentActivity: (limit = 10) =>
    apiClient.get<DashboardRecentActivity[]>(`/dashboard/recent-activity?limit=${limit}`),
}
