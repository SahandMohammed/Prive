import { useEffect, useMemo, useState } from 'react'
import {
  Check,
  CheckSquare,
  FileText,
  RotateCcw,
  Sparkles,
  Square,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { OutstandingPurchaseInvoice } from '../types/finance.types'

interface SupplierPaymentInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  supplierName: string
  currencyCode: string
  invoices: OutstandingPurchaseInvoice[]
  currentAllocations: { purchaseInvoiceId: string; amount: number }[]
  onApply: (
    allocations: { purchaseInvoiceId: string; amount: number }[],
    totalAmount: number
  ) => void
}

export function SupplierPaymentInvoiceDialog({
  open,
  onOpenChange,
  supplierName,
  currencyCode,
  invoices,
  currentAllocations,
  onApply,
}: SupplierPaymentInvoiceDialogProps) {
  // Map of invoiceId -> allocation amount
  const [allocatedMap, setAllocatedMap] = useState<Record<string, number>>({})
  const [autoAmount, setAutoAmount] = useState<string>('')

  // Initialize from current allocations when dialog opens
  useEffect(() => {
    if (open) {
      const initialMap: Record<string, number> = {}
      currentAllocations.forEach((alloc) => {
        if (alloc.amount > 0) {
          initialMap[alloc.purchaseInvoiceId] = alloc.amount
        }
      })
      setAllocatedMap(initialMap)
      setAutoAmount('')
    }
  }, [open, currentAllocations])

  // Toggle single invoice (select full outstanding or unselect)
  const handleToggleInvoice = (invoice: OutstandingPurchaseInvoice) => {
    setAllocatedMap((prev) => {
      const current = prev[invoice.id] || 0
      const next = { ...prev }
      if (current > 0) {
        delete next[invoice.id]
      } else {
        next[invoice.id] = invoice.outstandingAmount
      }
      return next
    })
  }

  // Handle amount change for single invoice
  const handleAmountChange = (invoice: OutstandingPurchaseInvoice, val: number) => {
    const clamped = Math.min(Math.max(val, 0), invoice.outstandingAmount)
    setAllocatedMap((prev) => {
      const next = { ...prev }
      if (clamped > 0) {
        next[invoice.id] = clamped
      } else {
        delete next[invoice.id]
      }
      return next
    })
  }

  // Select all (pay full outstanding for all available invoices)
  const handleSelectAll = () => {
    const allMap: Record<string, number> = {}
    invoices.forEach((inv) => {
      allMap[inv.id] = inv.outstandingAmount
    })
    setAllocatedMap(allMap)
  }

  // Clear all selections
  const handleClearAll = () => {
    setAllocatedMap({})
  }

  // Auto-distribute a specific budget amount chronologically (oldest invoice first)
  const handleAutoDistribute = () => {
    const target = Number(autoAmount)
    if (!target || target <= 0) return

    let remaining = target
    const newMap: Record<string, number> = {}

    // Sort invoices by date ascending (oldest first)
    const sortedInvoices = [...invoices].sort(
      (a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime()
    )

    for (const inv of sortedInvoices) {
      if (remaining <= 0) break
      const alloc = Math.min(remaining, inv.outstandingAmount)
      newMap[inv.id] = Number(alloc.toFixed(4))
      remaining -= alloc
    }

    setAllocatedMap(newMap)
  }

  // Calculate totals
  const totalAllocated = useMemo(() => {
    return Object.values(allocatedMap).reduce((sum, amt) => sum + (Number(amt) || 0), 0)
  }, [allocatedMap])

  const totalOutstanding = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.outstandingAmount, 0)
  }, [invoices])

  const selectedCount = Object.keys(allocatedMap).filter((id) => (allocatedMap[id] || 0) > 0).length
  const allSelected = invoices.length > 0 && selectedCount === invoices.length

  const handleApply = () => {
    const allocations = Object.entries(allocatedMap)
      .filter(([_, amount]) => amount > 0)
      .map(([purchaseInvoiceId, amount]) => ({
        purchaseInvoiceId,
        amount: Number(amount.toFixed(4)),
      }))

    onApply(allocations, Number(totalAllocated.toFixed(4)))
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Choose Purchase Invoices to Pay
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500">
            Select the outstanding bills for <strong>{supplierName}</strong> in{' '}
            <strong>{currencyCode}</strong>. Selected amounts will auto-calculate the total payment.
          </DialogDescription>
        </DialogHeader>

        {/* QUICK ACTIONS & AUTO-ALLOCATE TOOLBAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs font-medium"
              onClick={allSelected ? handleClearAll : handleSelectAll}
            >
              {allSelected ? (
                <>
                  <Square className="size-3.5" /> Deselect All
                </>
              ) : (
                <>
                  <CheckSquare className="size-3.5 text-primary" /> Pay All in Full
                </>
              )}
            </Button>
            {selectedCount > 0 && !allSelected && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 gap-1 text-xs text-slate-500 hover:text-slate-700"
                onClick={handleClearAll}
              >
                <RotateCcw className="size-3" /> Clear
              </Button>
            )}
          </div>

          {/* Auto-distribute specific amount */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">Auto-Distribute:</span>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                {currencyCode}
              </span>
              <Input
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="Target Amount"
                value={autoAmount}
                onChange={(e) => setAutoAmount(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAutoDistribute()
                  }
                }}
                className="h-8 w-32 pl-9 pr-2 font-mono text-xs"
              />
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-8 gap-1 text-xs"
              disabled={!Number(autoAmount) || Number(autoAmount) <= 0}
              onClick={handleAutoDistribute}
            >
              <Sparkles className="size-3.5 text-amber-500" />
              Apply Oldest First
            </Button>
          </div>
        </div>

        {/* INVOICES TABLE */}
        <div className="max-h-80 overflow-y-auto rounded-md border border-slate-200 dark:border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <TableHead className="w-12 px-3 text-center">Select</TableHead>
                <TableHead className="px-3 font-semibold">Invoice #</TableHead>
                <TableHead className="px-3 font-semibold">Date</TableHead>
                <TableHead className="px-3 text-right font-semibold">Original Total</TableHead>
                <TableHead className="px-3 text-right font-semibold">Paid So Far</TableHead>
                <TableHead className="px-3 text-right font-semibold text-rose-600 dark:text-rose-400">
                  Outstanding
                </TableHead>
                <TableHead className="w-40 px-3 text-right font-semibold text-primary">
                  Pay Amount ({currencyCode})
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-xs text-slate-400">
                    No outstanding purchase invoices found for this supplier in {currencyCode}.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => {
                  const allocAmount = allocatedMap[invoice.id] ?? 0
                  const isChecked = allocAmount > 0

                  return (
                    <TableRow
                      key={invoice.id}
                      className={`transition-colors ${
                        isChecked
                          ? 'bg-primary/5 dark:bg-primary/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      {/* Checkbox */}
                      <TableCell className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleInvoice(invoice)}
                          className="size-4 cursor-pointer rounded border-slate-300 text-primary accent-primary focus:ring-primary"
                        />
                      </TableCell>

                      {/* Invoice # */}
                      <TableCell className="px-3 py-2 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {invoice.documentNumber}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                        {invoice.invoiceDate}
                      </TableCell>

                      {/* Original Total */}
                      <TableCell className="px-3 py-2 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                        {invoice.originalTotal.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </TableCell>

                      {/* Paid So Far */}
                      <TableCell className="px-3 py-2 text-right font-mono text-xs text-slate-500">
                        {invoice.paidAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </TableCell>

                      {/* Outstanding */}
                      <TableCell className="px-3 py-2 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {invoice.outstandingAmount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </TableCell>

                      {/* Allocate input */}
                      <TableCell className="px-3 py-2">
                        <div className="flex items-center justify-end gap-1">
                          <Input
                            type="number"
                            min="0"
                            max={invoice.outstandingAmount}
                            step="0.0001"
                            value={allocAmount > 0 ? allocAmount : ''}
                            placeholder="0.00"
                            onChange={(e) =>
                              handleAmountChange(invoice, Number(e.target.value))
                            }
                            className={`h-8 w-28 text-right font-mono text-xs ${
                              isChecked ? 'font-bold text-primary' : 'text-slate-400'
                            }`}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            title="Pay Full Outstanding"
                            className="text-[10px] text-slate-400 hover:text-primary"
                            onClick={() =>
                              handleAmountChange(invoice, invoice.outstandingAmount)
                            }
                          >
                            Max
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* SUMMARY CALCULATION FOOTER */}
        <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/40">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-slate-600 dark:text-slate-400">
              Selected:{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {selectedCount} of {invoices.length} bills
              </strong>
            </span>
            <span className="text-slate-400">|</span>
            <span className="text-slate-600 dark:text-slate-400">
              Total Outstanding:{' '}
              <strong className="font-mono text-slate-800 dark:text-slate-200">
                {totalOutstanding.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 4,
                })}{' '}
                {currencyCode}
              </strong>
            </span>
          </div>

          <div className="flex items-center gap-2 text-right">
            <span className="text-xs text-slate-500">Total Selected to Pay:</span>
            <span className="font-mono text-base font-bold text-primary">
              {totalAllocated.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 4,
              })}{' '}
              {currencyCode}
            </span>
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-primary font-medium text-white hover:bg-primary/90"
            disabled={selectedCount === 0 || totalAllocated <= 0}
            onClick={handleApply}
          >
            <Check className="size-4" />
            Apply Selection ({totalAllocated.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 4,
            })}{' '}
            {currencyCode})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
