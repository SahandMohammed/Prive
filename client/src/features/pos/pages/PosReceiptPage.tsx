import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Ban,
  BookOpen,
  Landmark,
  PackageSearch,
  Printer,
  ReceiptText,
  ShoppingCart,
  Undo2,
} from 'lucide-react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SalesInvoicePaymentStatus, SalesLineType } from '@/features/sales'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useBranches, useCurrentBusiness } from '@/features/business'
import { formatDateTime, formatNumber } from '@/lib/i18n'
import { RefundDialog } from '../components/RefundDialog'
import { usePosSale, usePosSetup } from '../hooks/usePos'
import { PosRefundState } from '../types/pos.types'

export function PosReceiptPage() {
  const { t } = useTranslation(['pos', 'common'])
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [refundMode, setRefundMode] = useState<'refund' | 'void' | null>(null)
  const query = usePosSale(id)
  const currentUser = useCurrentUser().data
  const business = useCurrentBusiness().data
  const branches = useBranches().data?.data
  const setup = usePosSetup().data
  const sale = query.data

  useEffect(() => {
    if (!sale || searchParams.get('print') !== '1') return
    const timer = window.setTimeout(() => window.print(), 250)
    return () => window.clearTimeout(timer)
  }, [sale, searchParams])

  if (query.isPending)
    return (
      <div className="grid h-72 place-items-center text-muted-foreground">{t('common:states.loading')}</div>
    )
  if (query.isError || !sale)
    return (
      <p className="text-destructive">{query.error?.message ?? t('pos:receipt.title')}</p>
    )

  const hasMoneyMovement = sale.collections.length > 0 || sale.change !== null
  const canRefund = hasCapability(currentUser?.role, 'managePos')
  const canSalesTrace = hasCapability(currentUser?.role, 'salesTrace')
  const canInventoryTrace = hasCapability(currentUser?.role, 'inventoryTrace')
  const canFinanceTrace = hasCapability(currentUser?.role, 'financeTrace')
  const canAccountingTrace = hasCapability(currentUser?.role, 'accountingTrace')
  const refundAvailable = sale.remainingRefundableBaseAmount > 0
  const refundState = sale.refundStatus === PosRefundState.FullyRefunded
    ? t('pos:receipt.fullyRefunded')
    : sale.refundStatus === PosRefundState.PartiallyRefunded ? t('pos:receipt.partiallyRefunded') : t('pos:receipt.notRefunded')
  const branch = branches?.find((item) => item.id === sale.branchId)
  const receiptName = [business?.name, branch?.name ?? sale.branchName].filter(Boolean).join(' · ') || 'Business'
  const receiptContact = branch?.phoneNumber ?? business?.primaryPhoneNumber
  const receiptAddress = branch?.address ?? business?.address

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-5 print:max-w-none print:p-0">
      <header className="flex flex-col justify-between gap-4 print:hidden sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to="/pos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              {t('pos:receipt.saleComplete')} ·{' '}
              <span className="font-mono text-primary">{sale.documentNumber}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              {t('pos:receipt.committedNotice')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRefund && refundAvailable && setup && (
            <>
              <Button variant="outline" onClick={() => setRefundMode('refund')}><Undo2 /> {t('pos:receipt.refund')}</Button>
              <Button variant="destructive" onClick={() => setRefundMode('void')}><Ban /> {t('pos:receipt.voidRemaining')}</Button>
            </>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            {t('common:actions.print', 'Print view')}
          </Button>
          <Link to="/pos">
            <Button>
              <ShoppingCart />
              {t('pos:saleComplete.newSale')}
            </Button>
          </Link>
        </div>
      </header>

      <Card className={`print:border-0 print:shadow-none ${business?.receiptPaperWidth === 'Mm58' ? 'print:max-w-[58mm]' : 'print:max-w-[80mm]'}`}>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ReceiptText />
                {business?.logoReference && <img src={business.logoReference} alt="" className="size-7 rounded object-contain" />}
                {receiptName} {t('pos:receipt.salesReceipt')}
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{[receiptContact, receiptAddress].filter(Boolean).join(' · ')}</p>
              <p className="mt-1 font-mono text-lg text-primary">{sale.documentNumber}</p>
            </div>
            <div className="text-end text-sm">
              <p>{formatDateTime(sale.completedAtUtc)}</p>
              <p className="text-muted-foreground">{t('pos:operator')}: {sale.operatorUsername}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 text-sm sm:grid-cols-5">
            <Info label={t('pos:checkout.customer')} value={sale.customerName} />
            <Info label={t('pos:branch')} value={`${sale.branchCode} — ${sale.branchName}`} />
            <Info
              label={t('pos:topBar.warehouse')}
              value={
                sale.warehouseName
                  ? `${sale.warehouseCode} — ${sale.warehouseName}`
                  : '—'
              }
            />
            <Info
              label={t('pos:checkout.paymentMethod')}
              value={sale.paymentStatus === SalesInvoicePaymentStatus.Paid
                ? t('pos:checkout.paid')
                : sale.paymentStatus === SalesInvoicePaymentStatus.PartiallyPaid
                  ? t('pos:saleComplete.partialPayment')
                  : sale.paymentStatus === SalesInvoicePaymentStatus.Overpaid
                    ? t('sales:status.overpaid', { defaultValue: 'Overpaid' })
                    : t('pos:saleComplete.creditSale')}
            />
            <Info label={t('pos:status')} value={refundState} />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('pos:receipt.items')}</TableHead>
                  <TableHead>{t('pos:cart.professional')}</TableHead>
                  <TableHead className="text-end">{t('pos:cart.quantity')}</TableHead>
                  <TableHead className="text-end">{t('pos:cart.price')}</TableHead>
                  <TableHead className="text-end">{t('pos:cart.total')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <p className="font-medium">{line.serviceName ?? line.productName}</p>
                      {line.sku && (
                        <p className="font-mono text-xs text-muted-foreground">
                          {line.sku} · {line.unitCode}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      {line.lineType === SalesLineType.Service ? (
                        <>
                          <p>{t('pos:service')}</p>
                          <p className="text-xs text-muted-foreground">
                            {line.professionalName ?? '—'}
                          </p>
                        </>
                      ) : (
                        t('pos:product')
                      )}
                    </TableCell>
                    <TableCell className="text-end font-mono">{amount(line.quantity)}</TableCell>
                    <TableCell className="text-end font-mono">{amount(line.unitPrice)}</TableCell>
                    <TableCell className="text-end font-mono font-semibold">
                      {amount(line.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <h3 className="mb-2 font-semibold">{t('pos:receipt.paymentSummary')}</h3>
              <div className="space-y-2">
                {sale.collections.length === 0 && (
                  <div className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                    {t('pos:checkout.unpaidOutstandingNotice')}
                  </div>
                )}
                {sale.collections.map((collection) => (
                  <div
                    key={collection.id}
                    className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {collection.moneyAccountCode} — {collection.moneyAccountName}
                      </p>
                      {collection.currencyId !== sale.baseCurrencyId && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            1 {collection.currencyCode} = {amount(collection.exchangeRate)} {sale.baseCurrencyCode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {amount(collection.baseAmount)} {sale.baseCurrencyCode}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-end">
                      <p className="font-mono font-semibold">
                        {amount(collection.amount)} {collection.currencyCode}
                      </p>
                    </div>
                  </div>
                ))}
                {sale.change && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/50 px-3 py-2 text-sm dark:bg-amber-950/10">
                    <div>
                      <p className="font-medium">{t('pos:checkout.change')} · {sale.change.moneyAccountCode}</p>
                      {sale.change.currencyId !== sale.baseCurrencyId && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            1 {sale.change.currencyCode} = {amount(sale.change.exchangeRate)} {sale.baseCurrencyCode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {amount(sale.change.baseAmount)} {sale.baseCurrencyCode}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-end">
                      <p className="font-mono font-semibold">
                        −{amount(sale.change.amount)} {sale.change.currencyCode}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 rounded-xl border p-4">
              <Total label={t('pos:cart.subtotal')} value={sale.subtotal} currency={sale.baseCurrencyCode} />
              <Total
                label={t('pos:checkout.received', { defaultValue: 'Gross collection' })}
                value={sale.grossCollectionBaseAmount}
                currency={sale.baseCurrencyCode}
              />
              <Total
                label={t('pos:checkout.change')}
                value={sale.changeBaseAmount}
                currency={sale.baseCurrencyCode}
              />
              <Total
                label={t('pos:saleComplete.receivedNow')}
                value={sale.collectedBaseAmount}
                currency={sale.baseCurrencyCode}
              />
              <div className="border-t pt-2">
                <Total label={t('pos:receipt.originalSale')} value={sale.total} currency={sale.baseCurrencyCode} />
                <Total label={t('pos:refund.alreadyRefunded')} value={sale.refundedBaseAmount} currency={sale.baseCurrencyCode} />
                <Total label={t('pos:netSales')} value={sale.netSaleBaseAmount} currency={sale.baseCurrencyCode} strong />
              </div>
              <div className="border-t pt-2">
                <Total
                  label={sale.outstandingBaseAmount > 0 ? t('pos:saleComplete.customerOwes') : t('pos:refund.remaining')}
                  value={sale.outstandingBaseAmount}
                  currency={sale.baseCurrencyCode}
                  strong
                />
              </div>
            </div>
          </div>

          {sale.refunds.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold">{t('pos:refund.refundLines')}</h3>
              <div className="space-y-2">
                {sale.refunds.map((refund) => (
                  <Link key={refund.id} to={`/pos/refunds/${refund.id}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50">
                    <div>
                      <p className="font-mono font-semibold text-primary">{refund.documentNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {refund.isVoid ? t('pos:refund.postVoid') : t('pos:refund.postRefund')} · {formatDateTime(refund.postedAtUtc)} · {refund.approvedByUsername}
                      </p>
                    </div>
                    <span className="font-mono font-semibold">−{amount(refund.totalRefundBase)} {sale.baseCurrencyCode}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}
          {business?.receiptFooter && <p className="border-t pt-3 text-center text-xs text-muted-foreground">{business.receiptFooter}</p>}
        </CardContent>
      </Card>

      {!canRefund && refundAvailable && (
        <p className="print:hidden text-sm text-muted-foreground">{t('pos:receipt.refund')}</p>
      )}
      {refundMode && setup && (
        <RefundDialog
          saleId={sale.id}
          setup={setup}
          mode={refundMode}
          open
          onOpenChange={(open) => { if (!open) setRefundMode(null) }}
          onCompleted={(refund) => navigate(`/pos/refunds/${refund.id}`)}
        />
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>{t('pos:receipt.traceability')}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canSalesTrace && <Link to={`/sales/invoices/${sale.id}`}>
            <Button variant="outline">
              <ReceiptText />
              {t('pos:receipt.originalSale')}
            </Button>
          </Link>}
          {canInventoryTrace && sale.stockMovementIds.length > 0 && (
            <Link
              to={`/inventory/ledger?documentNumber=${encodeURIComponent(sale.documentNumber)}`}
            >
              <Button variant="outline">
                <PackageSearch />
                {t('pos:receipt.stockLedger')}
              </Button>
            </Link>
          )}
          {canFinanceTrace && hasMoneyMovement && (
            <Link
              to={`/finance/money-ledger?documentNumber=${encodeURIComponent(sale.documentNumber)}`}
            >
              <Button variant="outline">
                <Landmark />
                {t('pos:receipt.moneyLedger')}
              </Button>
            </Link>
          )}
          {canAccountingTrace && <Link to={`/accounting/journal?search=${encodeURIComponent(sale.documentNumber)}`}>
            <Button variant="outline">
              <BookOpen />
              {t('pos:receipt.accountingJournal')}
            </Button>
          </Link>}
        </CardContent>
      </Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  )
}
function Total({
  label,
  value,
  currency,
  strong = false,
}: {
  label: string
  value: number
  currency: string
  strong?: boolean
}) {
  return (
    <div
      className={strong ? 'flex justify-between text-lg font-bold' : 'flex justify-between text-sm'}
    >
      <span>{label}</span>
      <span className="font-mono">
        {amount(value)} {currency}
      </span>
    </div>
  )
}
const amount = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })
