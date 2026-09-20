import type { DashboardSummary, DashboardTrendResponse } from '../types/dashboard.types'
import { formatCompactNumber, formatDashboardAmount } from '../utils/dashboard.utils'
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  FileText,
} from 'lucide-react'

interface KpiCardsProps {
  summary?: DashboardSummary
  trendData?: DashboardTrendResponse
  isLoading?: boolean
}

function buildSparkline(values: number[], color: string, gradientId: string, width = 240, height = 32) {
  if (!values || values.length < 2) {
    const baselineY = height - 8
    return {
      points: `M 0 ${baselineY} L ${width} ${baselineY}`,
      areaPoints: `M 0 ${baselineY} L ${width} ${baselineY} L ${width} ${height} L 0 ${height} Z`,
      stroke: color,
      gradientId,
    }
  }

  const min = Math.min(...values, 0)
  const max = Math.max(...values, 1)
  const range = max - min || 1
  const paddingTop = 6
  const paddingBottom = 6
  const chartH = height - paddingTop - paddingBottom

  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width
    const y = paddingTop + chartH - ((v - min) / range) * chartH
    return { x, y }
  })

  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i === 0 ? 0 : i - 1]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1]

    const cp1x = (p1.x + (p2.x - p0.x) / 6).toFixed(1)
    const cp1y = (p1.y + (p2.y - p0.y) / 6).toFixed(1)
    const cp2x = (p2.x - (p3.x - p1.x) / 6).toFixed(1)
    const cp2y = (p2.y - (p3.y - p1.y) / 6).toFixed(1)

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
  }

  const areaPoints = `${d} L ${width} ${height} L 0 ${height} Z`
  return { points: d, areaPoints, stroke: color, gradientId }
}

export function KpiCards({ summary, trendData, isLoading }: KpiCardsProps) {
  if (isLoading || !summary) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-border bg-card p-5 shadow-xs animate-pulse space-y-4"
          >
            <div className="flex justify-between items-center">
              <div className="h-3.5 w-24 bg-muted rounded" />
              <div className="size-10 rounded-xl bg-muted" />
            </div>
            <div className="h-8 w-32 bg-muted rounded" />
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-8 w-full bg-muted/40 rounded-b-xl" />
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
    todayExpensesBase,
    todayExpenseCount,
    baseCurrencyCode,
  } = summary

  const isNetCashPositive = todayNetCashMovementBase >= 0

  const trendItems = trendData?.items ?? []
  const salesHistory = trendItems.map((d) => d.salesBase)
  const netHistory = trendItems.map((d) => d.netBase)
  const expenseHistory = trendItems.map((d) => d.expensesBase)

  const cards = [
    {
      title: "Today's Sales",
      value: formatDashboardAmount(todaySalesBase, baseCurrencyCode),
      subtext: `${todaySalesCount} completed ${todaySalesCount === 1 ? 'sale' : 'sales'}`,
      change:
        todaySalesChangePercent !== null
          ? `${todaySalesChangePercent >= 0 ? '+' : ''}${todaySalesChangePercent}%`
          : null,
      changeLabel: 'vs yesterday',
      isPositive: (todaySalesChangePercent ?? 0) >= 0,
      icon: <TrendingUp className="size-5 text-orange-600 dark:text-orange-400" />,
      iconBg: 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40',
      color: '#EA580C',
      sparkline: buildSparkline(salesHistory, '#EA580C', 'kpi-spark-orange'),
    },
    {
      title: 'Net Cash Flow',
      value: `${isNetCashPositive ? '+' : '-'}${formatDashboardAmount(todayNetCashMovementBase, baseCurrencyCode)}`,
      subtext:
        todayCashReceivedBase > 0 || todayCashPaidBase > 0
          ? `In: +${formatCompactNumber(todayCashReceivedBase)} • Out: -${formatCompactNumber(todayCashPaidBase)}`
          : 'Operational movement',
      change: isNetCashPositive ? '+Inflow' : '-Outflow',
      changeLabel: 'Today',
      isPositive: isNetCashPositive,
      icon: <Wallet className="size-5 text-teal-600 dark:text-teal-400" />,
      iconBg: 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/40',
      color: '#0D9488',
      sparkline: buildSparkline(netHistory, '#0D9488', 'kpi-spark-teal'),
    },
    {
      title: "Today's Expenses",
      value: formatDashboardAmount(todayExpensesBase, baseCurrencyCode),
      subtext: `${todayExpenseCount} posted ${todayExpenseCount === 1 ? 'voucher' : 'vouchers'}`,
      change: todayExpensesBase > 0 ? 'Recorded' : null,
      changeLabel: 'Posted vouchers',
      isPositive: false,
      icon: <Receipt className="size-5 text-sky-600 dark:text-sky-400" />,
      iconBg: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/40',
      color: '#0284C7',
      sparkline: buildSparkline(expenseHistory, '#0284C7', 'kpi-spark-sky'),
    },
    {
      title: 'Customer Receivables',
      value: formatDashboardAmount(customerReceivablesBase, baseCurrencyCode),
      subtext:
        customerOutstandingCustomerCount > 0
          ? `${customerOutstandingInvoiceCount} unpaid • ${customerOutstandingCustomerCount} ${customerOutstandingCustomerCount === 1 ? 'client' : 'clients'}`
          : `${customerOutstandingInvoiceCount} unpaid ${customerOutstandingInvoiceCount === 1 ? 'invoice' : 'invoices'}`,
      change: customerOutstandingInvoiceCount > 0 ? `${customerOutstandingInvoiceCount} pending` : null,
      changeLabel: 'Pending collection',
      isPositive: true,
      icon: <FileText className="size-5 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40',
      color: '#F59E0B',
      sparkline: buildSparkline(
        salesHistory.map((s, i) => s * 0.4 + (customerReceivablesBase / (salesHistory.length || 1)) * (i + 1) * 0.1),
        '#F59E0B',
        'kpi-spark-amber'
      ),
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="rounded-2xl border border-border/80 bg-card shadow-xs hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between overflow-hidden relative pt-5"
        >
          {/* Card Top Row: Label & Micro-accent Icon */}
          <div className="px-5 flex items-start justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {card.title}
            </span>
            <div
              className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${card.iconBg}`}
            >
              {card.icon}
            </div>
          </div>

          {/* Metric Value */}
          <div className="px-5 mt-1">
            <div className="text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight">
              {card.value}
            </div>

            {/* Trend percentage & subtext */}
            <div className="mt-2 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                {card.change ? (
                  <>
                    <span
                      className={`inline-flex items-center gap-0.5 font-semibold text-xs ${
                        card.isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {card.isPositive ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                      {card.change}
                    </span>
                    <span className="text-muted-foreground text-[11px] truncate">{card.changeLabel}</span>
                  </>
                ) : (
                  <span className="text-muted-foreground text-[11px] truncate">{card.changeLabel}</span>
                )}
              </div>
              {card.subtext && (
                <span className="text-muted-foreground text-[11px] truncate shrink-0">{card.subtext}</span>
              )}
            </div>
          </div>

          {/* Bottom Dynamic Wavy Sparkline bleeding edge to edge */}
          <div className="w-full h-8 mt-3 relative overflow-hidden">
            <svg
              viewBox="0 0 240 32"
              preserveAspectRatio="none"
              className="w-full h-full block overflow-visible"
            >
              <defs>
                <linearGradient id={card.sparkline.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={card.color} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={card.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={card.sparkline.areaPoints}
                fill={`url(#${card.sparkline.gradientId})`}
              />
              <path
                d={card.sparkline.points}
                fill="none"
                stroke={card.sparkline.stroke}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
