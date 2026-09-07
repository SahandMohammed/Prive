export interface DashboardSummary {
  todaySalesBase: number
  todaySalesCount: number
  todaySalesChangePercent: number | null
  todayCashReceivedBase: number
  todayCashPaidBase: number
  todayNetCashMovementBase: number
  customerReceivablesBase: number
  customerOutstandingInvoiceCount: number
  customerOutstandingCustomerCount: number
  supplierPayablesBase: number
  supplierOutstandingInvoiceCount: number
  supplierOutstandingSupplierCount: number
  todayExpensesBase: number
  todayExpenseCount: number
  outOfStockCount: number
  baseCurrencyCode: string
  baseCurrencySymbol: string
}

export interface DashboardTrendItem {
  date: string
  salesBase: number
  expensesBase: number
  netBase: number
}

export interface DashboardTrendResponse {
  items: DashboardTrendItem[]
  days: number
  baseCurrencyCode: string
  baseCurrencySymbol: string
}

export interface DashboardSalesMix {
  serviceRevenueBase: number
  serviceRevenuePercent: number
  productRevenueBase: number
  productRevenuePercent: number
  totalRevenueBase: number
  baseCurrencyCode: string
  baseCurrencySymbol: string
}

export interface DashboardRecentTransaction {
  id: string
  documentNumber: string
  transactionType: string
  timestampUtc: string
  amount: number
  currencyCode: string
  baseAmount: number
  direction: 'in' | 'out' | 'neutral'
  contactOrDescription: string | null
  targetUrl: string | null
}

export interface DashboardRecentActivity {
  id: string
  username: string
  action: string
  entityType: string
  documentNumber: string
  timestampUtc: string
  description: string | null
}
