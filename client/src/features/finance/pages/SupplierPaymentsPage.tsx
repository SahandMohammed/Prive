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
import { useCurrencies } from '@/features/business'
import {
  useFinanceSuppliers,
  useMoneyAccounts,
  useSupplierPaymentActions,
  useSupplierPayments,
} from '../hooks/useFinance'
import { FinanceDocumentStatus } from '../types/finance.types'

export function SupplierPaymentsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [moneyAccountId, setMoneyAccountId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [status, setStatus] = useState<string>('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const suppliers = useFinanceSuppliers().data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const moneyAccounts = useMoneyAccounts({ page: 1, pageSize: 100 }).data?.data ?? []

  const query = useSupplierPayments({
    page,
    pageSize,
    search: search.trim() || undefined,
    supplierId: supplierId || undefined,
    moneyAccountId: moneyAccountId || undefined,
    currencyId: currencyId || undefined,
    status: status !== '' ? Number(status) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })

  const actions = useSupplierPaymentActions()
  const rows = query.data?.data ?? []
  const resetPage = () => setPage(1)

  const handleClearFilters = () => {
    setSearch('')
    setSupplierId('')
    setMoneyAccountId('')
    setCurrencyId('')
    setStatus('')
    setFromDate('')
    setToDate('')
    resetPage()
  }

  const hasActiveFilters =
    search || supplierId || moneyAccountId || currencyId || status !== '' || fromDate || toDate

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Supplier Payments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Accounts Payable settlements. Draft payments hold allocations against supplier bills until
            posted to update the Money Ledger and General Ledger.
          </p>
        </div>
        <Link to="/finance/supplier-payments/new">
          <Button className="gap-1.5 bg-[#e05d38] font-medium text-white shadow-xs hover:bg-[#c94f2d]">
            <Plus className="size-4 stroke-[2.5]" />
            New Supplier Payment
          </Button>
        </Link>
      </div>

      {/* FILTER CONTROLS TOOLBAR */}
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Payment voucher or supplier..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              resetPage()
            }}
            className="h-9 pl-9 text-xs"
          />
        </div>

        <select
          value={supplierId}
          onChange={(e) => {
            setSupplierId(e.target.value)
            resetPage()
          }}
          className="h-9 rounded-md border border-input bg-background px-3 text-xs"
        >
          <option value="">All Suppliers</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
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

        <div className="flex items-center justify-end">
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
              <TableRow className="border-b border-slate-200 bg-[#e9ecef]/60 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <TableHead className="px-4 py-3">Voucher #</TableHead>
                <TableHead className="px-4 py-3">Date</TableHead>
                <TableHead className="px-4 py-3">Supplier</TableHead>
                <TableHead className="px-4 py-3">Money Account</TableHead>
                <TableHead className="px-4 py-3">Currency</TableHead>
                <TableHead className="px-4 py-3 text-right">Payment Amount</TableHead>
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
                    Loading supplier payments...
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
                        No supplier payments found
                      </p>
                      <p className="text-xs text-slate-400">
                        Record a new payment to settle unpaid purchase invoices.
                      </p>
                      <Link to="/finance/supplier-payments/new">
                        <Button size="xs" className="mt-1 gap-1">
                          <Plus className="size-3.5" /> Record Payment
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((payment) => (
                  <TableRow
                    key={payment.id}
                    className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                  >
                    <TableCell className="px-4 py-3.5">
                      <Link
                        className="font-mono text-xs font-bold text-[#d85430] hover:underline"
                        to={`/finance/supplier-payments/${payment.id}`}
                      >
                        {payment.documentNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                      {payment.paymentDate}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs font-medium text-slate-900 dark:text-slate-100">
                      {payment.supplierName}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs">
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                        {payment.moneyAccountCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {payment.currencyCode}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      {payment.totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 4,
                      })}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${
                          payment.status === FinanceDocumentStatus.Posted
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {payment.status === FinanceDocumentStatus.Posted ? 'Posted' : 'Draft'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-slate-500">
                      {payment.createdByUsername}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      {payment.status === FinanceDocumentStatus.Draft && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="xs"
                            className="gap-1 bg-[#e05d38] text-white hover:bg-[#c94f2d]"
                            disabled={actions.post.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Post supplier payment ${payment.documentNumber}? This will settle AP and update the Money Ledger.`
                                )
                              ) {
                                actions.post.mutate(payment.id)
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
                                  `Delete draft supplier payment ${payment.documentNumber}?`
                                )
                              ) {
                                actions.remove.mutate(payment.id)
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
