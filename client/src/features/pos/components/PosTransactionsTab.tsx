import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExternalLink, Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { usePosCustomers, usePosSales, usePosSessions, usePosSetup } from '../hooks/usePos'
import { PosPaymentMode, PosRefundState } from '../types/pos.types'

export function PosTransactionsTab() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [paymentMode, setPaymentMode] = useState<'' | PosPaymentMode>('')
  const [refundState, setRefundState] = useState<'' | PosRefundState>('')
  const [customerId, setCustomerId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [posSessionId, setPosSessionId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const setup = usePosSetup()
  const customers = usePosCustomers({ page: 1, pageSize: 100 })
  const sessions = usePosSessions({ page: 1, pageSize: 100 })
  const sales = usePosSales({ page, pageSize, search: search || undefined, customerId: customerId || undefined, branchId: branchId || undefined, posSessionId: posSessionId || undefined, paymentMode: paymentMode === '' ? undefined : paymentMode, refundState: refundState === '' ? undefined : refundState, fromDate: fromDate || undefined, toDate: toDate || undefined })
  const refresh = () => setPage(1)

  return <section className="space-y-4">
    <div><h2 className="text-lg font-semibold">Transactions</h2><p className="mt-1 text-sm text-muted-foreground">Completed POS sales and their current settlement status.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Input value={search} onChange={(event) => { setSearch(event.target.value); refresh() }} placeholder="Receipt or customer" />
      <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={branchId} onChange={(event) => { setBranchId(event.target.value); refresh() }}><option value="">All branches</option>{(setup.data?.branches ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.code} · {branch.name}</option>)}</select>
      <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={customerId} onChange={(event) => { setCustomerId(event.target.value); refresh() }}><option value="">All customers</option>{(customers.data?.data ?? []).map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}</select>
      <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={posSessionId} onChange={(event) => { setPosSessionId(event.target.value); refresh() }}><option value="">All sessions</option>{(sessions.data?.data ?? []).map((session) => <option key={session.id} value={session.id}>{session.sessionNumber} · {session.cashierUsername}</option>)}</select>
      <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={paymentMode} onChange={(event) => { setPaymentMode(event.target.value === '' ? '' : Number(event.target.value) as PosPaymentMode); refresh() }}><option value="">All payment modes</option><option value={PosPaymentMode.Paid}>Paid</option><option value={PosPaymentMode.Partial}>Partial</option><option value={PosPaymentMode.Credit}>Credit</option></select>
      <select className="h-9 rounded-md border border-input bg-background px-3 text-sm" value={refundState} onChange={(event) => { setRefundState(event.target.value === '' ? '' : Number(event.target.value) as PosRefundState); refresh() }}><option value="">All refund states</option><option value={PosRefundState.NotRefunded}>Not refunded</option><option value={PosRefundState.PartiallyRefunded}>Partially refunded</option><option value={PosRefundState.FullyRefunded}>Fully refunded</option></select>
      <Input type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); refresh() }} aria-label="From date" />
      <Input type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); refresh() }} aria-label="To date" />
    </div>
    <DataTableShell><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Customer</TableHead><TableHead>Session / Cashier</TableHead><TableHead>Payment</TableHead><TableHead className="text-right">Gross</TableHead><TableHead className="text-right">Settled</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Refunded</TableHead><TableHead className="text-right">Net</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader><TableBody>
      {sales.isPending && <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">Loading transactions…</TableCell></TableRow>}
      {sales.isError && <TableRow><TableCell colSpan={10} className="h-24 text-center text-destructive">{sales.error.message}</TableCell></TableRow>}
      {!sales.isPending && !sales.isError && sales.data?.data.length === 0 && <TableRow><TableCell colSpan={10} className="h-24 text-center text-muted-foreground">No transactions match these filters.</TableCell></TableRow>}
      {(sales.data?.data ?? []).map((sale) => <TableRow key={sale.id}><TableCell><p className="font-mono font-medium">{sale.documentNumber}</p><p className="text-xs text-muted-foreground">{new Date(sale.completedAtUtc).toLocaleString()}</p></TableCell><TableCell>{sale.customerName ?? 'Walk-in'}</TableCell><TableCell><p>{sale.posSessionNumber ?? '—'}</p><p className="text-xs text-muted-foreground">{sale.cashierUsername}</p></TableCell><TableCell>{sale.paymentMode === PosPaymentMode.Credit ? 'Credit' : sale.paymentMode === PosPaymentMode.Partial ? 'Partial' : 'Paid'}<p className="text-xs text-muted-foreground">{sale.refundStatus === PosRefundState.FullyRefunded ? 'Fully refunded' : sale.refundStatus === PosRefundState.PartiallyRefunded ? 'Partially refunded' : 'Not refunded'}</p></TableCell><TableCell className="text-right font-mono">{money(sale.total)} {sale.baseCurrencyCode}</TableCell><TableCell className="text-right font-mono">{money(sale.settledBaseAmount)}</TableCell><TableCell className="text-right font-mono">{money(Math.max(sale.outstandingBaseAmount, 0))}</TableCell><TableCell className="text-right font-mono">{money(sale.refundedBaseAmount)}</TableCell><TableCell className="text-right font-mono">{money(sale.netSaleBaseAmount)}</TableCell><TableCell><div className="flex gap-1"><Link to={`/pos/sales/${sale.id}`}><Button size="icon" variant="ghost" aria-label={`View ${sale.documentNumber}`}><ExternalLink className="size-4" /></Button></Link><Link to={`/pos/sales/${sale.id}?print=1`} target="_blank"><Button size="icon" variant="ghost" aria-label={`Print ${sale.documentNumber}`}><Printer className="size-4" /></Button></Link></div></TableCell></TableRow>)}
    </TableBody></Table></div></DataTableShell>
    {sales.data && <DataTablePagination page={page} pageSize={pageSize} totalItems={sales.data.meta.totalCount} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />}
  </section>
}

const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
