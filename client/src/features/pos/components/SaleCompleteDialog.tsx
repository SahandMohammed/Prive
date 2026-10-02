import { useState } from 'react'
import { CheckCircle2, Printer, ShoppingCart } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { SalesInvoicePaymentStatus } from '@/features/sales'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatNumber } from '@/lib/i18n'
import { receiptPrintService } from '../services/receiptPrint.service'
import type { PosSale } from '../types/pos.types'

export function SaleCompleteDialog({
  sale,
  onNewSale,
}: {
  sale: PosSale | null
  onNewSale: () => void
}) {
  const { t } = useTranslation(['pos', 'common'])
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
          <DialogTitle className="text-center">{t('pos:saleComplete.title')}</DialogTitle>
          <DialogDescription className="text-center">
            {sale?.outstandingBaseAmount
              ? t('pos:saleComplete.outstandingNotice')
              : t('pos:saleComplete.settledNotice')}
          </DialogDescription>
        </DialogHeader>

        {sale && (
          <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-center">
            <div>
              <p className="font-mono text-lg font-bold">{sale.documentNumber}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-primary">
                {amount(sale.total)} {sale.baseCurrencyCode}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{sale.customerName}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 border-t pt-3 text-start text-xs">
              <Metric label={t('pos:saleComplete.receivedNow')} value={`${amount(sale.collectedBaseAmount)} ${sale.baseCurrencyCode}`} />
              <Metric
                label={sale.outstandingBaseAmount > 0 ? t('pos:saleComplete.customerOwes') : t('pos:saleComplete.status')}
                value={sale.outstandingBaseAmount > 0
                  ? `${amount(sale.outstandingBaseAmount)} ${sale.baseCurrencyCode}`
                  : t('pos:saleComplete.paid')}
                accent={sale.outstandingBaseAmount > 0}
              />
            </div>
            {sale.paymentStatus !== SalesInvoicePaymentStatus.Paid && sale.paymentStatus !== SalesInvoicePaymentStatus.Overpaid && (
              <p className="text-start text-xs text-muted-foreground">
                {sale.paymentStatus === SalesInvoicePaymentStatus.Unpaid ? t('pos:saleComplete.creditSale') : t('pos:saleComplete.partialPayment')} · {t('pos:saleComplete.collectBalanceLater')}
              </p>
            )}
          </div>
        )}

        {printError && (
          <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {t('pos:saleComplete.printSuccessWithIssue', { error: printError })}
          </p>
        )}

        <DialogFooter className="sm:justify-center">
          <Button type="button" variant="outline" onClick={print}>
            <Printer className="size-4" />
            {t('pos:saleComplete.printReceipt')}
          </Button>
          <Button type="button" onClick={onNewSale}>
            <ShoppingCart className="size-4" />
            {t('pos:saleComplete.newSale')}
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

const amount = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })
