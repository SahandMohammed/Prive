import { useEffect } from 'react'
import { ArrowLeft, BookOpen, Landmark, PackageSearch, Printer, ReceiptText } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SalesLineType } from '@/features/sales'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useBranches, useCurrentBusiness } from '@/features/business'
import { usePosRefund } from '../hooks/usePos'
import { PosRefundReason } from '../types/pos.types'

const reasonLabels: Record<number, string> = {
  [PosRefundReason.WrongServiceEntered]: 'Wrong service entered',
  [PosRefundReason.WrongProductEntered]: 'Wrong product entered',
  [PosRefundReason.CustomerComplaint]: 'Customer complaint',
  [PosRefundReason.DuplicateSale]: 'Duplicate sale',
  [PosRefundReason.ProductReturned]: 'Product returned',
  [PosRefundReason.ServiceIssue]: 'Service issue',
  [PosRefundReason.CashierMistake]: 'Cashier mistake',
  [PosRefundReason.Other]: 'Other',
}

export function PosRefundReceiptPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const query = usePosRefund(id)
  const user = useCurrentUser().data
  const business = useCurrentBusiness().data
  const branches = useBranches().data?.data
  const refund = query.data

  useEffect(() => {
    if (!refund || searchParams.get('print') !== '1') return
    const timer = window.setTimeout(() => window.print(), 250)
    return () => window.clearTimeout(timer)
  }, [refund, searchParams])

  if (query.isPending) return <div className="grid h-72 place-items-center text-muted-foreground">Loading refund receipt…</div>
  if (query.isError || !refund) return <p className="text-destructive">{query.error?.message ?? 'Refund receipt was not found.'}</p>
  const hasStock = refund.lines.some((line) => line.stockMovementIds.length > 0)
  const branch = branches?.find((item) => item.id === refund.branchId)
  const receiptName = [business?.name, branch?.name ?? refund.branchName].filter(Boolean).join(' · ') || 'Business'
  const receiptContact = branch?.phoneNumber ?? business?.primaryPhoneNumber
  const receiptAddress = branch?.address ?? business?.address

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-5 print:max-w-none print:p-0">
      <header className="flex flex-col justify-between gap-4 print:hidden sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to={`/pos/sales/${refund.posSaleId}`}><Button variant="ghost" size="icon"><ArrowLeft /></Button></Link>
          <div><h1 className="text-2xl font-bold">{refund.isVoid ? 'Void reversal' : 'Refund'} · <span className="font-mono text-primary">{refund.documentNumber}</span></h1><p className="text-sm text-muted-foreground">Posted atomically without changing the original sale.</p></div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer /> Print refund</Button>
      </header>

      <Card className={`print:border-0 print:shadow-none ${business?.receiptPaperWidth === 'Mm58' ? 'print:max-w-[58mm]' : 'print:max-w-[80mm]'}`}>
        <CardHeader className="border-b"><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><ReceiptText /> {business?.logoReference && <img src={business.logoReference} alt="" className="size-7 rounded object-contain" />} {receiptName} {refund.isVoid ? 'Void' : 'Refund'} Receipt</CardTitle><p className="mt-1 text-xs text-muted-foreground">{[receiptContact, receiptAddress].filter(Boolean).join(' · ')}</p><p className="mt-1 font-mono text-lg text-primary">{refund.documentNumber}</p></div><div className="text-right text-sm"><p>{new Date(refund.postedAtUtc).toLocaleString()}</p><p className="text-muted-foreground">Approved by {refund.approvedByUsername}</p></div></div></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
            <Info label="Original sale" value={refund.posSaleDocumentNumber} />
            <Info label="Invoice" value={refund.salesInvoiceDocumentNumber} />
            <Info label="Customer" value={refund.customerName ?? 'Walk-in'} />
            <Info label="Branch" value={`${refund.branchCode} — ${refund.branchName}`} />
            <Info label="Session" value={refund.posSessionNumber} />
            <Info label="Reason" value={reasonLabels[refund.reason]} />
          </div>
          {refund.notes && <div className="rounded-lg bg-muted p-3 text-sm"><span className="font-medium">Notes:</span> {refund.notes}</div>}
          <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>Line</TableHead><TableHead>Type</TableHead><TableHead className="text-right">Quantity</TableHead><TableHead>Inventory</TableHead><TableHead className="text-right">Refund</TableHead></TableRow></TableHeader><TableBody>{refund.lines.map((line) => <TableRow key={line.id}><TableCell><p className="font-medium">{line.description}</p>{line.professionalName && <p className="text-xs text-muted-foreground">{line.professionalName}</p>}</TableCell><TableCell>{line.lineType === SalesLineType.Service ? 'Service' : 'Product'}</TableCell><TableCell className="text-right font-mono">{money(line.quantity)} {line.unitCode}</TableCell><TableCell>{line.lineType === SalesLineType.Service ? 'Not applicable' : line.restockProduct ? 'Restocked' : 'Not restocked'}</TableCell><TableCell className="text-right font-mono font-semibold">−{money(line.refundAmountBase)} {refund.baseCurrencyCode}</TableCell></TableRow>)}</TableBody></Table></div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section><h3 className="mb-2 font-semibold">Physical payouts</h3>{refund.tenders.length === 0 ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">No money left an account; the reversal was absorbed by Accounts Receivable.</p> : <div className="space-y-2">{refund.tenders.map((tender) => <div key={tender.id} className="flex justify-between rounded-lg bg-muted p-3 text-sm"><div><p className="font-medium">{tender.moneyAccountCode} — {tender.moneyAccountName}</p><p className="text-xs text-muted-foreground">Refund-time rate: 1 {tender.currencyCode} = {money(tender.exchangeRate)} {refund.baseCurrencyCode} · base {money(tender.baseAmount)}</p></div><p className="font-mono font-semibold">−{money(tender.amount)} {tender.currencyCode}</p></div>)}</div>}</section>
            <div className="space-y-2 rounded-xl border p-4">
              <Total label="Total refund" value={refund.totalRefundBase} currency={refund.baseCurrencyCode} strong />
              <Total label="Receivable reduction" value={refund.receivableReversalBase} currency={refund.baseCurrencyCode} />
              <Total label="Physical payout" value={refund.cashRefundBase} currency={refund.baseCurrencyCode} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">Created by {refund.createdByUsername} · approved by {refund.approvedByUsername} · journal {refund.journalEntryId}</p>
          {business?.receiptFooter && <p className="border-t pt-3 text-center text-xs text-muted-foreground">{business.receiptFooter}</p>}
        </CardContent>
      </Card>

      <Card className="print:hidden"><CardHeader><CardTitle>Traceability</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
        <Link to={`/pos/sales/${refund.posSaleId}`}><Button variant="outline"><ReceiptText /> Original sale</Button></Link>
        {hasCapability(user?.role, 'inventoryTrace') && hasStock && <Link to={`/inventory/ledger?documentNumber=${encodeURIComponent(refund.documentNumber)}`}><Button variant="outline"><PackageSearch /> Stock Ledger</Button></Link>}
        {hasCapability(user?.role, 'financeTrace') && refund.tenders.length > 0 && <Link to={`/finance/money-ledger?documentNumber=${encodeURIComponent(refund.documentNumber)}`}><Button variant="outline"><Landmark /> Money Ledger</Button></Link>}
        {hasCapability(user?.role, 'accountingTrace') && <Link to={`/accounting/journal?search=${encodeURIComponent(refund.documentNumber)}`}><Button variant="outline"><BookOpen /> Accounting journal</Button></Link>}
      </CardContent></Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div> }
function Total({ label, value, currency, strong = false }: { label: string; value: number; currency: string; strong?: boolean }) { return <div className={`flex justify-between ${strong ? 'text-lg font-bold' : 'text-sm'}`}><span>{label}</span><span className="font-mono">{money(value)} {currency}</span></div> }
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
