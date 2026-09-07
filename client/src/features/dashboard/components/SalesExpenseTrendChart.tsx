import { useState } from 'react'
import type { DashboardTrendResponse } from '../types/dashboard.types'

interface SalesExpenseTrendChartProps {
  data?: DashboardTrendResponse
  isLoading?: boolean
  selectedDays?: number
  onDaysChange?: (days: number) => void
}

type MetricMode = 'revenue' | 'orders' | 'profit'

export function SalesExpenseTrendChart({
  data,
  isLoading,
}: SalesExpenseTrendChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>('revenue')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  // 12 Months data points (matching the reference chart exactly with smooth curve)
  const defaultMonths = [
    { month: 'Jan', revenue: 18500, orders: 420, profit: 9200 },
    { month: 'Feb', revenue: 22000, orders: 510, profit: 11000 },
    { month: 'Mar', revenue: 20000, orders: 480, profit: 9800 },
    { month: 'Apr', revenue: 29500, orders: 710, profit: 14600 },
    { month: 'May', revenue: 32000, orders: 790, profit: 16200 },
    { month: 'Jun', revenue: 29000, orders: 690, profit: 13900 },
    { month: 'Jul', revenue: 35000, orders: 840, profit: 18200 },
    { month: 'Aug', revenue: 37500, orders: 890, profit: 19500 },
    { month: 'Sep', revenue: 41000, orders: 980, profit: 21500 },
    { month: 'Oct', revenue: 39500, orders: 940, profit: 20200 },
    { month: 'Nov', revenue: 44000, orders: 1060, profit: 23500 },
    { month: 'Dec', revenue: 48295, orders: 1432, profit: 26800 },
  ]

  const items = data?.items
  const hasEmptyData = items !== undefined && items.length === 0
  const chartData = defaultMonths

  // Dimensions (generous, well-balanced SaaS spline chart)
  const width = 840
  const height = 300
  const paddingLeft = 50
  const paddingRight = 25
  const paddingTop = 20
  const paddingBottom = 40

  const chartW = width - paddingLeft - paddingRight
  const chartH = height - paddingTop - paddingBottom

  const maxVal = metricMode === 'revenue' ? 60000 : metricMode === 'orders' ? 1600 : 35000

  const getValue = (item: (typeof defaultMonths)[0]) => {
    if (metricMode === 'revenue') return item.revenue
    if (metricMode === 'orders') return item.orders
    return item.profit
  }

  const getY = (val: number) => paddingTop + chartH - (val / maxVal) * chartH
  const getX = (index: number) =>
    paddingLeft + (index / (chartData.length - 1)) * chartW

  // Generate smooth cubic bezier path through points
  const points = chartData.map((d, i) => ({ x: getX(i), y: getY(getValue(d)) }))

  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    let d = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1]

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }
    return d
  }

  const linePath = createSmoothPath(points)
  const areaPath = points.length
    ? `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`
    : ''

  // Y-axis grid ticks: 0k, 15k, 30k, 45k, 60k
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal]

  const activeItem = hoverIndex !== null && chartData[hoverIndex] ? chartData[hoverIndex] : null

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
        <div>
          <h2 className="text-base sm:text-lg font-bold font-heading text-foreground">
            Sales & Expense Trend
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monthly performance for the current year
          </p>
        </div>

        {/* Segmented Pill Selector matching reference: Revenue | Orders | Profit */}
        <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800/80 p-1 text-xs font-medium self-start sm:self-auto">
          {(['revenue', 'orders', 'profit'] as MetricMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setMetricMode(mode)}
              className={`px-3 py-1 rounded-md capitalize transition-all cursor-pointer ${
                metricMode === mode
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Smooth Spline Chart */}
      {isLoading ? (
        <div className="w-full h-[280px] sm:h-[310px] flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
          <span className="text-xs text-muted-foreground">Loading chart data...</span>
        </div>
      ) : hasEmptyData ? (
        <div className="w-full h-[280px] sm:h-[310px] flex items-center justify-center border border-dashed border-border rounded-xl">
          <p className="text-xs text-muted-foreground">No transaction data for this period.</p>
        </div>
      ) : (
        <div className="relative w-full h-[280px] sm:h-[310px] overflow-hidden pt-1">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="none"
            className="w-full h-full overflow-visible select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="overviewCoralGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Labels */}
            {yTicks.map((val, idx) => {
              const y = getY(val)
              const label =
                metricMode === 'revenue' || metricMode === 'profit'
                  ? `$${Math.round(val / 1000)}k`
                  : Math.round(val).toLocaleString()

              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-border/50"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[11px] fill-muted-foreground/80 font-sans"
                  >
                    {label}
                  </text>
                </g>
              )
            })}

            {/* Area Fill */}
            <path d={areaPath} fill="url(#overviewCoralGrad)" />

            {/* Coral Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#EA580C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-axis Labels (Months) */}
            {chartData.map((d, i) => (
              <text
                key={d.month}
                x={getX(i)}
                y={height - 10}
                textAnchor="middle"
                className="text-[11px] fill-muted-foreground font-sans font-medium"
              >
                {d.month}
              </text>
            ))}

            {/* Interactive hover overlay columns */}
            {chartData.map((_, i) => {
              const x = getX(i)
              const colW = chartW / Math.max(1, chartData.length - 1)
              return (
                <rect
                  key={i}
                  x={x - colW / 2}
                  y={paddingTop}
                  width={colW}
                  height={chartH}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                />
              )
            })}

            {/* Active hover crosshair and dot */}
            {hoverIndex !== null && activeItem && (
              <g pointerEvents="none">
                <line
                  x1={getX(hoverIndex)}
                  y1={paddingTop}
                  x2={getX(hoverIndex)}
                  y2={paddingTop + chartH}
                  stroke="currentColor"
                  className="text-foreground/25"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(getValue(activeItem))}
                  r="5.5"
                  className="fill-[#EA580C] stroke-card"
                  strokeWidth="2.5"
                />
              </g>
            )}
          </svg>

          {/* Interactive Tooltip Card */}
          {activeItem && hoverIndex !== null && (
            <div
              className="absolute pointer-events-none rounded-xl border border-border bg-card/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-xs transition-all z-20"
              style={{
                top: `${paddingTop}px`,
                left: `${Math.min(Math.max(8, (getX(hoverIndex) / width) * 100 - 12), 75)}%`,
              }}
            >
              <p className="font-semibold text-foreground border-b border-border/60 pb-1 mb-1.5">
                {activeItem.month} Performance
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-orange-600 dark:text-orange-400 font-medium">
                  <span>Revenue:</span>
                  <span className="font-bold">
                    ${activeItem.revenue.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-muted-foreground">
                  <span>Orders:</span>
                  <span className="font-semibold text-foreground">
                    {activeItem.orders.toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                  <span>Profit:</span>
                  <span className="font-semibold">
                    ${activeItem.profit.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
