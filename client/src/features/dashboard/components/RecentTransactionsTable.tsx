import { Link } from 'react-router-dom'
import type { DashboardRecentTransaction } from '../types/dashboard.types'
import { formatDashboardAmount, formatRelativeTime } from '../utils/dashboard.utils'
import { ArrowUpRight, ArrowDownLeft, ArrowLeftRight, ExternalLink } from 'lucide-react'

interface RecentTransactionsTableProps {
  transactions?: DashboardRecentTransaction[]
  isLoading?: boolean
}

function getTypeBadgeStyle(type: string) {
  switch (type) {
    case 'POS Sale':
      return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
    case 'Sales Invoice':
      return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
    case 'Purchase Invoice':
      return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
    case 'Customer Receipt':
      return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
    case 'Supplier Payment':
      return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
    case 'Expense':
      return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
    case 'Money Transfer':
      return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function RecentTransactionsTable({ transactions, isLoading }: RecentTransactionsTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-heading font-semibold text-foreground">
            Recent Transactions
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Operational cash and document movements
          </p>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {transactions ? `${transactions.length} items` : ''}
        </span>
      </div>

      <div className="flex-1 overflow-x-auto">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !transactions || transactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            No recent operational transactions in this branch.
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {transactions.map((tx) => {
              const isPositive = tx.direction === 'in'
              const isNegative = tx.direction === 'out'

              const content = (
                <div className="group flex items-center justify-between py-2.5 px-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isPositive
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : isNegative
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {isPositive ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : isNegative ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowLeftRight className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors truncate">
                          {tx.documentNumber}
                        </span>
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-sm border font-medium uppercase tracking-wider ${getTypeBadgeStyle(
                            tx.transactionType
                          )}`}
                        >
                          {tx.transactionType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5 truncate">
                        <span className="truncate">{tx.contactOrDescription ?? 'Operational entry'}</span>
                        <span>•</span>
                        <span className="shrink-0">{formatRelativeTime(tx.timestampUtc)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 ml-4 flex items-center gap-2">
                    <div>
                      <div
                        className={`text-xs font-bold font-mono tracking-tight ${
                          isPositive
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isNegative
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-foreground'
                        }`}
                      >
                        {isPositive ? '+' : isNegative ? '-' : ''}
                        {formatDashboardAmount(tx.amount, tx.currencyCode)}
                      </div>
                    </div>
                    {tx.targetUrl && (
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0" />
                    )}
                  </div>
                </div>
              )

              return tx.targetUrl ? (
                <Link key={tx.id} to={tx.targetUrl} className="block">
                  {content}
                </Link>
              ) : (
                <div key={tx.id}>{content}</div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
