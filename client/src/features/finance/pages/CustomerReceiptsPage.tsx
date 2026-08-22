import { useState } from 'react'
import { FilePlus2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBranches, useCurrencies } from '@/features/business'
import { FinanceDocumentStatus } from '../types/finance.types'
import { useCustomerReceipts, useFinanceCustomers, useMoneyAccounts } from '../hooks/useFinance'

export function CustomerReceiptsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [moneyAccountId, setMoneyAccountId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const customers = useFinanceCustomers().data ?? []
  const branches = useBranches().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const moneyAccounts = useMoneyAccounts({ page: 1, pageSize: 100 }).data?.data ?? []
  const query = useCustomerReceipts({
    page,
    pageSize,
    search: search.trim() || undefined,
    customerId: customerId || undefined,
    branchId: branchId || undefined,
    moneyAccountId: moneyAccountId || undefined,
    currencyId: currencyId || undefined,
    status: status || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const resetPage = () => setPage(1)
  const rows = query.data?.data ?? []

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Receipts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts have no financial effect. Posting settles Sales Invoices and creates a Money Account inflow and balanced journal.
          </p>
        </div>
        <Link to="/finance/customer-receipts/new">
          <Button><FilePlus2 className="size-4" />New Customer Receipt</Button>
        </Link>
      </div>

      <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-4">
        <Input aria-label="Search Customer Receipts" placeholder="Receipt number or customer" value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} />
        <Select aria-label="Customer filter" value={customerId} onChange={(event) => { setCustomerId(event.target.value); resetPage() }}>
          <option value="">All customers</option>
          {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
        </Select>
        <Select aria-label="Branch filter" value={branchId} onChange={(event) => { setBranchId(event.target.value); resetPage() }}>
          <option value="">All branches</option>
          {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}
        </Select>
        <Select aria-label="Money Account filter" value={moneyAccountId} onChange={(event) => { setMoneyAccountId(event.target.value); resetPage() }}>
          <option value="">All Money Accounts</option>
          {moneyAccounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}
        </Select>
        <Select aria-label="Currency filter" value={currencyId} onChange={(event) => { setCurrencyId(event.target.value); resetPage() }}>
          <option value="">All currencies</option>
          {currencies.map((currency) => <option key={currency.id} value={currency.id}>{currency.code}</option>)}
        </Select>
        <Select aria-label="Status filter" value={status} onChange={(event) => { setStatus(event.target.value); resetPage() }}>
          <option value="">All statuses</option>
          <option value="0">Draft</option>
          <option value="1">Posted</option>
        </Select>
        <Input aria-label="From date" type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); resetPage() }} />
        <Input aria-label="To date" type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); resetPage() }} />
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className={head}><TableHead>Receipt</TableHead><TableHead>Date</TableHead><TableHead>Customer</TableHead><TableHead>Money Account</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Amount</TableHead><TableHead>Status</TableHead><TableHead>Created by</TableHead></TableRow></TableHeader>
            <TableBody>
              {query.isPending ? <MessageRow label="Loading Customer Receipts…" /> : query.isError ? <MessageRow label={query.error.message} error /> : rows.length === 0 ? <MessageRow label="No Customer Receipts found." /> : rows.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell><Link className="font-mono font-semibold text-[#d85430]" to={`/finance/customer-receipts/${receipt.id}`}>{receipt.documentNumber}</Link></TableCell>
                  <TableCell>{receipt.receiptDate}</TableCell>
                  <TableCell>{receipt.customerName}</TableCell>
                  <TableCell><p className="font-mono">{receipt.moneyAccountCode}</p><p className="text-xs text-muted-foreground">{receipt.moneyAccountName}</p></TableCell>
                  <TableCell>{receipt.currencyCode}</TableCell>
                  <TableCell className="text-right font-mono">{formatAmount(receipt.totalAmount)}</TableCell>
                  <TableCell><ReceiptStatus status={receipt.status} /></TableCell>
                  <TableCell>{receipt.createdByUsername}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
      <DataTablePagination page={page} pageSize={pageSize} totalItems={query.data?.meta.totalCount ?? 0} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
    </div>
  )
}

export function ReceiptStatus({ status }: { status: FinanceDocumentStatus }) {
  return <span className={status === FinanceDocumentStatus.Posted ? 'rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700' : 'rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'}>{status === FinanceDocumentStatus.Posted ? 'Posted' : 'Draft'}</span>
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} /> }
function MessageRow({ label, error = false }: { label: string; error?: boolean }) { return <TableRow><TableCell colSpan={8} className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{label}</TableCell></TableRow> }
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const head = 'border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60'
