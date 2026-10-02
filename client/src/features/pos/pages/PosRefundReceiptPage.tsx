import { useEffect } from 'react'
import { ArrowLeft, BookOpen, Landmark, PackageSearch, Printer, ReceiptText } from 'lucide-react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SalesLineType } from '@/features/sales'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useBranches, useCurrentBusiness } from '@/features/business'
import { formatDateTime, formatNumber } from '@/lib/i18n'
import { usePosRefund } from '../hooks/usePos'
import { PosRefundReason } from '../types/pos.types'

const getRefundReasonLabel = (reason: PosRefundReason, t: (key: string) => string) => {
  switch (reason) {
    case PosRefundReason.WrongServiceEntered: return t('pos:refund.reasons.wrongService')
    case PosRefundReason.WrongProductEntered: return t('pos:refund.reasons.wrongProduct')
    case PosRefundReason.CustomerComplaint: return t('pos:refund.reasons.complaint')
    case PosRefundReason.DuplicateSale: return t('pos:refund.reasons.duplicate')
    case PosRefundReason.ProductReturned: return t('pos:refund.reasons.returned')
    case PosRefundReason.ServiceIssue: return t('pos:refund.reasons.serviceIssue')
    case PosRefundReason.CashierMistake: return t('pos:refund.reasons.cashierMistake')
    case PosRefundReason.Other:
    default: return t('pos:refund.reasons.other')
  }
}

