import type { DashboardSalesMix } from '../types/dashboard.types'
import { formatDashboardAmount } from '../utils/dashboard.utils'
import { Scissors, PackageOpen } from 'lucide-react'

interface SalesMixChartProps {
  data?: DashboardSalesMix
  isLoading?: boolean
}

export function SalesMixChart({ data, isLoading }: SalesMixChartProps) {
  if (isLoading || !data) {
    return (
      <div className="rounded-xl border border-border/80 bg-card p-5 shadow-xs flex flex-col justify-between h-full animate-pulse">
        <div className="h-4 w-28 bg-muted rounded mb-2" />
        <div className="h-32 w-32 rounded-full bg-muted mx-auto my-6" />
        <div className="space-y-2">
          <div className="h-3 bg-muted rounded" />
          <div className="h-3 bg-muted rounded" />
        </div>
      </div>
    )
  }

  const {
    serviceRevenueBase,
    serviceRevenuePercent,
    productRevenueBase,
    productRevenuePercent,
    totalRevenueBase,
    baseCurrencyCode,
  } = data

  // Donut SVG parameters
  const size = 150
  const strokeWidth = 22
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

  const serviceDash = (serviceRevenuePercent / 100) * circumference
  const productDash = (productRevenuePercent / 100) * circumference

  const hasData = totalRevenueBase > 0

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-heading font-semibold text-foreground">Sales Mix</h2>
          <span className="text-[11px] font-medium text-muted-foreground">Line Types</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">Services vs Products revenue share</p>
      </div>

      {/* Donut Chart Visual */}
      <div className="flex flex-col items-center justify-center my-3">
        {hasData ? (
          <div className="relative flex items-center justify-center">
            <svg width={size} height={size} className="transform -rotate-90">
              {/* Background track */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                className="text-muted/40"
                strokeWidth={strokeWidth}
              />
              {/* Service Segment (Indigo) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#6366f1"
                strokeWidth={strokeWidth}
                strokeDasharray={`${serviceDash} ${circumference}`}
                strokeDashoffset={0}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
              {/* Product Segment (Emerald) */}
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="#10b981"
                strokeWidth={strokeWidth}
                strokeDasharray={`${productDash} ${circumference}`}
                strokeDashoffset={-serviceDash}
                strokeLinecap="round"
                className="transition-all duration-500 ease-out"
              />
            </svg>

            {/* Inner Center Metric */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Total
              </span>
              <span className="text-sm font-bold font-heading text-foreground truncate max-w-[100px]">
                {formatDashboardAmount(totalRevenueBase, '')}
              </span>
              <span className="text-[10px] text-muted-foreground">{baseCurrencyCode}</span>
            </div>
          </div>
        ) : (
          <div className="w-[150px] h-[150px] rounded-full border-4 border-dashed border-border/70 flex items-center justify-center text-center p-3">
            <span className="text-xs text-muted-foreground">No posted sales recorded</span>
          </div>
        )}
      </div>

      {/* Breakdown Legend List */}
      <div className="space-y-2.5 pt-2 border-t border-border/50 text-xs">
        {/* Services row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-[#6366f1] flex items-center justify-center text-white">
              <Scissors className="h-2 w-2" />
            </span>
            <span className="font-medium text-foreground">Services</span>
            <span className="text-muted-foreground font-semibold">({serviceRevenuePercent}%)</span>
          </div>
          <span className="font-mono text-muted-foreground">
            {formatDashboardAmount(serviceRevenueBase, baseCurrencyCode)}
          </span>
        </div>

        {/* Products row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-md bg-[#10b981] flex items-center justify-center text-white">
              <PackageOpen className="h-2 w-2" />
            </span>
            <span className="font-medium text-foreground">Products</span>
            <span className="text-muted-foreground font-semibold">({productRevenuePercent}%)</span>
          </div>
          <span className="font-mono text-muted-foreground">
            {formatDashboardAmount(productRevenueBase, baseCurrencyCode)}
          </span>
        </div>
      </div>
    </div>
  )
}
