import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { dashboardApi } from '../api/dashboard.api'

vi.mock('@/features/business', () => ({
  useBranchSelectionStore: () => ({ branchId: 'branch-1' }),
  useBranchAccess: () => ({
    data: [{ id: 'branch-1', name: 'Prive Downtown', code: 'DT-01' }],
  }),
}))

const mockSummary = {
  todaySalesBase: 1250000,
  todaySalesCount: 14,
  todaySalesChangePercent: 8.5,
  todayCashReceivedBase: 1500000,
  todayCashPaidBase: 300000,
  todayNetCashMovementBase: 1200000,
  customerReceivablesBase: 450000,
  customerOutstandingInvoiceCount: 3,
  customerOutstandingCustomerCount: 2,
  supplierPayablesBase: 800000,
  supplierOutstandingInvoiceCount: 2,
  supplierOutstandingSupplierCount: 1,
  todayExpensesBase: 120000,
  todayExpenseCount: 2,
  outOfStockCount: 4,
  baseCurrencyCode: 'IQD',
  baseCurrencySymbol: 'IQD',
}

const mockTrends = {
  items: [
    { date: '2026-09-01', salesBase: 500000, expensesBase: 80000, netBase: 420000 },
    { date: '2026-09-02', salesBase: 700000, expensesBase: 120000, netBase: 580000 },
  ],
  days: 14,
  baseCurrencyCode: 'IQD',
  baseCurrencySymbol: 'IQD',
}

const mockSalesMix = {
  serviceRevenueBase: 720000,
  serviceRevenuePercent: 72,
  productRevenueBase: 280000,
  productRevenuePercent: 28,
  totalRevenueBase: 1000000,
  baseCurrencyCode: 'IQD',
  baseCurrencySymbol: 'IQD',
}

const mockTransactions = [
  {
    id: 'tx-1',
    documentNumber: 'POS-000041',
    transactionType: 'POS Sale',
    timestampUtc: new Date().toISOString(),
    amount: 35000,
    currencyCode: 'IQD',
    baseAmount: 35000,
    direction: 'in' as const,
    contactOrDescription: 'Ahmed',
    targetUrl: '/pos/sales/tx-1',
  },
]

const mockActivity = [
  {
    id: 'act-1',
    username: 'Ahmed',
    action: 'posted',
    entityType: 'POS Sale',
    documentNumber: 'POS-000041',
    timestampUtc: new Date().toISOString(),
    description: 'Completed sale at POS',
  },
]