export function PosRefundReceiptPage() {
  const { t } = useTranslation(['pos', 'common'])
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

  if (query.isPending) return <div className="grid h-72 place-items-center text-muted-foreground">{t('common:states.loading')}</div>
  if (query.isError || !refund) return <p className="text-destructive">{query.error?.message ?? t('pos:refund.refundTitle')}</p>
  const hasStock = refund.lines.some((line) => line.stockMovementIds.length > 0)
  const branch = branches?.find((item) => item.id === refund.branchId)
  const receiptName = [business?.name, branch?.name ?? refund.branchName].filter(Boolean).join(' · ') || 'Business'
  const receiptContact = branch?.phoneNumber ?? business?.primaryPhoneNumber
  const receiptAddress = branch?.address ?? business?.address

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-5 print:max-w-none print:p-0">
      <header className="flex flex-col justify-between gap-4 print:hidden sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to={`/pos/sales/${refund.salesInvoiceId}`}><Button variant="ghost" size="icon"><ArrowLeft className="rtl:rotate-180" /></Button></Link>
          <div><h1 className="text-2xl font-bold">{refund.isVoid ? t('pos:refund.postVoid') : t('pos:refund.postRefund')} · <span className="font-mono text-primary">{refund.documentNumber}</span></h1><p className="text-sm text-muted-foreground">{t('pos:receipt.committedNotice')}</p></div>
        </div>
        <Button variant="outline" onClick={() => window.print()}><Printer /> {t('common:actions.print', 'Print view')}</Button>
      </header>

      <Card className={`print:border-0 print:shadow-none ${business?.receiptPaperWidth === 'Mm58' ? 'print:max-w-[58mm]' : 'print:max-w-[80mm]'}`}>
        <CardHeader className="border-b"><div className="flex items-start justify-between gap-4"><div><CardTitle className="flex items-center gap-2"><ReceiptText /> {business?.logoReference && <img src={business.logoReference} alt="" className="size-7 rounded object-contain" />} {receiptName} {refund.isVoid ? t('pos:receipt.voidReceipt') : t('pos:receipt.refundReceipt')}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{[receiptContact, receiptAddress].filter(Boolean).join(' · ')}</p><p className="mt-1 font-mono text-lg text-primary">{refund.documentNumber}</p></div><div className="text-end text-sm"><p>{formatDateTime(refund.postedAtUtc)}</p><p className="text-muted-foreground">{t('pos:operator')}: {refund.approvedByUsername}</p></div></div></CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 text-sm sm:grid-cols-3 lg:grid-cols-5">
            <Info label={t('pos:refund.sale')} value={refund.salesInvoiceDocumentNumber} />
            <Info label={t('pos:refund.invoice')} value={refund.salesInvoiceDocumentNumber} />
            <Info label={t('pos:refund.customer')} value={refund.customerName} />
            <Info label={t('pos:branch')} value={`${refund.branchCode} — ${refund.branchName}`} />
            <Info label={t('pos:refund.reason')} value={getRefundReasonLabel(refund.reason, t)} />
          </div>
          {refund.notes && <div className="rounded-lg bg-muted p-3 text-sm"><span className="font-medium">{t('pos:refund.notes')}:</span> {refund.notes}</div>}
          <div className="overflow-x-auto rounded-lg border"><Table><TableHeader><TableRow><TableHead>{t('pos:receipt.items')}</TableHead><TableHead>{t('pos:cart.professional')}</TableHead><TableHead className="text-end">{t('pos:cart.quantity')}</TableHead><TableHead>{t('pos:receipt.stockLedger')}</TableHead><TableHead className="text-end">{t('pos:receipt.refund')}</TableHead></TableRow></TableHeader><TableBody>{refund.lines.map((line) => <TableRow key={line.id}><TableCell><p className="font-medium">{line.description}</p>{line.professionalName && <p className="text-xs text-muted-foreground">{line.professionalName}</p>}</TableCell><TableCell>{line.lineType === SalesLineType.Service ? t('pos:service') : t('pos:product')}</TableCell><TableCell className="text-end font-mono">{money(line.quantity)} {line.unitCode}</TableCell><TableCell>{line.lineType === SalesLineType.Service ? '—' : line.restockProduct ? t('pos:refund.restockProduct') : '—'}</TableCell><TableCell className="text-end font-mono font-semibold">−{money(line.refundAmountBase)} {refund.baseCurrencyCode}</TableCell></TableRow>)}</TableBody></Table></div>

          <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
            <section><h3 className="mb-2 font-semibold">{t('pos:refund.returnPhysicalMoney')}</h3>{refund.refundPayouts.length === 0 ? <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{t('pos:refund.noPhysicalPayoutRequired')}</p> : <div className="space-y-2">{refund.refundPayouts.map((payout) => <div key={payout.id} className="flex justify-between rounded-lg bg-muted p-3 text-sm"><div><p className="font-medium">{payout.moneyAccountCode} — {payout.moneyAccountName}</p><p className="text-xs text-muted-foreground">1 {payout.currencyCode} = {money(payout.exchangeRate)} {refund.baseCurrencyCode} · {money(payout.baseAmount)}</p></div><p className="font-mono font-semibold">−{money(payout.amount)} {payout.currencyCode}</p></div>)}</div>}</section>
            <div className="space-y-2 rounded-xl border p-4">
              <Total label={t('pos:refund.selectedRefund')} value={refund.totalRefundBase} currency={refund.baseCurrencyCode} strong />
              <Total label={t('pos:refund.arReductionFirst')} value={refund.receivableReversalBase} currency={refund.baseCurrencyCode} />
              <Total label={t('pos:refund.physicalPayout')} value={refund.cashRefundBase} currency={refund.baseCurrencyCode} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{refund.createdByUsername} · {refund.approvedByUsername}</p>
          {business?.receiptFooter && <p className="border-t pt-3 text-center text-xs text-muted-foreground">{business.receiptFooter}</p>}
        </CardContent>
      </Card>

      <Card className="print:hidden"><CardHeader><CardTitle>{t('pos:receipt.traceability')}</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2">
        <Link to={`/pos/sales/${refund.salesInvoiceId}`}><Button variant="outline"><ReceiptText /> {t('pos:receipt.originalSale')}</Button></Link>
        {hasCapability(user?.role, 'inventoryTrace') && hasStock && <Link to={`/inventory/ledger?documentNumber=${encodeURIComponent(refund.documentNumber)}`}><Button variant="outline"><PackageSearch /> {t('pos:receipt.stockLedger')}</Button></Link>}
        {hasCapability(user?.role, 'financeTrace') && refund.refundPayouts.length > 0 && <Link to={`/finance/money-ledger?documentNumber=${encodeURIComponent(refund.documentNumber)}`}><Button variant="outline"><Landmark /> {t('pos:receipt.moneyLedger')}</Button></Link>}
        {hasCapability(user?.role, 'accountingTrace') && <Link to={`/accounting/journal?search=${encodeURIComponent(refund.documentNumber)}`}><Button variant="outline"><BookOpen /> {t('pos:receipt.accountingJournal')}</Button></Link>}
      </CardContent></Card>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div> }
function Total({ label, value, currency, strong = false }: { label: string; value: number; currency: string; strong?: boolean }) { return <div className={`flex justify-between ${strong ? 'text-lg font-bold' : 'text-sm'}`}><span>{label}</span><span className="font-mono">{money(value)} {currency}</span></div> }
const money = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })
