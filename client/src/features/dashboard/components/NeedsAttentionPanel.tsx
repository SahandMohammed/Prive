import { Link } from 'react-router-dom'
import type { DashboardSummary } from '../types/dashboard.types'
import { AlertCircle, ChevronRight, PackageX, FileText, ReceiptText } from 'lucide-react'

interface NeedsAttentionPanelProps {
  summary?: DashboardSummary
  isLoading?: boolean
}

export function NeedsAttentionPanel({ summary, isLoading }: NeedsAttentionPanelProps) {
  if (isLoading || !summary) {
    return (
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-4">
        <div className="h-5 w-32 bg-muted/60 rounded" />
        <div className="space-y-3">
          <div className="h-12 bg-muted/40 rounded-lg" />
          <div className="h-12 bg-muted/40 rounded-lg" />
          <div className="h-12 bg-muted/40 rounded-lg" />
        </div>
      </div>
    )
  }

  const {
    outOfStockCount,
    customerOutstandingInvoiceCount,
    supplierOutstandingInvoiceCount,
  } = summary

  const items = [
    {
      title: 'Out of Stock Products',
      count: outOfStockCount,
      label: outOfStockCount === 1 ? 'item out of stock' : 'items out of stock',
      icon: PackageX,
      href: '/inventory/products',
      urgent: outOfStockCount > 0,
      badgeColor:
        outOfStockCount > 0
          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
          : 'bg-muted text-muted-foreground',
    },
    {
      title: 'Customer Receivables',
      count: customerOutstandingInvoiceCount,
      label:
        customerOutstandingInvoiceCount === 1
          ? 'unpaid sales invoice'
          : 'unpaid sales invoices',
      icon: FileText,
      href: '/sales/invoices',
      urgent: customerOutstandingInvoiceCount > 0,
      badgeColor:
        customerOutstandingInvoiceCount > 0
          ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
          : 'bg-muted text-muted-foreground',
    },
    {
      title: 'Supplier Payables',
      count: supplierOutstandingInvoiceCount,
      label:
        supplierOutstandingInvoiceCount === 1
          ? 'unpaid purchase bill'
          : 'unpaid purchase bills',
      icon: ReceiptText,
      href: '/purchases/invoices',
      urgent: supplierOutstandingInvoiceCount > 0,
      badgeColor:
        supplierOutstandingInvoiceCount > 0
          ? 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20'
          : 'bg-muted text-muted-foreground',
    },
  ]

  const totalUrgent = items.filter((i) => i.count > 0).length

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-heading font-semibold text-foreground">
            Needs Attention
          </h2>
          {totalUrgent > 0 && (
            <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
          )}
        </div>
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="space-y-2.5">
        {items.map((item, idx) => {
          const Icon = item.icon

          return (
            <Link
              key={idx}
              to={item.href}
              className="group flex items-center justify-between p-3 rounded-lg border border-border/60 hover:border-primary/40 bg-muted/20 hover:bg-muted/40 transition-all"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg shrink-0 ${
                    item.count > 0
                      ? 'bg-primary/10 text-primary'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    {item.count} {item.label}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-bold font-mono px-2 py-0.5 rounded-full border ${item.badgeColor}`}
                >
                  {item.count}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
