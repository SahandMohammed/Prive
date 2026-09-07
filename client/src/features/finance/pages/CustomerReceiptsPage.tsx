import { useState } from 'react'
import { Landmark, Loader2, Plus, RotateCcw, Search, Send, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBranches, useCurrencies } from '@/features/business'
import {
  useCustomerReceiptActions,
  useCustomerReceipts,
  useFinanceCustomers,
  useMoneyAccounts,
} from '../hooks/useFinance'
import { FinanceDocumentStatus } from '../types/finance.types'

export function CustomerReceiptsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [moneyAccountId, setMoneyAccountId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [status, setStatus] = useState<string>('')
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
    status: status !== '' ? Number(status) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })

  const actions = useCustomerReceiptActions()
  const rows = query.data?.data ?? []
  const resetPage = () => setPage(1)

  const handleClearFilters = () => {
    setSearch('')
    setCustomerId('')
    setBranchId('')
    setMoneyAccountId('')
    setCurrencyId('')
    setStatus('')
    setFromDate('')
    setToDate('')
    resetPage()
  }

  const hasActiveFilters =
    search ||
    customerId ||
    branchId ||
    moneyAccountId ||
    currencyId ||
    status !== '' ||
    fromDate ||
    toDate

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Customer Receipts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Accounts Receivable settlements. Draft receipts hold allocations against customer sales
            invoices until posted to create Money Account inflows and General Ledger entries.
          </p>
        </div>
        <Link to="/finance/customer-receipts/new">
          <Button className="gap-1.5 bg-primary font-medium text-white shadow-xs hover:bg-primary/90">
            <Plus className="size-4 stroke-[2.5]" />
            New Customer Receipt
          </Button>
        </Link>
      </div>

      {/* FILTER CONTROLS TOOLBAR */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Receipt # or customer..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              resetPage()
            }}
            className="h-9 pl-9 text-xs"
          />
        </div>

        <select
          value={customerId}
          onChange={(e) => {
            setCustomerId(e.target.value)
            resetPage()
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Customers</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value)
            resetPage()
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">Current branch</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={moneyAccountId}
          onChange={(e) => {
            setMoneyAccountId(e.target.value)
            resetPage()
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Money Accounts</option>
          {moneyAccounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} — {account.name}
            </option>
          ))}
        </select>

        <select
          value={currencyId}
          onChange={(e) => {
            setCurrencyId(e.target.value)
            resetPage()
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Currencies</option>
          {currencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code}
            </option>
          ))}
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            resetPage()
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Statuses</option>
          <option value="0">Draft</option>
          <option value="1">Posted</option>
        </select>

        <Input
          type="date"
          aria-label="From Date"
          value={fromDate}
          onChange={(e) => {
            setFromDate(e.target.value)
            resetPage()
          }}
          className="h-9 text-xs"
        />

        <Input
          type="date"
          aria-label="To Date"
          value={toDate}
          onChange={(e) => {
            setToDate(e.target.value)
            resetPage()
          }}
          className="h-9 text-xs"
        />

        <div className="flex items-center justify-end md:col-span-4">
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 text-xs text-slate-600"
              onClick={handleClearFilters}
            >
              <RotateCcw className="size-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <TableHead className="px-4 py-3">Receipt #</TableHead>
                <TableHead className="px-4 py-3">Date</TableHead>
                <TableHead className="px-4 py-3">Customer</TableHead>
                <TableHead className="px-4 py-3">Money Account</TableHead>
                <TableHead className="px-4 py-3">Currency</TableHead>
                <TableHead className="px-4 py-3 text-right">Receipt Amount</TableHead>
                <TableHead className="px-4 py-3">Status</TableHead>
                <TableHead className="px-4 py-3">Created By</TableHead>
                <TableHead className="px-4 py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {query.isPending ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    <Loader2 className="mx-auto mb-2 size-6 animate-spin text-primary" />
                    Loading customer receipts...
                  </TableCell>
                </TableRow>
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-rose-500">
                    {query.error.message}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Landmark className="size-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        No customer receipts found
                      </p>
                      <p className="text-xs text-slate-400">
                        Record a new receipt to settle customer sales invoices.
                      </p>
                      <Link to="/finance/customer-receipts/new">
                        <Button size="xs" className="mt-1 gap-1">
                          <Plus className="size-3.5" /> Record Receipt
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((receipt) => (
                  <TableRow
                    key={receipt.id}
                    className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                  >
                    <TableCell className="px-4 py-3.5">
                      <Link
                        className="font-mono text-xs font-bold text-primary hover:underline"
                        to={`/finance/customer-receipts/${receipt.id}`}
                      >
                        {receipt.documentNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                      {receipt.receiptDate}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                      {receipt.customerName}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {receipt.moneyAccountCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {receipt.currencyCode}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {receipt.totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <ReceiptStatus status={receipt.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-slate-500">
                      {receipt.createdByUsername}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      {receipt.status === FinanceDocumentStatus.Draft && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="xs"
                            className="gap-1 bg-primarytext-primary-foregroundhover:bg-primary/90"
                            disabled={actions.post.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Post customer receipt ${receipt.documentNumber}? This will settle AR and deposit funds into ${receipt.moneyAccountCode}.`
                                )
                              ) {
                                actions.post.mutate(receipt.id)
                              }
                            }}
                          >
                            <Send className="size-3" /> Post
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            className="text-red-600 hover:bg-red-50 hover:border-red-200"
                            disabled={actions.remove.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete draft customer receipt ${receipt.documentNumber}?`
                                )
                              ) {
                                actions.remove.mutate(receipt.id)
                              }
                            }}
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      {/* PAGINATION */}
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={query.data?.meta.totalCount ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
    </div>
  )
}

export function ReceiptStatus({ status }: { status: FinanceDocumentStatus }) {
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${
        status === FinanceDocumentStatus.Posted
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      }`}
    >
      {status === FinanceDocumentStatus.Posted ? 'Posted' : 'Draft'}
    </span>
  )
}
