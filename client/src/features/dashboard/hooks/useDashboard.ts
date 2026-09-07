import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard.api'

export const dashboardKeys = {
  all: ['dashboard'] as const,
  summary: () => [...dashboardKeys.all, 'summary'] as const,
  trends: (days: number) => [...dashboardKeys.all, 'trends', days] as const,
  salesMix: () => [...dashboardKeys.all, 'sales-mix'] as const,
  recentTransactions: (limit: number) => [...dashboardKeys.all, 'recent-transactions', limit] as const,
  recentActivity: (limit: number) => [...dashboardKeys.all, 'recent-activity', limit] as const,
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: () => dashboardApi.getSummary(),
    staleTime: 30_000,
  })
}

export function useDashboardTrends(days = 14) {
  return useQuery({
    queryKey: dashboardKeys.trends(days),
    queryFn: () => dashboardApi.getTrends(days),
    staleTime: 30_000,
  })
}

export function useDashboardSalesMix() {
  return useQuery({
    queryKey: dashboardKeys.salesMix(),
    queryFn: () => dashboardApi.getSalesMix(),
    staleTime: 30_000,
  })
}

export function useDashboardRecentTransactions(limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.recentTransactions(limit),
    queryFn: () => dashboardApi.getRecentTransactions(limit),
    staleTime: 30_000,
  })
}

export function useDashboardRecentActivity(limit = 10) {
  return useQuery({
    queryKey: dashboardKeys.recentActivity(limit),
    queryFn: () => dashboardApi.getRecentActivity(limit),
    staleTime: 30_000,
  })
}
