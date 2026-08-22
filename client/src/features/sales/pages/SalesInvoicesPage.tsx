import { useState } from 'react'
import { FilePlus2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBranches, useCurrencies } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useSalesInvoices } from '../hooks/useSales'
import { SalesInvoiceStatus } from '../types/sales.types'

export function SalesInvoicesPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const customers = useContacts({ page: 1, pageSize: 100, role: 0 }).data?.data ?? []
  const branches = useBranches().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const query = useSalesInvoices({
    page,
    pageSize,
    search: search.trim() || undefined,
    customerId: customerId || undefined,
    branchId: branchId || undefined,
    currencyId: currencyId || undefined,
    status: status || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const resetPage = () => setPage(1)
  const rows = query.data?.data ?? []

  return <div className="flex h-full flex-col space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-bold tracking-tight">Sales Invoices</h1><p className="mt-1 text-sm text-muted-foreground">Draft sales have no effect. Posting creates Accounts Receivable, Revenue, and Product stock/COGS where applicable.</p></div><Link to="/sales/invoices/new"><Button className="bg-[#e05d38] text-white hover:bg-[#c94f2d]"><FilePlus2 className="size-4" />New Sales Invoice</Button></Link></div>
    <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
      <Input aria-label="Search Sales Invoices" placeholder="Document number or customer" value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} />
      <Select aria-label="Customer filter" value={customerId} onChange={(event) => { setCustomerId(event.target.value); resetPage() }}><option value="">All customers</option>{customers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
      <Select aria-label="Branch filter" value={branchId} onChange={(event) => { setBranchId(event.target.value); resetPage() }}><option value="">All branches</option>{branches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
      <Select aria-label="Currency filter" value={currencyId} onChange={(event) => { setCurrencyId(event.target.value); resetPage() }}><option value="">All currencies</option>{currencies.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select>
      <Select aria-label="Status filter" value={status} onChange={(event) => { setStatus(event.target.value); resetPage() }}><option value="">All statuses</option><option value="0">Draft</option><option value="1">Posted</option></Select>
      <Input aria-label="From date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); resetPage() }} />
      <Input aria-label="To date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); resetPage() }} />
    </div>
    <DataTableShell><div className="overflow-x-auto"><Table><TableHeader><TableRow className={head}><TableHead>Document</TableHead><TableHead>Customer</TableHead><TableHead>Date</TableHead><TableHead>Branch / warehouse</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>Created by</TableHead></TableRow></TableHeader><TableBody>
      {query.isPending ? <MessageRow label="Loading Sales Invoices…" /> : query.isError ? <MessageRow label={query.error.message} error /> : rows.length === 0 ? <MessageRow label="No Sales Invoices found." /> : rows.map((invoice) => <TableRow key={invoice.id}><TableCell><Link className="font-mono font-semibold text-[#d85430]" to={`/sales/invoices/${invoice.id}`}>{invoice.documentNumber}</Link></TableCell><TableCell>{invoice.customerName ?? <span className="text-muted-foreground">Walk-in draft</span>}</TableCell><TableCell>{invoice.invoiceDate}</TableCell><TableCell><p>{invoice.branchName}</p><p className="text-xs text-muted-foreground">{invoice.warehouseName ?? 'No Product warehouse'}</p></TableCell><TableCell>{invoice.currencyCode}</TableCell><TableCell className="text-right font-mono">{formatAmount(invoice.total)} {invoice.currencyCode}</TableCell><TableCell><SalesStatusBadge status={invoice.status} /></TableCell><TableCell>{invoice.createdByUsername}</TableCell></TableRow>)}
    </TableBody></Table></div></DataTableShell>
    <DataTablePagination page={page} pageSize={pageSize} totalItems={query.data?.meta.totalCount ?? 0} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
  </div>
}

export function SalesStatusBadge({ status }: { status: SalesInvoiceStatus }) { return <span className={status === SalesInvoiceStatus.Posted ? 'rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'}>{status === SalesInvoiceStatus.Posted ? 'Posted' : 'Draft'}</span> }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} /> }
function MessageRow({ label, error = false }: { label: string; error?: boolean }) { return <TableRow><TableCell colSpan={8} className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{label}</TableCell></TableRow> }
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const head = 'border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60'
