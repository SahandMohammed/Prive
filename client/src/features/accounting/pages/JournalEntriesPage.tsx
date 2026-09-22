import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { 
  AlertCircle, 
  BookOpen, 
  FilePlus, 
  Plus, 
  RotateCcw, 
  Search, 
  Send, 
  SlidersHorizontal, 
  Trash2, 
  Pencil 
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBranches } from '@/features/business'
import { useJournalActions, useJournals } from '../hooks/useAccounting'
import { journalStatusLabels } from '../types/accounting.types'

export function JournalEntriesPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') ?? '')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const branchesQuery = useBranches()
  const branches = branchesQuery.data?.data ?? []

  const queryParams = useMemo(() => ({
    page,
    pageSize,
    search: search.trim() || undefined,
    status: statusFilter !== 'all' ? Number(statusFilter) : undefined,
    type: typeFilter !== 'all' ? Number(typeFilter) : undefined,
    branchId: branchFilter !== 'all' ? branchFilter : undefined,
  }), [page, pageSize, search, statusFilter, typeFilter, branchFilter])

  const journalsQuery = useJournals(queryParams)
  const actions = useJournalActions()

  const journals = journalsQuery.data?.data ?? []
  const totalCount = journalsQuery.data?.meta?.totalCount ?? journals.length

  const handleClearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setTypeFilter('all')
    setBranchFilter('all')
    setPage(1)
  }

  const hasActiveFilters = search || statusFilter !== 'all' || typeFilter !== 'all' || branchFilter !== 'all'

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Journal Entries
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Double-entry general ledger containing all financial vouchers and posted accounting transactions.
          </p>
        </div>
        <Link to="/accounting/journal/new">
          <Button className="gap-1.5 bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90">
            <Plus className="h-4 w-4 stroke-[2.5]" />
            Create Journal Entry
          </Button>
        </Link>
      </div>

      {/* FILTER CONTROLS & TOOLBAR */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search reference or description"
              className="h-10 rounded-lg border-slate-200 bg-white pl-9 text-sm shadow-xs dark:border-slate-800 dark:bg-slate-900"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="0">Draft</option>
            <option value="1">Posted</option>
            <option value="2">Reversed</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">All Types</option>
            <option value="0">Standard</option>
            <option value="1">Opening Balance</option>
          </select>

          <select
            value={branchFilter}
            onChange={(e) => { setBranchFilter(e.target.value); setPage(1) }}
            className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-xs shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
          >
            <option value="all">Current branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>

          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              className="h-10 gap-1.5 text-xs text-slate-600 dark:text-slate-300"
              onClick={handleClearFilters}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Clear Filters
            </Button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {totalCount} {totalCount === 1 ? 'entry' : 'entries'} found
        </p>
      </div>

      {/* DATA TABLE */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead className="w-32 px-4 font-semibold text-slate-600 dark:text-slate-300">Date</TableHead>
                <TableHead className="w-36 px-4 font-semibold text-slate-600 dark:text-slate-300">Reference</TableHead>
                <TableHead className="min-w-64 px-4 font-semibold text-slate-600 dark:text-slate-300">Description / Memo</TableHead>
                <TableHead className="w-32 px-4 font-semibold text-slate-600 dark:text-slate-300">Branch</TableHead>
                <TableHead className="w-28 px-4 font-semibold text-slate-600 dark:text-slate-300">Type</TableHead>
                <TableHead className="w-28 px-4 font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="w-36 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">Debit (Base)</TableHead>
                <TableHead className="w-36 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">Credit (Base)</TableHead>
                <TableHead className="w-28 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {journalsQuery.isPending && <LoadingRow />}
              {journalsQuery.isError && !journalsQuery.isPending && <ErrorRow />}
              {!journalsQuery.isPending && !journalsQuery.isError && journals.length === 0 && (
                <EmptyRow />
              )}
              {!journalsQuery.isPending && !journalsQuery.isError && journals.map((journal) => {
                const statusBadge = getStatusBadge(journal.status)
                const sourceOwned = Boolean(journal.sourcePurchaseInvoiceId || journal.sourceSalesInvoiceId || journal.sourceMoneyTransferId || journal.sourceSupplierPaymentId || journal.sourceCustomerReceiptId || journal.sourcePosSaleId || journal.sourcePosRefundId || journal.sourcePosDrawerMovementId)
                return (
                  <TableRow key={journal.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <TableCell className="px-4 py-3.5 text-xs text-slate-700 dark:text-slate-300">
                      {journal.entryDate}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                      {journal.sourcePurchaseInvoiceId ? <Link className="text-primary" to={`/purchases/invoices/${journal.sourcePurchaseInvoiceId}`}>{journal.reference || 'Purchase'}</Link> : journal.sourcePosRefundId ? <Link className="text-primary" to={`/pos/refunds/${journal.sourcePosRefundId}`}>{journal.reference || 'POS Refund'}</Link> : journal.sourcePosSaleId ? <Link className="text-primary" to={`/pos/sales/${journal.sourcePosSaleId}`}>{journal.reference || 'POS Sale'}</Link> : journal.sourcePosDrawerMovementId ? <Link className="text-primary" to="/pos/sessions">{journal.reference || 'Drawer movement'}</Link> : journal.sourceSalesInvoiceId ? <Link className="text-primary" to={`/sales/invoices/${journal.sourceSalesInvoiceId}`}>{journal.reference || 'Sale'}</Link> : journal.sourceCustomerReceiptId ? <Link className="text-primary" to={`/finance/customer-receipts/${journal.sourceCustomerReceiptId}`}>{journal.reference || 'Receipt'}</Link> : journal.reference || '—'}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="max-w-md truncate font-medium text-slate-800 dark:text-slate-200">
                        {journal.description}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {journal.lines.length} {journal.lines.length === 1 ? 'line' : 'lines'}
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                      {journal.branchCode}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {journal.type === 1 ? 'Opening' : 'Standard'}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${statusBadge.className}`}>
                        {statusBadge.label}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {journal.totalDebitBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {journal.totalCreditBaseAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {journal.status === 0 && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit draft"
                              onClick={() => navigate(`/accounting/journal/new?id=${journal.id}`)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-emerald-600 hover:text-emerald-700"
                              title="Post journal"
                              disabled={actions.post.isPending || journal.totalDebitBaseAmount !== journal.totalCreditBaseAmount}
                              onClick={() => actions.post.mutate(journal.id)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-slate-400 hover:text-red-600"
                              title="Delete draft"
                              disabled={actions.remove.isPending}
                              onClick={() => {
                                if (window.confirm('Delete this draft journal?')) actions.remove.mutate(journal.id)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {journal.status === 1 && !sourceOwned && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-amber-600 hover:text-amber-700"
                            title="Reverse journal"
                            disabled={actions.reverse.isPending}
                            onClick={() => {
                              if (window.confirm('Create an equal and opposite reversal journal?')) {
                                actions.reverse.mutate(journal.id)
                              }
                            }}
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                        {journal.status === 1 && sourceOwned && (
                          <span className="text-[11px] font-medium text-slate-500" title="Correct this journal through its source document">
                            Source-owned
                          </span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      {/* PAGINATION */}
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />
    </div>
  )
}

function getStatusBadge(status: number) {
  switch (status) {
    case 0:
      return { label: 'Draft', className: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' }
    case 1:
      return { label: 'Posted', className: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' }
    case 2:
      return { label: 'Reversed', className: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' }
    default:
      return { label: journalStatusLabels[status] ?? 'Unknown', className: 'bg-slate-100 text-slate-700' }
  }
}

function LoadingRow() {
  return (
    <TableRow>
      <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
        Loading journal entries...
      </TableCell>
    </TableRow>
  )
}

function ErrorRow() {
  return (
    <TableRow>
      <TableCell colSpan={9} className="h-48 text-center">
        <div className="flex flex-col items-center text-red-500">
          <AlertCircle className="mb-2 h-8 w-8" />
          <p className="text-sm font-medium">Failed to load journal entries</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EmptyRow() {
  return (
    <TableRow>
      <TableCell colSpan={9} className="h-56 text-center">
        <div className="flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
            <BookOpen className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">No journal entries found</p>
            <p className="mt-1 text-sm text-slate-500">
              Create your first double-entry journal or adjust your filters.
            </p>
          </div>
          <Link to="/accounting/journal/new">
            <Button size="sm" className="bg-primarytext-primary-foregroundhover:bg-primary/90">
              <FilePlus className="h-4 w-4" /> Create Journal Entry
            </Button>
          </Link>
        </div>
      </TableCell>
    </TableRow>
  )
}
