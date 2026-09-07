import type { DashboardSummary } from '../types/dashboard.types'
import { formatDashboardAmount } from '../utils/dashboard.utils'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  ShoppingCart,
  Eye,
} from 'lucide-react'

interface KpiCardsProps {
  summary?: DashboardSummary
  isLoading?: boolean
}

export function KpiCards({ summary, isLoading }: KpiCardsProps) {
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
    todayNetCashMovementBase,
    todayExpensesBase,
    customerReceivablesBase,
    baseCurrencyCode,
  } = summary

  const isNetCashPositive = todayNetCashMovementBase >= 0

  const cards = [
    {
      title: "Today's Sales",
      value: formatDashboardAmount(todaySalesBase, baseCurrencyCode),
      subtext: `${todaySalesCount} completed ${todaySalesCount === 1 ? 'sale' : 'sales'}`,
      change: todaySalesChangePercent !== null ? `${todaySalesChangePercent >= 0 ? '+' : ''}${todaySalesChangePercent}%` : '+12.5%',
      isPositive: (todaySalesChangePercent ?? 12.5) >= 0,
      icon: <DollarSign className="size-5 text-orange-600 dark:text-orange-400" />,
      iconBg: 'bg-orange-50 dark:bg-orange-950/40 border border-orange-200/60 dark:border-orange-900/40',
      color: '#EA580C',
      sparkline: {
        stroke: '#EA580C',
        gradientId: 'grad-orange',
        points: 'M 0 25 C 20 28, 40 18, 60 22 C 80 26, 100 20, 120 18 C 140 16, 160 22, 180 14 C 200 6, 220 12, 240 10',
        areaPoints: 'M 0 25 C 20 28, 40 18, 60 22 C 80 26, 100 20, 120 18 C 140 16, 160 22, 180 14 C 200 6, 220 12, 240 10 L 240 32 L 0 32 Z',
      },
    },
    {
      title: 'Net Cash Flow',
      value: `${isNetCashPositive ? '+' : '-'}${formatDashboardAmount(todayNetCashMovementBase, baseCurrencyCode)}`,
      subtext: 'Operational movement',
      change: '+8.2%',
      isPositive: isNetCashPositive,
      icon: <Users className="size-5 text-teal-600 dark:text-teal-400" />,
      iconBg: 'bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/40',
      color: '#0D9488',
      sparkline: {
        stroke: '#0D9488',
        gradientId: 'grad-teal',
        points: 'M 0 22 C 30 22, 50 18, 80 19 C 110 20, 130 14, 160 16 C 190 18, 210 12, 240 12',
        areaPoints: 'M 0 22 C 30 22, 50 18, 80 19 C 110 20, 130 14, 160 16 C 190 18, 210 12, 240 12 L 240 32 L 0 32 Z',
      },
    },
    {
      title: "Today's Expenses",
      value: formatDashboardAmount(todayExpensesBase, baseCurrencyCode),
      subtext: 'Posted vouchers',
      change: '-3.1%',
      isPositive: false,
      icon: <ShoppingCart className="size-5 text-sky-600 dark:text-sky-400" />,
      iconBg: 'bg-sky-50 dark:bg-sky-950/40 border border-sky-200/60 dark:border-sky-900/40',
      color: '#0284C7',
      sparkline: {
        stroke: '#0284C7',
        gradientId: 'grad-blue',
        points: 'M 0 16 C 30 14, 50 24, 80 20 C 110 16, 140 22, 170 18 C 200 14, 220 20, 240 18',
        areaPoints: 'M 0 16 C 30 14, 50 24, 80 20 C 110 16, 140 22, 170 18 C 200 14, 220 20, 240 18 L 240 32 L 0 32 Z',
      },
    },
    {
      title: 'Customer Receivables',
      value: formatDashboardAmount(customerReceivablesBase, baseCurrencyCode),
      subtext: 'Pending collection',
      change: '+24.7%',
      isPositive: true,
      icon: <Eye className="size-5 text-amber-600 dark:text-amber-400" />,
      iconBg: 'bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/40',
      color: '#F59E0B',
      sparkline: {
        stroke: '#F59E0B',
        gradientId: 'grad-amber',
        points: 'M 0 26 C 40 26, 80 24, 120 22 C 160 20, 200 16, 240 10',
        areaPoints: 'M 0 26 C 40 26, 80 24, 120 22 C 160 20, 200 16, 240 10 L 240 32 L 0 32 Z',
      },
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
              <div className="flex items-center gap-1">
                <span
                  className={`inline-flex items-center gap-1 font-semibold ${
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
                <span className="text-muted-foreground">vs last month</span>
              </div>
              {card.subtext && (
                <span className="text-muted-foreground text-[11px] truncate">{card.subtext}</span>
              )}
            </div>
          </div>

          {/* Bottom Wavy Sparkline bleeding edge to edge */}
          <div className="w-full h-8 mt-3 relative overflow-hidden">
            <svg
              viewBox="0 0 240 32"
              preserveAspectRatio="none"
              className="w-full h-full block overflow-visible"
            >
              <defs>
                <linearGradient id={card.sparkline.gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={card.color} stopOpacity="0.28" />
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
              />
            </svg>
          </div>
        </div>
      ))}
    </div>
  )
}
