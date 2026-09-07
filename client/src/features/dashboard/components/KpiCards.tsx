import type { DashboardSummary } from '../types/dashboard.types'
import { formatDashboardAmount } from '../utils/dashboard.utils'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowDownLeft,
  ArrowUpRight,
} from 'lucide-react'

interface KpiCardsProps {
  summary?: DashboardSummary
  isLoading?: boolean
}

export function KpiCards({ summary, isLoading }: KpiCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border/70 bg-card p-4 shadow-xs animate-pulse space-y-3"
          >
            <div className="h-3 w-24 bg-muted rounded" />
            <div className="h-7 w-32 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
          </div>
        ))}
      </div>
    )
  }

  const {
    todaySalesBase,
    todaySalesCount,
    todaySalesChangePercent,
    todayCashReceivedBase,
    todayCashPaidBase,
    todayNetCashMovementBase,
    customerReceivablesBase,
    customerOutstandingInvoiceCount,
    customerOutstandingCustomerCount,
    supplierPayablesBase,
    supplierOutstandingInvoiceCount,
    todayExpensesBase,
    todayExpenseCount,
    baseCurrencyCode,
  } = summary

  const isNetCashPositive = todayNetCashMovementBase >= 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {/* 1. Today's Sales */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Sales</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-heading text-foreground tracking-tight">
            {formatDashboardAmount(todaySalesBase, baseCurrencyCode)}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs">
          <span className="text-muted-foreground font-medium">
            {todaySalesCount} completed {todaySalesCount === 1 ? 'sale' : 'sales'}
          </span>
          {todaySalesChangePercent !== null && (
            <span
              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded font-semibold text-[11px] ${
                todaySalesChangePercent >= 0
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/20'
              }`}
            >
              {todaySalesChangePercent >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {todaySalesChangePercent >= 0 ? `+${todaySalesChangePercent}%` : `${todaySalesChangePercent}%`}
            </span>
          )}
        </div>
      </div>

      {/* 2. Net Cash Movement Today */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Net Cash Flow</span>
            <div className="p-1.5 rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-bold font-heading tracking-tight ${
              isNetCashPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {isNetCashPositive ? '+' : '-'}
            {formatDashboardAmount(todayNetCashMovementBase, baseCurrencyCode)}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            In: <strong className="text-foreground font-semibold">+{formatDashboardAmount(todayCashReceivedBase, '')}</strong>
          </span>
          <span>•</span>
          <span>
            Out: <strong className="text-foreground font-semibold">-{formatDashboardAmount(todayCashPaidBase, '')}</strong>
          </span>
        </div>
      </div>

      {/* 3. Today's Expenses */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Expenses</span>
            <div className="p-1.5 rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              <Receipt className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-heading text-foreground tracking-tight">
            {formatDashboardAmount(todayExpensesBase, baseCurrencyCode)}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>{todayExpenseCount} posted {todayExpenseCount === 1 ? 'voucher' : 'vouchers'}</span>
          <span className="text-[11px] font-medium text-muted-foreground/90">Drafts excluded</span>
        </div>
      </div>

      {/* 4. Customer Receivables */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Receivables</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <ArrowDownLeft className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-heading text-foreground tracking-tight">
            {formatDashboardAmount(customerReceivablesBase, baseCurrencyCode)}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>{customerOutstandingInvoiceCount} unpaid {customerOutstandingInvoiceCount === 1 ? 'invoice' : 'invoices'}</span>
          {customerOutstandingCustomerCount > 0 && (
            <span className="font-semibold text-foreground/90">{customerOutstandingCustomerCount} {customerOutstandingCustomerCount === 1 ? 'client' : 'clients'}</span>
          )}
        </div>
      </div>

      {/* 5. Supplier Payables */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-xs hover:shadow-md hover:border-primary/30 transition-all flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Payables</span>
            <div className="p-1.5 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-bold font-heading text-foreground tracking-tight">
            {formatDashboardAmount(supplierPayablesBase, baseCurrencyCode)}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
          <span>{supplierOutstandingInvoiceCount} unpaid {supplierOutstandingInvoiceCount === 1 ? 'bill' : 'bills'}</span>
          <span className="text-[11px] font-medium text-muted-foreground/90">Pending settle</span>
        </div>
      </div>
    </div>
  )
}
