import { Link, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePayment } from '../hooks/useFinance'
import { PaymentMoneyDirection, PaymentOrigin } from '../types/finance.types'

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const originLabel: Record<PaymentOrigin, string> = {
  [PaymentOrigin.SalesInvoice]: 'Sales invoice',
  [PaymentOrigin.CustomerReceipt]: 'Customer receipt',
  [PaymentOrigin.Pos]: 'POS',
}

export function PaymentPage() {
  const { id } = useParams()
  const query = usePayment(id)
  if (query.isPending) return <p>Loading Payment…</p>
  if (query.isError || !query.data) return <p>Payment could not be loaded.</p>
  const payment = query.data
  return <div className="space-y-4">
    <Card><CardHeader><CardTitle>Payment <span className="font-mono text-primary">{payment.documentNumber}</span></CardTitle><CardDescription>{payment.customerName} · {payment.paymentDate} · {originLabel[payment.origin]}</CardDescription></CardHeader><CardContent className="grid gap-3 sm:grid-cols-4"><p>Net <b>{amount(payment.amount)} {payment.currencyCode}</b></p><p>Base <b>{amount(payment.baseAmount)} {payment.baseCurrencyCode}</b></p>{payment.originSourceId && payment.originSourceDocumentNumber && <Link className="text-primary" to={payment.origin === PaymentOrigin.CustomerReceipt ? `/finance/customer-receipts/${payment.originSourceId}` : payment.origin === PaymentOrigin.Pos ? `/pos/sales/${payment.originSourceId}` : `/sales/invoices/${payment.originSourceId}`}>Source {payment.originSourceDocumentNumber}</Link>}<Link className="text-primary" to={`/accounting/journal?search=${encodeURIComponent(payment.documentNumber)}`}>Accounting journal</Link></CardContent></Card>
    <Card><CardHeader><CardTitle>Invoice allocations</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Base</TableHead></TableRow></TableHeader><TableBody>{payment.allocations.map((allocation) => <TableRow key={allocation.id}><TableCell><Link className="text-primary" to={`/sales/invoices/${allocation.salesInvoiceId}`}>{allocation.salesInvoiceDocumentNumber}</Link></TableCell><TableCell className="text-right">{amount(allocation.amount)}</TableCell><TableCell className="text-right">{amount(allocation.baseAmount)}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
    <Card><CardHeader><CardTitle>Money movements</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Direction</TableHead><TableHead>Account</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Base</TableHead></TableRow></TableHeader><TableBody>{payment.moneyLines.map((line) => <TableRow key={line.id}><TableCell>{line.direction === PaymentMoneyDirection.Collection ? 'Collection' : 'Change'}</TableCell><TableCell>{line.moneyAccountCode} · {line.moneyAccountName}</TableCell><TableCell className="text-right">{amount(line.amount)} {line.currencyCode}</TableCell><TableCell className="text-right">{amount(line.exchangeRate)}</TableCell><TableCell className="text-right">{amount(line.baseAmount)} {payment.baseCurrencyCode}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
  </div>
}
