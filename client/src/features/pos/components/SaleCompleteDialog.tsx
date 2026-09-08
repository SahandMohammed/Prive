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
            The sale, accounting, stock and money effects were committed successfully.
          </DialogDescription>
        </DialogHeader>

        {sale && (
          <div className="rounded-xl border bg-muted/30 p-4 text-center">
            <p className="font-mono text-lg font-bold">{sale.documentNumber}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-primary">
              {amount(sale.total)} {sale.baseCurrencyCode}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{sale.customerName ?? 'Walk-in customer'}</p>
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

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