describe('DashboardPage', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    vi.clearAllMocks()
  })

  function renderComponent() {
    return render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </QueryClientProvider>
    )
  }

  it('renders all main sections successfully with API data', async () => {
    vi.spyOn(dashboardApi, 'getSummary').mockResolvedValue(mockSummary)
    vi.spyOn(dashboardApi, 'getTrends').mockResolvedValue(mockTrends)
    vi.spyOn(dashboardApi, 'getSalesMix').mockResolvedValue(mockSalesMix)
    vi.spyOn(dashboardApi, 'getRecentTransactions').mockResolvedValue(mockTransactions)
    vi.spyOn(dashboardApi, 'getRecentActivity').mockResolvedValue(mockActivity)

    renderComponent()

    // Check Header
    expect(screen.getByText('Business Overview')).toBeInTheDocument()
    expect(screen.getByText(/PRIVE DOWNTOWN/)).toBeInTheDocument()

    // Check KPI Cards
    await waitFor(() => {
      expect(screen.getByText('1,250,000 IQD')).toBeInTheDocument()
      expect(screen.getByText(/14 completed sales/)).toBeInTheDocument()
      expect(screen.getByText('+8.5%')).toBeInTheDocument()
      expect(screen.getByText('+1,200,000 IQD')).toBeInTheDocument()
    })

    // Check Trend Chart
    expect(screen.getByText('Sales & Expense Trend')).toBeInTheDocument()

    // Check Sales Mix
    expect(screen.getByText('Sales Mix')).toBeInTheDocument()
    expect(screen.getByText('Services', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('(72%)')).toBeInTheDocument()
    expect(screen.getByText('Products', { selector: 'span' })).toBeInTheDocument()
    expect(screen.getByText('(28%)')).toBeInTheDocument()

    // Check Recent Transactions
    expect(screen.getByText('Recent Transactions')).toBeInTheDocument()
    expect(screen.getAllByText('POS-000041').length).toBe(2)
    expect(screen.getByText('+35,000 IQD')).toBeInTheDocument()

    // Check Recent Activity
    expect(screen.getByText('Recent Activity')).toBeInTheDocument()
    expect(screen.getAllByText('Ahmed').length).toBe(2)

    // Check Needs Attention Panel
    expect(screen.getByText('Needs Attention')).toBeInTheDocument()
    expect(screen.getByText('Out of Stock Products')).toBeInTheDocument()
    expect(screen.getByText('4 items out of stock')).toBeInTheDocument()
  })

  it('renders error state when an API request fails', async () => {
    vi.spyOn(dashboardApi, 'getSummary').mockRejectedValue(new Error('Network error loading summary'))
    vi.spyOn(dashboardApi, 'getTrends').mockResolvedValue(mockTrends)
    vi.spyOn(dashboardApi, 'getSalesMix').mockResolvedValue(mockSalesMix)
    vi.spyOn(dashboardApi, 'getRecentTransactions').mockResolvedValue(mockTransactions)
    vi.spyOn(dashboardApi, 'getRecentActivity').mockResolvedValue(mockActivity)

    renderComponent()

    await waitFor(() => {
      expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument()
      expect(screen.getByText(/Network error loading summary/)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument()
    })
  })

  it('renders empty state indicators when no data exists', async () => {
    vi.spyOn(dashboardApi, 'getSummary').mockResolvedValue({
      ...mockSummary,
      todaySalesBase: 0,
      todaySalesCount: 0,
      todaySalesChangePercent: null,
      todayNetCashMovementBase: 0,
      todayCashReceivedBase: 0,
      todayCashPaidBase: 0,
      customerReceivablesBase: 0,
      customerOutstandingInvoiceCount: 0,
      customerOutstandingCustomerCount: 0,
      supplierPayablesBase: 0,
      supplierOutstandingInvoiceCount: 0,
      supplierOutstandingSupplierCount: 0,
      todayExpensesBase: 0,
      todayExpenseCount: 0,
      outOfStockCount: 0,
    })
    vi.spyOn(dashboardApi, 'getTrends').mockResolvedValue({
      items: [],
      days: 14,
      baseCurrencyCode: 'IQD',
      baseCurrencySymbol: 'IQD',
    })
    vi.spyOn(dashboardApi, 'getSalesMix').mockResolvedValue({
      serviceRevenueBase: 0,
      serviceRevenuePercent: 0,
      productRevenueBase: 0,
      productRevenuePercent: 0,
      totalRevenueBase: 0,
      baseCurrencyCode: 'IQD',
      baseCurrencySymbol: 'IQD',
    })
    vi.spyOn(dashboardApi, 'getRecentTransactions').mockResolvedValue([])
    vi.spyOn(dashboardApi, 'getRecentActivity').mockResolvedValue([])

    renderComponent()

    await waitFor(() => {
      expect(screen.getAllByText(/0 IQD/).length).toBeGreaterThan(0)
      expect(screen.getByText('No transaction data for this period.')).toBeInTheDocument()
      expect(screen.getByText('No posted sales recorded')).toBeInTheDocument()
      expect(screen.getByText('No recent operational transactions in this branch.')).toBeInTheDocument()
      expect(screen.getByText('No recent activity recorded for this branch.')).toBeInTheDocument()
    })
  })
})
