import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  dashboardKeys,
  useDashboardSummary,
  useDashboardTrends,
  useDashboardSalesMix,
  useDashboardRecentTransactions,
  useDashboardRecentActivity,
} from '../hooks/useDashboard'
import { DashboardHeader } from '../components/DashboardHeader'
import { KpiCards } from '../components/KpiCards'
import { SalesExpenseTrendChart } from '../components/SalesExpenseTrendChart'
import { SalesMixChart } from '../components/SalesMixChart'
import { RecentTransactionsTable } from '../components/RecentTransactionsTable'
import { RecentActivityList } from '../components/RecentActivityList'
import { NeedsAttentionPanel } from '../components/NeedsAttentionPanel'
import { AlertCircle, RotateCw } from 'lucide-react'

import { MonthlyGoalsCard } from '../components/MonthlyGoalsCard'

export function DashboardPage() {
  const queryClient = useQueryClient()
  const [selectedDays, setSelectedDays] = useState(14)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const summaryQuery = useDashboardSummary()
  const trendsQuery = useDashboardTrends(selectedDays)
  const salesMixQuery = useDashboardSalesMix()
  const transactionsQuery = useDashboardRecentTransactions(10)
  const activityQuery = useDashboardRecentActivity(10)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: dashboardKeys.all })
    setIsRefreshing(false)
  }

  const hasError =
    summaryQuery.isError ||
    trendsQuery.isError ||
    salesMixQuery.isError ||
    transactionsQuery.isError ||
    activityQuery.isError

  const errorMessage =
    summaryQuery.error?.message ||
    trendsQuery.error?.message ||
    salesMixQuery.error?.message ||
    transactionsQuery.error?.message ||
    activityQuery.error?.message ||
    'Failed to load dashboard data.'

  if (hasError) {
    return (
      <div className="space-y-6">
        <DashboardHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="size-8 text-destructive mx-auto mb-2" />
          <h3 className="text-sm font-semibold text-destructive">Error Loading Dashboard</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">{errorMessage}</p>
          <button
            type="button"
            onClick={handleRefresh}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <RotateCw className="size-3.5" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header with greeting */}
      <DashboardHeader onRefresh={handleRefresh} isRefreshing={isRefreshing} />

      {/* 2. Top 4 KPI Cards with Wavy Sparklines */}
      <KpiCards summary={summaryQuery.data} isLoading={summaryQuery.isLoading} />

      {/* 3. Main Dashboard Row matching Zenith reference: Overview Spline on Left, Traffic Sources + Monthly Goals on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Overview Monthly Spline Chart */}
        <div className="lg:col-span-7 xl:col-span-8">
          <SalesExpenseTrendChart
            data={trendsQuery.data}
            isLoading={trendsQuery.isLoading}
            selectedDays={selectedDays}
            onDaysChange={setSelectedDays}
          />
        </div>

        {/* Right Column: Traffic Sources & Monthly Goals */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <SalesMixChart
            data={salesMixQuery.data}
            isLoading={salesMixQuery.isLoading}
          />

          <MonthlyGoalsCard isLoading={summaryQuery.isLoading} />
        </div>
      </div>

      {/* 4. Operational Activity & Audit Trail Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start pt-2">
        {/* Left: Recent Transactions Table */}
        <div className="lg:col-span-7 xl:col-span-8">
          <RecentTransactionsTable
            transactions={transactionsQuery.data}
            isLoading={transactionsQuery.isLoading}
          />
        </div>

        {/* Right: Needs Attention & Team Activity */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          <NeedsAttentionPanel
            summary={summaryQuery.data}
            isLoading={summaryQuery.isLoading}
          />

          <RecentActivityList
            activities={activityQuery.data}
            isLoading={activityQuery.isLoading}
          />
        </div>
      </div>
    </div>
  )
}
