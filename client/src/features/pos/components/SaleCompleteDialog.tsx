import { useState } from 'react'
import { CheckCircle2, Printer, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { receiptPrintService } from '../services/receiptPrint.service'
import { PosPaymentMode } from '../types/pos.types'
import type { PosSale } from '../types/pos.types'

export function SaleCompleteDialog({
  sale,
  onNewSale,
}: {
  sale: PosSale | null
  onNewSale: () => void
}) {
  const [printError, setPrintError] = useState('')

  const print = () => {
    if (!sale) return
    try {
      setPrintError('')
      receiptPrintService.printSale(sale.id)
    } catch (error) {
      setPrintError(error instanceof Error ? error.message : 'Receipt printing could not be started.')
    }
  }

  return (
    <Dialog open={Boolean(sale)} onOpenChange={(open) => { if (!open) onNewSale() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 grid size-12 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="size-6" />
          </div>
          <DialogTitle className="text-center">Sale completed</DialogTitle>
          <DialogDescription className="text-center">
            {sale?.outstandingBaseAmount
              ? 'The sale was posted and the unpaid balance is recorded in Accounts Receivable.'
              : 'The sale, accounting, stock and payment effects were committed successfully.'}
          </DialogDescription>
        </DialogHeader>

        {sale && (
          <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-center">
            <div>
              <p className="font-mono text-lg font-bold">{sale.documentNumber}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">
                {amount(sale.total)} {sale.baseCurrencyCode}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{sale.customerName ?? 'Walk-in customer'}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-left text-xs">
              <Metric label="Received now" value={`${amount(sale.settledBaseAmount)} ${sale.baseCurrencyCode}`} />
              <Metric
                label={sale.outstandingBaseAmount > 0 ? 'Customer owes' : 'Status'}
                value={sale.outstandingBaseAmount > 0
                  ? `${amount(sale.outstandingBaseAmount)} ${sale.baseCurrencyCode}`
                  : 'Paid'}
                accent={sale.outstandingBaseAmount > 0}
              />
            </div>
            {sale.paymentMode !== PosPaymentMode.Paid && (
              <p className="text-left text-xs text-muted-foreground">
                {sale.paymentMode === PosPaymentMode.Credit ? 'Credit sale' : 'Partial payment'} · collect the remaining balance later through Customer Receipts.
              </p>
            )}
          </div>
        )}

        {printError && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            Sale completed successfully. {printError}
          </p>
        )}

        <DialogFooter className="sm:justify-center">
          <Button type="button" variant="outline" onClick={print}>
            <Printer className="size-4" />
            Print Receipt
          </Button>
          <Button type="button" onClick={onNewSale}>
            <ShoppingCart className="size-4" />
            New Sale
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono font-semibold ${accent ? 'text-amber-600' : ''}`}>{value}</p>
    </div>
  )
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
