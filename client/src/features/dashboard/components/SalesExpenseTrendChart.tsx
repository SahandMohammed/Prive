import { useState, useRef, useEffect, useCallback } from 'react'
import type { DashboardTrendResponse } from '../types/dashboard.types'
import { formatCompactNumber, formatDashboardAmount } from '../utils/dashboard.utils'

interface SalesExpenseTrendChartProps {
  data?: DashboardTrendResponse
  isLoading?: boolean
  selectedDays?: number
  onDaysChange?: (days: number) => void
}

type MetricMode = 'all' | 'sales' | 'expenses' | 'profit'

export function SalesExpenseTrendChart({
  data,
  isLoading,
  selectedDays = 14,
  onDaysChange,
}: SalesExpenseTrendChartProps) {
  const [metricMode, setMetricMode] = useState<MetricMode>('all')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)
  const [width, setWidth] = useState(840)
  const observerRef = useRef<ResizeObserver | null>(null)

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (!node) return

    const updateSize = () => {
      const rect = node.getBoundingClientRect()
      if (rect.width > 0) {
        setWidth(Math.round(rect.width))
      }
    }

    updateSize()

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const w = entry.contentRect.width
          if (w > 0) {
            setWidth(Math.round(w))
          }
        }
      })
      observer.observe(node)
      observerRef.current = observer
    }
  }, [])

  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  const items = data?.items ?? []
  const currency = data?.baseCurrencyCode ?? 'IQD'
  const hasEmptyData = items.length === 0

  // Dimensions
  const height = 300
  const isMobile = width < 520
  const paddingLeft = isMobile ? 50 : 65
  const paddingRight = isMobile ? 15 : 25
  const paddingTop = 20
  const paddingBottom = 35

  const chartW = Math.max(10, width - paddingLeft - paddingRight)
  const chartH = Math.max(10, height - paddingTop - paddingBottom)
  const baseY = paddingTop + chartH

  // Scales
  const maxSales = Math.max(...items.map((d) => d.salesBase), 0)
  const maxExpenses = Math.max(...items.map((d) => d.expensesBase), 0)
  const maxNet = Math.max(...items.map((d) => Math.max(0, d.netBase)), 0)

  const maxVal = metricMode === 'all'
    ? Math.max(maxSales, maxExpenses, 1000)
    : metricMode === 'sales'
      ? Math.max(maxSales, 1000)
      : metricMode === 'expenses'
        ? Math.max(maxExpenses, 1000)
        : Math.max(maxNet, 1000)

  const getY = (val: number) => {
    const clamped = Math.max(0, val)
    return paddingTop + chartH - (clamped / maxVal) * chartH
  }

  const getX = (index: number) =>
    paddingLeft + (items.length > 1 ? (index / (items.length - 1)) * chartW : chartW / 2)

  // Smooth bezier curve generator with boundary clamping to prevent dipping below baseline (0 IQD)
  const createSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return ''
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`
    let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? 0 : i - 1]
      const p1 = pts[i]
      const p2 = pts[i + 1]
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1]

      const cp1x = p1.x + (p2.x - p0.x) / 6
      let cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      let cp2y = p2.y - (p3.y - p1.y) / 6

      // Clamping: when endpoints are both on baseline, remain strictly flat at baseline
      if (p1.y >= baseY - 0.5 && p2.y >= baseY - 0.5) {
        cp1y = baseY
        cp2y = baseY
      } else {
        // Prevent dipping below baseline or shooting above chart ceiling
        cp1y = Math.min(baseY, Math.max(paddingTop, cp1y))
        cp2y = Math.min(baseY, Math.max(paddingTop, cp2y))
      }

      d += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
    }
    return d
  }

  const salesPts = items.map((d, i) => ({ x: getX(i), y: getY(d.salesBase) }))
  const expensePts = items.map((d, i) => ({ x: getX(i), y: getY(d.expensesBase) }))
  const netPts = items.map((d, i) => ({ x: getX(i), y: getY(d.netBase) }))

  const salesLine = createSmoothPath(salesPts)
  const expenseLine = createSmoothPath(expensePts)
  const netLine = createSmoothPath(netPts)

  const getArea = (pts: { x: number; y: number }[], line: string) => {
    if (!line || pts.length === 0) return ''
    return `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`
  }

  const salesArea = getArea(salesPts, salesLine)
  const expenseArea = getArea(expensePts, expenseLine)
  const netArea = getArea(netPts, netLine)

  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal]

  // Adaptive step for labels on x-axis so they don't crowd or overlap
  const maxLabels = isMobile ? 4 : width < 720 ? 6 : 8
  const step = Math.max(1, Math.floor(items.length / maxLabels))

  const activeItem = hoverIndex !== null && items[hoverIndex] ? items[hoverIndex] : null

  // Tooltip position calculation (clamped within container)
  const tooltipWidth = 180
  let tooltipLeft = 0
  if (hoverIndex !== null) {
    const hoverX = getX(hoverIndex)
    tooltipLeft = hoverX - tooltipWidth / 2
    if (tooltipLeft < paddingLeft) tooltipLeft = paddingLeft
    if (tooltipLeft + tooltipWidth > width - paddingRight) {
      tooltipLeft = width - paddingRight - tooltipWidth
    }
  }

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:shadow-sm transition-all">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold font-heading text-foreground">
              Sales & Expense Trend
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-muted-foreground font-medium">
              {selectedDays} Days
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Daily operational cash and sales trends over the selected period
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Metric View Selector: All | Sales | Expenses | Profit */}
          <div className="inline-flex rounded-lg bg-neutral-100 dark:bg-neutral-800/80 p-1 text-xs font-medium">
            {(
              [
                { mode: 'all', label: 'All' },
                { mode: 'sales', label: 'Sales' },
                { mode: 'expenses', label: 'Expenses' },
                { mode: 'profit', label: 'Net' },
              ] as const
            ).map(({ mode, label }) => (
              <button
                key={mode}
                type="button"
                onClick={() => setMetricMode(mode)}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  metricMode === mode
                    ? 'bg-card text-foreground font-semibold shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period selector buttons */}
          {onDaysChange && (
            <div className="inline-flex rounded-lg border border-border/80 bg-muted/20 p-0.5 text-xs font-medium">
              {[7, 14, 30, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => onDaysChange(days)}
                  className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                    selectedDays === days
                      ? 'bg-card text-foreground font-bold shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SVG Spline Chart */}
      {isLoading ? (
        <div className="w-full h-[300px] flex items-center justify-center bg-muted/20 rounded-xl animate-pulse">
          <span className="text-xs text-muted-foreground">Loading chart data...</span>
        </div>
      ) : hasEmptyData ? (
        <div className="w-full h-[300px] flex items-center justify-center border border-dashed border-border rounded-xl">
          <p className="text-xs text-muted-foreground">No transaction data for this period.</p>
        </div>
      ) : (
        <div ref={containerRef} className="relative w-full h-[300px] overflow-hidden pt-1 select-none">
          <svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${width} ${height}`}
            className="block overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            <defs>
              <linearGradient id="trendSalesGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EA580C" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#EA580C" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="trendExpenseGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="trendNetGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0D9488" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#0D9488" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Gridlines & Y-Labels */}
            {yTicks.map((val, idx) => {
              const y = getY(val)
              const label = `${formatCompactNumber(val)} ${currency}`

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
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    className="text-[10px] fill-muted-foreground/80 font-mono font-medium"
                  >
                    {label}
                  </text>
                </g>
              )
            })}

            {/* Areas & Lines based on metric mode */}
            {(metricMode === 'all' || metricMode === 'expenses') && maxExpenses > 0 && (
              <>
                <path d={expenseArea} fill="url(#trendExpenseGrad)" />
                <path
                  d={expenseLine}
                  fill="none"
                  stroke="#EF4444"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {(metricMode === 'all' || metricMode === 'sales') && maxSales > 0 && (
              <>
                <path d={salesArea} fill="url(#trendSalesGrad)" />
                <path
                  d={salesLine}
                  fill="none"
                  stroke="#EA580C"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {metricMode === 'profit' && (
              <>
                <path d={netArea} fill="url(#trendNetGrad)" />
                <path
                  d={netLine}
                  fill="none"
                  stroke="#0D9488"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            )}

            {/* Empty message if selected metric has zero data */}
            {metricMode === 'expenses' && maxExpenses === 0 && (
              <text
                x={width / 2}
                y={paddingTop + chartH / 2}
                textAnchor="middle"
                className="text-xs fill-muted-foreground font-sans"
              >
                No expenses recorded in this period
              </text>
            )}

            {/* X-axis Labels (Dates) */}
            {items.map((d, i) => {
              if (i % step !== 0 && i !== items.length - 1) return null
              const dateObj = new Date(d.date)
              const dateLabel = dateObj.toLocaleDateString('en-US', {
                month: 'numeric',
                day: 'numeric',
              })

              return (
                <text
                  key={String(d.date)}
                  x={getX(i)}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-[11px] fill-muted-foreground font-sans font-medium"
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
                {(metricMode === 'all' || metricMode === 'sales') && (
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getY(activeItem.salesBase)}
                    r="5"
                    className="fill-[#EA580C] stroke-card"
                    strokeWidth="2.5"
                  />
                )}
                {(metricMode === 'all' || metricMode === 'expenses') && maxExpenses > 0 && (
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getY(activeItem.expensesBase)}
                    r="5"
                    className="fill-[#EF4444] stroke-card"
                    strokeWidth="2.5"
                  />
                )}
                {metricMode === 'profit' && (
                  <circle
                    cx={getX(hoverIndex)}
                    cy={getY(activeItem.netBase)}
                    r="5"
                    className="fill-[#0D9488] stroke-card"
                    strokeWidth="2.5"
                  />
                )}
              </g>
            )}
          </svg>

          {/* Interactive Tooltip Card */}
          {activeItem && hoverIndex !== null && (
            <div
              className="absolute pointer-events-none rounded-xl border border-border bg-card/95 px-3.5 py-2.5 text-xs shadow-lg backdrop-blur-xs transition-all z-20"
              style={{
                top: `${paddingTop + 5}px`,
                left: `${tooltipLeft}px`,
                width: `${tooltipWidth}px`,
              }}
            >
              <p className="font-semibold text-foreground border-b border-border/60 pb-1 mb-1.5">
                {new Date(activeItem.date).toLocaleDateString(undefined, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              <div className="space-y-1">
                <div className="flex items-center justify-between gap-4 text-orange-600 dark:text-orange-400 font-medium">
                  <span>Sales:</span>
                  <span className="font-bold">
                    +{formatDashboardAmount(activeItem.salesBase, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
                  <span>Expenses:</span>
                  <span className="font-semibold">
                    -{formatDashboardAmount(activeItem.expensesBase, currency)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4 text-teal-600 dark:text-teal-400 pt-1 border-t border-border/40 font-semibold">
                  <span>Net:</span>
                  <span>
                    {activeItem.netBase >= 0 ? '+' : ''}
                    {formatDashboardAmount(activeItem.netBase, currency)}
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
