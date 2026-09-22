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
import { SalesLineType } from '@/features/sales'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useBranches, useCurrentBusiness } from '@/features/business'
import { RefundDialog } from '../components/RefundDialog'
import { useActivePosSession, usePosSale, usePosSetup } from '../hooks/usePos'
import { PosPaymentMode, PosRefundState } from '../types/pos.types'

export function PosReceiptPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [refundMode, setRefundMode] = useState<'refund' | 'void' | null>(null)
  const query = usePosSale(id)
  const currentUser = useCurrentUser().data
  const business = useCurrentBusiness().data
  const branches = useBranches().data?.data
  const activeSession = useActivePosSession().data
  const setup = usePosSetup().data
  const sale = query.data

  useEffect(() => {
    if (!sale || searchParams.get('print') !== '1') return
    const timer = window.setTimeout(() => window.print(), 250)
    return () => window.clearTimeout(timer)
  }, [sale, searchParams])

  if (query.isPending)
    return (
      <div className="grid h-72 place-items-center text-muted-foreground">Loading receipt…</div>
    )
  if (query.isError || !sale)
    return (
      <p className="text-destructive">{query.error?.message ?? 'POS receipt was not found.'}</p>
    )

  const hasMoneyMovement = sale.tenders.length > 0 || sale.change !== null
  const canRefund = hasCapability(currentUser?.role, 'managePos')
  const canSalesTrace = hasCapability(currentUser?.role, 'salesTrace')
  const canInventoryTrace = hasCapability(currentUser?.role, 'inventoryTrace')
  const canFinanceTrace = hasCapability(currentUser?.role, 'financeTrace')
  const canAccountingTrace = hasCapability(currentUser?.role, 'accountingTrace')
  const refundAvailable = sale.remainingRefundableBaseAmount > 0
  const refundState = sale.refundStatus === PosRefundState.FullyRefunded
    ? 'Fully refunded'
    : sale.refundStatus === PosRefundState.PartiallyRefunded ? 'Partially refunded' : 'Not refunded'
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
              <ArrowLeft />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">
              Sale complete ·{' '}
              <span className="font-mono text-primary">{sale.documentNumber}</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Sales, accounting and stock effects were committed together. Money Ledger reflects only money actually received or returned.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canRefund && refundAvailable && activeSession && setup && (
            <>
              <Button variant="outline" onClick={() => setRefundMode('refund')}><Undo2 /> Refund</Button>
              <Button variant="destructive" onClick={() => setRefundMode('void')}><Ban /> Void remaining</Button>
            </>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer />
            Print view
          </Button>
          <Link to="/pos">
            <Button>
              <ShoppingCart />
              New Sale
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
                {receiptName} POS Receipt
              </CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{[receiptContact, receiptAddress].filter(Boolean).join(' · ')}</p>
              <p className="mt-1 font-mono text-lg text-primary">{sale.documentNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p>{new Date(sale.completedAtUtc).toLocaleString()}</p>
              <p className="text-muted-foreground">Cashier: {sale.cashierUsername}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 text-sm sm:grid-cols-5">
            <Info label="Customer" value={sale.customerName ?? 'Walk-in'} />
            <Info label="Branch" value={`${sale.branchCode} — ${sale.branchName}`} />
            <Info
              label="Warehouse"
              value={
                sale.warehouseName
                  ? `${sale.warehouseCode} — ${sale.warehouseName}`
                  : 'No product fulfilment'
              }
            />
            <Info
              label="Payment"
              value={sale.paymentMode === PosPaymentMode.Paid
                ? 'Paid'
                : sale.paymentMode === PosPaymentMode.Partial
                  ? 'Partial'
                  : 'Credit'}
            />
            <Info label="Refund status" value={refundState} />
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Type / Professional</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Line total</TableHead>
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
                          <p>Service</p>
                          <p className="text-xs text-muted-foreground">
                            {line.professionalUsername ?? 'No Professional assigned'}
                          </p>
                        </>
                      ) : (
                        'Product'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{amount(line.quantity)}</TableCell>
                    <TableCell className="text-right font-mono">{amount(line.unitPrice)}</TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {amount(line.lineTotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <div>
              <h3 className="mb-2 font-semibold">Payments</h3>
              <div className="space-y-2">
                {sale.tenders.length === 0 && (
                  <div className="rounded-lg bg-muted px-3 py-3 text-sm text-muted-foreground">
                    No payment was received at checkout. The sale remains collectible through Customer Receipts.
                  </div>
                )}
                {sale.tenders.map((tender) => (
                  <div
                    key={tender.id}
                    className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {tender.moneyAccountCode} — {tender.moneyAccountName}
                      </p>
                      {tender.currencyId !== sale.baseCurrencyId && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Rate: 1 {tender.currencyCode} = {amount(tender.exchangeRate)} {sale.baseCurrencyCode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Equivalent: {amount(tender.baseAmount)} {sale.baseCurrencyCode}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {amount(tender.tenderedAmount)} {tender.currencyCode}
                      </p>
                    </div>
                  </div>
                ))}
                {sale.change && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/50 px-3 py-2 text-sm dark:bg-amber-950/10">
                    <div>
                      <p className="font-medium">Change · {sale.change.moneyAccountCode}</p>
                      {sale.change.currencyId !== sale.baseCurrencyId && (
                        <>
                          <p className="text-xs text-muted-foreground">
                            Rate: 1 {sale.change.currencyCode} = {amount(sale.change.exchangeRate)} {sale.baseCurrencyCode}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Equivalent: {amount(sale.change.baseAmount)} {sale.baseCurrencyCode}
                          </p>
                        </>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        −{amount(sale.change.amount)} {sale.change.currencyCode}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2 rounded-xl border p-4">
              <Total label="Subtotal" value={sale.subtotal} currency={sale.baseCurrencyCode} />
              <Total
                label="Tendered"
                value={sale.tenderedBaseAmount}
                currency={sale.baseCurrencyCode}
              />
              <Total
                label="Change"
                value={sale.changeBaseAmount}
                currency={sale.baseCurrencyCode}
              />
              <Total
                label="Total received"
                value={sale.settledBaseAmount}
                currency={sale.baseCurrencyCode}
              />
              <div className="border-t pt-2">
                <Total label="Original sale" value={sale.total} currency={sale.baseCurrencyCode} />
                <Total label="Refunded" value={sale.refundedBaseAmount} currency={sale.baseCurrencyCode} />
                <Total label="Net sale" value={sale.netSaleBaseAmount} currency={sale.baseCurrencyCode} strong />
              </div>
              <div className="border-t pt-2">
                <Total
                  label={sale.outstandingBaseAmount > 0 ? 'Customer owes' : 'Outstanding'}
                  value={sale.outstandingBaseAmount}
                  currency={sale.baseCurrencyCode}
                  strong
                />
              </div>
            </div>
          </div>

          {sale.refunds.length > 0 && (
            <section>
              <h3 className="mb-2 font-semibold">Refunds and reversals</h3>
              <div className="space-y-2">
                {sale.refunds.map((refund) => (
                  <Link key={refund.id} to={`/pos/refunds/${refund.id}`} className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-muted/50">
                    <div><p className="font-mono font-semibold text-primary">{refund.documentNumber}</p><p className="text-xs text-muted-foreground">{refund.isVoid ? 'Void reversal' : 'Refund'} · {new Date(refund.postedAtUtc).toLocaleString()} · approved by {refund.approvedByUsername}</p></div>
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
        <p className="print:hidden text-sm text-muted-foreground">Refund details are visible to you. Posting a refund or void requires a Manager, Owner, or SuperAdmin.</p>
      )}
      {canRefund && refundAvailable && !activeSession && (
        <p className="print:hidden rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">Open a POS session before posting a refund or void.</p>
      )}

      {refundMode && activeSession && setup && (
        <RefundDialog
          saleId={sale.id}
          session={activeSession}
          setup={setup}
          mode={refundMode}
          open
          onOpenChange={(open) => { if (!open) setRefundMode(null) }}
          onCompleted={(refund) => navigate(`/pos/refunds/${refund.id}`)}
        />
      )}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Traceability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {canSalesTrace && <Link to={`/sales/invoices/${sale.salesInvoiceId}`}>
            <Button variant="outline">
              <ReceiptText />
              Sales source
            </Button>
          </Link>}
          {canInventoryTrace && sale.stockMovementIds.length > 0 && (
            <Link
              to={`/inventory/ledger?documentNumber=${encodeURIComponent(sale.documentNumber)}`}
            >
              <Button variant="outline">
                <PackageSearch />
                Stock Ledger
              </Button>
            </Link>
          )}
          {canFinanceTrace && hasMoneyMovement && (
            <Link
              to={`/finance/money-ledger?documentNumber=${encodeURIComponent(sale.documentNumber)}`}
            >
              <Button variant="outline">
                <Landmark />
                Money Ledger
              </Button>
            </Link>
          )}
          {canAccountingTrace && <Link to={`/accounting/journal?search=${encodeURIComponent(sale.documentNumber)}`}>
            <Button variant="outline">
              <BookOpen />
              Accounting journal
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
const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
