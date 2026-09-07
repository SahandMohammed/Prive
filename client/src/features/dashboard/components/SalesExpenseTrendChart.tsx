import { useState } from 'react'
import type { DashboardTrendResponse } from '../types/dashboard.types'
import { formatCompactNumber, formatDashboardAmount } from '../utils/dashboard.utils'

interface SalesExpenseTrendChartProps {
  data?: DashboardTrendResponse
  isLoading?: boolean
  selectedDays: number
  onDaysChange: (days: number) => void
}

export function SalesExpenseTrendChart({
  data,
  isLoading,
  selectedDays,
  onDaysChange,
}: SalesExpenseTrendChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  const items = data?.items ?? []
  const currency = data?.baseCurrencyCode ?? 'IQD'

  // Dimensions
  const width = 800
  const height = 260
  const paddingLeft = 55
  const paddingRight = 20
  const paddingTop = 25
  const paddingBottom = 35

  const chartW = width - paddingLeft - paddingRight
  const chartH = height - paddingTop - paddingBottom

  // Calculate scales
  const maxVal = Math.max(
    ...items.map((d) => Math.max(d.salesBase, d.expensesBase)),
    1000
  )

  const getY = (val: number) => paddingTop + chartH - (val / maxVal) * chartH
  const getX = (index: number) =>
    paddingLeft + (items.length > 1 ? (index / (items.length - 1)) * chartW : chartW / 2)

  // Build SVG paths
  const salesPoints = items.map((d, i) => `${getX(i)},${getY(d.salesBase)}`)
  const expensePoints = items.map((d, i) => `${getX(i)},${getY(d.expensesBase)}`)

  const salesLinePath = items.length ? `M ${salesPoints.join(' L ')}` : ''
  const expenseLinePath = items.length ? `M ${expensePoints.join(' L ')}` : ''

  const salesAreaPath = items.length
    ? `${salesLinePath} L ${getX(items.length - 1)},${paddingTop + chartH} L ${getX(0)},${paddingTop + chartH} Z`
    : ''
  const expenseAreaPath = items.length
    ? `${expenseLinePath} L ${getX(items.length - 1)},${paddingTop + chartH} L ${getX(0)},${paddingTop + chartH} Z`
    : ''

  // Y-axis ticks (4 ticks)
  const yTicks = [0, maxVal * 0.33, maxVal * 0.66, maxVal]

  // X-axis date formatters (show approx 5-7 labels)
  const step = Math.max(1, Math.floor(items.length / 6))

  const activeItem = hoverIndex !== null && items[hoverIndex] ? items[hoverIndex] : null

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between">
      {/* Chart Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-heading font-semibold text-foreground">
              Sales & Expense Trend
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
              Daily
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational cash and invoice volume over time
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Legend */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Sales</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>Expenses</span>
            </div>
          </div>

          {/* Period selector */}
          <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs font-medium">
            {[7, 14, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onDaysChange(days)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  selectedDays === days
                    ? 'bg-card text-foreground shadow-xs font-semibold'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      {isLoading ? (
        <div className="w-full h-[260px] flex items-center justify-center bg-muted/20 rounded-lg animate-pulse">
          <span className="text-xs text-muted-foreground">Loading trend chart...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="w-full h-[260px] flex items-center justify-center border border-dashed border-border rounded-lg">
          <p className="text-xs text-muted-foreground">No transaction data for this period.</p>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto overflow-visible select-none"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-labels */}
            {yTicks.map((val, idx) => {
              const y = getY(val)
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={width - paddingRight}
                    y2={y}
                    stroke="currentColor"
                    className="text-border/60"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[10px] fill-muted-foreground font-mono"
                  >
                    {formatCompactNumber(val)}
                  </text>
                </g>
              )
            })}

            {/* Area Fills */}
            <path d={salesAreaPath} fill="url(#salesGrad)" />
            <path d={expenseAreaPath} fill="url(#expenseGrad)" />

            {/* Lines */}
            <path
              d={salesLinePath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d={expenseLinePath}
              fill="none"
              stroke="#f43f5e"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* X-axis ticks & dates */}
            {items.map((d, i) => {
              if (i % step !== 0 && i !== items.length - 1) return null
              const x = getX(i)
              const dateLabel = new Date(d.date).toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
              })
              return (
                <text
                  key={d.date}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[10px] fill-muted-foreground font-sans"
                >
                  {dateLabel}
                </text>
              )
            })}

            {/* Interactive hover overlay columns */}
            {items.map((_, i) => {
              const x = getX(i)
              const colW = chartW / Math.max(1, items.length - 1)
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

            {/* Active hover crosshair and dots */}
            {hoverIndex !== null && (
              <g pointerEvents="none">
                <line
                  x1={getX(hoverIndex)}
                  y1={paddingTop}
                  x2={getX(hoverIndex)}
                  y2={paddingTop + chartH}
                  stroke="currentColor"
                  className="text-foreground/30"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                />
                {/* Sales dot */}
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(items[hoverIndex].salesBase)}
                  r="5"
                  className="fill-emerald-500 stroke-card"
                  strokeWidth="2"
                />
                {/* Expense dot */}
                <circle
                  cx={getX(hoverIndex)}
                  cy={getY(items[hoverIndex].expensesBase)}
                  r="5"
                  className="fill-rose-500 stroke-card"
                  strokeWidth="2"
                />
              </g>
            )}
          </svg>

          {/* Interactive Tooltip Card */}
          {activeItem && hoverIndex !== null && (
            <div
              className="absolute pointer-events-none rounded-lg border border-border bg-popover/95 px-3 py-2 text-xs shadow-md backdrop-blur-xs transition-all z-10"
              style={{
                top: `${paddingTop}px`,
                left: `${Math.min(Math.max(10, (getX(hoverIndex) / width) * 100 - 15), 70)}%`,
              }}
            >
              <div className="font-semibold text-foreground pb-1 mb-1 border-b border-border/50">
                {new Date(activeItem.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </div>
              <div className="flex items-center justify-between gap-4 text-emerald-600 dark:text-emerald-400">
                <span>Sales:</span>
                <span className="font-mono font-medium">
                  +{formatDashboardAmount(activeItem.salesBase, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
                <span>Expenses:</span>
                <span className="font-mono font-medium">
                  -{formatDashboardAmount(activeItem.expensesBase, currency)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 pt-1 mt-1 border-t border-border/50 text-foreground font-semibold">
                <span>Net:</span>
                <span className="font-mono">
                  {activeItem.netBase >= 0 ? '+' : ''}
                  {formatDashboardAmount(activeItem.netBase, currency)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
