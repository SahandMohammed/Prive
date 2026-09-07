import { useEffect } from 'react'
import {
  ArrowLeft,
  BookOpen,
  Landmark,
  PackageSearch,
  Printer,
  ReceiptText,
  ShoppingCart,
} from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { usePosSale } from '../hooks/usePos'

export function PosReceiptPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const query = usePosSale(id)
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
              All Sales, Inventory, Money Ledger, and Accounting effects were committed together.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ReceiptText />
                Prive Lounge POS Receipt
              </CardTitle>
              <p className="mt-1 font-mono text-lg text-primary">{sale.documentNumber}</p>
            </div>
            <div className="text-right text-sm">
              <p>{new Date(sale.completedAtUtc).toLocaleString()}</p>
              <p className="text-muted-foreground">Cashier: {sale.cashierUsername}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 text-sm sm:grid-cols-3">
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
              <h3 className="mb-2 font-semibold">Payment received</h3>
              <div className="space-y-2">
                {sale.tenders.map((tender) => (
                  <div
                    key={tender.id}
                    className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {tender.moneyAccountCode} — {tender.moneyAccountName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Rate snapshot: {tender.exchangeRate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        {amount(tender.tenderedAmount)} {tender.currencyCode}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {amount(tender.baseAmount)} {sale.baseCurrencyCode}
                      </p>
                    </div>
                  </div>
                ))}
                {sale.change && (
                  <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50/50 px-3 py-2 text-sm dark:bg-amber-950/10">
                    <div>
                      <p className="font-medium">Change · {sale.change.moneyAccountCode}</p>
                      <p className="text-xs text-muted-foreground">
                        Rate snapshot: {sale.change.exchangeRate}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-semibold">
                        −{amount(sale.change.amount)} {sale.change.currencyCode}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        −{amount(sale.change.baseAmount)} {sale.baseCurrencyCode}
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
              <div className="border-t pt-2">
                <Total
                  label="Total settled"
                  value={sale.settledBaseAmount}
                  currency={sale.baseCurrencyCode}
                  strong
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Traceability</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Link to={`/sales/invoices/${sale.salesInvoiceId}`}>
            <Button variant="outline">
              <ReceiptText />
              Sales source
            </Button>
          </Link>
          {sale.stockMovementIds.length > 0 && (
            <Link
              to={`/inventory/ledger?documentNumber=${encodeURIComponent(sale.documentNumber)}`}
            >
              <Button variant="outline">
                <PackageSearch />
                Stock Ledger
              </Button>
            </Link>
          )}
          <Link
            to={`/finance/money-ledger?documentNumber=${encodeURIComponent(sale.documentNumber)}`}
          >
            <Button variant="outline">
              <Landmark />
              Money Ledger
            </Button>
          </Link>
          <Link to={`/accounting/journal?search=${encodeURIComponent(sale.documentNumber)}`}>
            <Button variant="outline">
              <BookOpen />
              Accounting journal
            </Button>
          </Link>
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