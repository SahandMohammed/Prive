import type { DashboardSalesMix } from '../types/dashboard.types'
import { formatDashboardAmount } from '../utils/dashboard.utils'

interface SalesMixChartProps {
  data?: DashboardSalesMix
  isLoading?: boolean
}

interface SourceItem {
  name: string
  percent: number
  color: string
  amount: string
}

export function SalesMixChart({ data, isLoading }: SalesMixChartProps = {}) {
  const hasEmptyData = !data || data.totalRevenueBase === 0
  const currency = data?.baseCurrencyCode ?? 'IQD'

  const sources: SourceItem[] = data && data.totalRevenueBase > 0
    ? [
        {
          name: 'Services',
          percent: data.serviceRevenuePercent,
          color: '#EA580C',
          amount: formatDashboardAmount(data.serviceRevenueBase, currency),
        },
        {
          name: 'Products',
          percent: data.productRevenuePercent,
          color: '#0D9488',
          amount: formatDashboardAmount(data.productRevenueBase, currency),
        },
      ]
    : [
        { name: 'Services', percent: 0, color: '#EA580C', amount: formatDashboardAmount(0, currency) },
        { name: 'Products', percent: 0, color: '#0D9488', amount: formatDashboardAmount(0, currency) },
      ]

  // Donut SVG parameters
  const size = 140
  const strokeWidth = 20
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  let accumulatedPercent = 0

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      <div>
        <h2 className="text-base font-bold font-heading text-foreground">Sales Mix</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Where your revenue comes from</p>
      </div>

      {isLoading ? (
        <div className="h-[140px] flex items-center justify-center animate-pulse">
          <span className="text-xs text-muted-foreground">Loading sales mix...</span>
        </div>
      ) : hasEmptyData ? (
        <div className="w-full h-[140px] my-3 rounded-xl border border-dashed border-border flex items-center justify-center text-center p-4">
          <p className="text-xs text-muted-foreground">No posted sales recorded</p>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 my-3">
          {/* Donut Chart Visual */}
          <div className="relative flex items-center justify-center shrink-0">
            <svg width={size} height={size} className="transform -rotate-90">
              {sources.map((src, i) => {
                const dash = (src.percent / 100) * circumference
                const offset = -((accumulatedPercent / 100) * circumference)
                accumulatedPercent += src.percent

                return (
                  <circle
                    key={i}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={src.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${dash} ${circumference}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    className="transition-all duration-500 ease-out"
                  />
                )
              })}
            </svg>

            {/* Inner Center Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-lg font-bold font-heading text-foreground tracking-tight">
                {formatDashboardAmount(data.totalRevenueBase, '')}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {currency}
              </span>
            </div>
          </div>

          {/* Legend List */}
          <div className="flex-1 space-y-2.5 pl-2">
            {sources.map((src, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="size-2 rounded-full shrink-0"
                    style={{ backgroundColor: src.color }}
                  />
                  <span className="text-muted-foreground font-medium truncate">{src.name}</span>
                  <span className="text-muted-foreground text-[11px]">({src.percent}%)</span>
                </div>
                <span className="font-bold text-foreground">
                  {src.amount}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
