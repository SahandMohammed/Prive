import { useMemo, useState } from 'react'
import {
  BookOpen,
  Calendar,
  Check,
  Copy,
  Eye,
  FilePlus2,
  Loader2,
  MoreHorizontal,
  PackageSearch,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  SearchX,
  SlidersHorizontal,
  Trash2,
  User,
  X,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { DataTableColumnHeader } from '@/components/data-table/DataTableColumnHeader'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useBranches, useCurrencies } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useDeleteActiveSalesInvoice, useSalesInvoices } from '../hooks/useSales'
import type { SalesInvoiceSummary } from '../types/sales.types'

type DatePreset = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'custom'

const DATE_PRESET_OPTIONS: { id: DatePreset; label: string }[] = [
  { id: 'all', label: 'All Dates' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'last30', label: 'Last 30 Days' },
  { id: 'thisMonth', label: 'This Month' },
  { id: 'custom', label: 'Custom Range' },
]

function computePresetDates(preset: DatePreset): { from: string; to: string } {
  const now = new Date()
  const todayStr = now.toLocaleDateString('en-CA')

  switch (preset) {
    case 'today':
      return { from: todayStr, to: todayStr }
    case 'yesterday': {
      const y = new Date(now)
      y.setDate(y.getDate() - 1)
      const yStr = y.toLocaleDateString('en-CA')
      return { from: yStr, to: yStr }
    }
    case 'last7': {
      const d = new Date(now)
      d.setDate(d.getDate() - 6)
      return { from: d.toLocaleDateString('en-CA'), to: todayStr }
    }
    case 'last30': {
      const d = new Date(now)
      d.setDate(d.getDate() - 29)
      return { from: d.toLocaleDateString('en-CA'), to: todayStr }
    }
    case 'thisMonth': {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      return { from: first.toLocaleDateString('en-CA'), to: todayStr }
    }
    default:
      return { from: '', to: '' }
  }
}

export function SalesInvoicesPage() {
  const navigate = useNavigate()
  const currentUser = useCurrentUser().data
  const canViewDeleted = hasCapability(currentUser?.role, 'deletePostedInvoice')
  const canDeletePosted = hasCapability(currentUser?.role, 'deletePostedInvoice')
  const canEditPosted = hasCapability(currentUser?.role, 'editPostedInvoice')

  // Pagination state
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Primary filters
  const [search, setSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [datePreset, setDatePreset] = useState<DatePreset>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Secondary/Advanced filters
  const [branchId, setBranchId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  // Sorting state (default: Date descending)
  const [sortBy, setSortBy] = useState<string>('date')
  const [sortDescending, setSortDescending] = useState<boolean>(true)

  // Row UI states
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<SalesInvoiceSummary | null>(null)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteError, setDeleteError] = useState('')

  const deleteMutation = useDeleteActiveSalesInvoice()

  // Master lookups
  const contactsQuery = useContacts({ page: 1, pageSize: 100, role: 0 })
  const branchesQuery = useBranches()
  const currenciesQuery = useCurrencies()

  const customers = useMemo(() => contactsQuery.data?.data ?? [], [contactsQuery.data?.data])
  const branches = useMemo(() => branchesQuery.data?.data ?? [], [branchesQuery.data?.data])
  const currencies = useMemo(() => currenciesQuery.data?.data ?? [], [currenciesQuery.data?.data])

  const query = useSalesInvoices({
    page,
    pageSize,
    search: search.trim() || undefined,
    customerId: customerId || undefined,
    branchId: branchId || undefined,
    currencyId: currencyId || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    sortBy,
    sortDescending,
  })

  const rows = query.data?.data ?? []
  const totalCount = query.data?.meta.totalCount ?? 0

  const resetPage = () => setPage(1)

  // Date preset change handler
  const handleDatePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset === 'custom') {
      setShowAdvancedFilters(true)
    } else {
      const dates = computePresetDates(preset)
      setFromDate(dates.from)
      setToDate(dates.to)
    }
    resetPage()
  }

  // Column sort toggler
  const handleSort = (columnKey: string, defaultDesc = false) => {
    if (sortBy === columnKey) {
      setSortDescending((prev) => !prev)
    } else {
      setSortBy(columnKey)
      setSortDescending(defaultDesc)
    }
    resetPage()
  }

  // Clear all filters
  const handleClearAllFilters = () => {
    setSearch('')
    setCustomerId('')
    setBranchId('')
    setCurrencyId('')
    setDatePreset('all')
    setFromDate('')
    setToDate('')
    resetPage()
  }

  // Copy document number to clipboard
  const handleCopyDocument = (id: string, docNumber: string) => {
    navigator.clipboard.writeText(docNumber).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Confirm invoice deletion
  const handleConfirmDelete = () => {
    if (!deleteTarget) return
    const reason = deleteReason.trim()
    if (!reason) {
      setDeleteError('A deletion reason is required for audit trail.')
      return
    }
    setDeleteError('')
    deleteMutation.mutate(
      {
        id: deleteTarget.id,
        reason,
        expectedUpdatedAtUtc: deleteTarget.updatedAtUtc,
      },
      {
        onSuccess: () => {
          setDeleteTarget(null)
          setDeleteReason('')
        },
        onError: (err) => {
          setDeleteError(err.message || 'Failed to delete invoice.')
        },
      }
    )
  }

  // Count active filters (for badge)
  const activeSecondaryCount = useMemo(() => {
    let count = 0
    if (branchId) count++
    if (currencyId) count++
    if (datePreset === 'custom' && (fromDate || toDate)) count++
    return count
  }, [branchId, currencyId, datePreset, fromDate, toDate])

  const hasAnyFilter = useMemo(() => {
    return Boolean(
      search.trim() ||
        customerId ||
        branchId ||
        currencyId ||
        datePreset !== 'all' ||
        fromDate ||
        toDate
    )
  }, [search, customerId, branchId, currencyId, datePreset, fromDate, toDate])

  // Get human labels for active chips
  const customerName = useMemo(() => {
    return customers.find((c) => c.id === customerId)?.name
  }, [customers, customerId])

  const branchName = useMemo(() => {
    return branches.find((b) => b.id === branchId)?.name
  }, [branches, branchId])

  const currencyCode = useMemo(() => {
    return currencies.find((c) => c.id === currencyId)?.code
  }, [currencies, currencyId])

  const datePresetLabel = useMemo(() => {
    if (datePreset === 'custom') {
      if (fromDate && toDate) return `${fromDate} to ${toDate}`
      if (fromDate) return `From ${fromDate}`
      if (toDate) return `Until ${toDate}`
      return 'Custom Range'
    }
    return DATE_PRESET_OPTIONS.find((o) => o.id === datePreset)?.label
  }, [datePreset, fromDate, toDate])

  return (
    <div className="flex min-h-full w-full flex-col pb-12">
      {/* HEADER BAR (STICKY) */}
      <header className="sticky -top-5 sm:-top-7 md:-top-8 z-20 -mt-5 sm:-mt-7 md:-mt-8 -mx-5 sm:-mx-7 md:-mx-8 px-5 sm:px-7 md:px-8 py-3.5 sm:py-4 bg-background/95 backdrop-blur-md border-b border-border/80 shadow-2xs flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Sales Invoices</h1>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {totalCount} {totalCount === 1 ? 'invoice' : 'invoices'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Saved invoices update receivables, revenue accounts, and stock movements immediately.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canViewDeleted && (
            <Link
              to="/sales/invoices-deleted"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground shadow-2xs hover:bg-muted transition-colors"
            >
              <Trash2 className="size-3.5 text-muted-foreground" />
              Deleted Invoices
            </Link>
          )}
          <Link
            to="/sales/invoices/new"
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-xs hover:bg-prive-champagne-light transition-colors"
          >
            <FilePlus2 className="size-3.5" />
            New Sales Invoice
          </Link>
        </div>
      </header>

      {/* CONTENT AREA */}
      <div className="mt-5 sm:mt-7 md:mt-8 flex flex-col gap-5">
        {/* FILTER TOOLBAR */}
        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
        {/* Tier 1: Primary Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative min-w-[240px] flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Search Sales Invoices"
              placeholder="Search document # or customer…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                resetPage()
              }}
              className="h-9 pl-9 pr-8 text-xs bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  resetPage()
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Presets */}
          <div className="relative flex items-center">
            <Calendar className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <select
              aria-label="Date preset filter"
              value={datePreset}
              onChange={(e) => handleDatePresetChange(e.target.value as DatePreset)}
              className="h-9 cursor-pointer rounded-md border border-input bg-background pl-8 pr-7 text-xs font-medium text-foreground outline-hidden transition-colors hover:bg-muted/50 focus:border-ring focus:ring-1 focus:ring-ring"
            >
              {DATE_PRESET_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Customer Filter */}
          <select
            aria-label="Customer filter"
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value)
              resetPage()
            }}
            className="h-9 max-w-[200px] cursor-pointer rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground outline-hidden transition-colors hover:bg-muted/50 focus:border-ring focus:ring-1 focus:ring-ring"
          >
            <option value="">All Customers</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* More Filters Toggle */}
          <Button
            variant={showAdvancedFilters || activeSecondaryCount > 0 ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className="h-9 gap-1.5 text-xs font-medium"
            aria-label="Toggle secondary filters"
          >
            <SlidersHorizontal className="size-3.5 text-muted-foreground" />
            <span>Filters</span>
            {activeSecondaryCount > 0 && (
              <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {activeSecondaryCount}
              </span>
            )}
          </Button>

          {/* Reset Filters Shortcut */}
          {hasAnyFilter && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="h-9 gap-1.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
            >
              <RotateCcw className="size-3.5" />
              Reset
            </Button>
          )}
        </div>

        {/* Tier 2: Expandable Secondary Filters */}
        {showAdvancedFilters && (
          <div className="mt-3 grid gap-3 border-t border-border/60 pt-3 sm:grid-cols-2 md:grid-cols-4">
            {/* Branch Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Branch
              </label>
              <select
                aria-label="Branch filter"
                value={branchId}
                onChange={(e) => {
                  setBranchId(e.target.value)
                  resetPage()
                }}
                className="h-9 cursor-pointer rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground outline-hidden transition-colors hover:bg-muted/50 focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="">All branches</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Currency Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                Currency
              </label>
              <select
                aria-label="Currency filter"
                value={currencyId}
                onChange={(e) => {
                  setCurrencyId(e.target.value)
                  resetPage()
                }}
                className="h-9 cursor-pointer rounded-md border border-input bg-background px-3 text-xs font-medium text-foreground outline-hidden transition-colors hover:bg-muted/50 focus:border-ring focus:ring-1 focus:ring-ring"
              >
                <option value="">All currencies</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date From */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                From Date
              </label>
              <Input
                type="date"
                aria-label="From date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  setDatePreset('custom')
                  resetPage()
                }}
                className="h-9 text-xs bg-background"
              />
            </div>

            {/* Custom Date To */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                To Date
              </label>
              <Input
                type="date"
                aria-label="To date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  setDatePreset('custom')
                  resetPage()
                }}
                className="h-9 text-xs bg-background"
              />
            </div>
          </div>
        )}

        {/* Tier 3: Active Filter Chips Bar */}
        {hasAnyFilter && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5">
            <span className="text-xs font-medium text-muted-foreground mr-1">Active filters:</span>

            {search.trim() && (
              <FilterChip
                label={`Search: "${search.trim()}"`}
                onRemove={() => {
                  setSearch('')
                  resetPage()
                }}
              />
            )}

            {customerId && customerName && (
              <FilterChip
                label={`Customer: ${customerName}`}
                onRemove={() => {
                  setCustomerId('')
                  resetPage()
                }}
              />
            )}

            {datePreset !== 'all' && (
              <FilterChip
                label={`Date: ${datePresetLabel}`}
                onRemove={() => {
                  setDatePreset('all')
                  setFromDate('')
                  setToDate('')
                  resetPage()
                }}
              />
            )}

            {branchId && branchName && (
              <FilterChip
                label={`Branch: ${branchName}`}
                onRemove={() => {
                  setBranchId('')
                  resetPage()
                }}
              />
            )}

            {currencyId && currencyCode && (
              <FilterChip
                label={`Currency: ${currencyCode}`}
                onRemove={() => {
                  setCurrencyId('')
                  resetPage()
                }}
              />
            )}

            <button
              type="button"
              onClick={handleClearAllFilters}
              className="text-xs font-medium text-primary hover:underline ml-1 cursor-pointer"
            >
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* DATA TABLE */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40">
                {/* Document Column */}
                <TableHead className="px-4 py-3">
                  <DataTableColumnHeader
                    title="Document"
                    canSort
                    isSorted={sortBy === 'document' ? (sortDescending ? 'desc' : 'asc') : false}
                    onSort={() => handleSort('document', false)}
                  />
                </TableHead>

                {/* Customer Column */}
                <TableHead className="px-4 py-3">
                  <DataTableColumnHeader
                    title="Customer"
                    canSort
                    isSorted={sortBy === 'customer' ? (sortDescending ? 'desc' : 'asc') : false}
                    onSort={() => handleSort('customer', false)}
                  />
                </TableHead>

                {/* Date Column (Default sort: desc) */}
                <TableHead className="px-4 py-3">
                  <DataTableColumnHeader
                    title="Date"
                    canSort
                    isSorted={sortBy === 'date' ? (sortDescending ? 'desc' : 'asc') : false}
                    onSort={() => handleSort('date', true)}
                  />
                </TableHead>

                {/* Branch / Warehouse Column */}
                <TableHead className="px-4 py-3">
                  <DataTableColumnHeader
                    title="Branch / Warehouse"
                    canSort
                    isSorted={sortBy === 'branch' ? (sortDescending ? 'desc' : 'asc') : false}
                    onSort={() => handleSort('branch', false)}
                  />
                </TableHead>

                {/* Currency Column */}
                <TableHead className="px-4 py-3">
                  <DataTableColumnHeader
                    title="Currency"
                    canSort
                    isSorted={sortBy === 'currency' ? (sortDescending ? 'desc' : 'asc') : false}
                    onSort={() => handleSort('currency', false)}
                  />
                </TableHead>

                {/* Total Column (Default sort: desc) */}
                <TableHead className="px-4 py-3 text-right">
                  <DataTableColumnHeader
                    title="Total"
                    align="right"
                    canSort
                    isSorted={sortBy === 'total' ? (sortDescending ? 'desc' : 'asc') : false}
                    onSort={() => handleSort('total', true)}
                  />
                </TableHead>

                {/* Created By Column */}
                <TableHead className="px-4 py-3">
                  <DataTableColumnHeader
                    title="Created By"
                    canSort
                    isSorted={sortBy === 'createdby' ? (sortDescending ? 'desc' : 'asc') : false}
                    onSort={() => handleSort('createdby', false)}
                  />
                </TableHead>

                {/* Action Buttons Column */}
                <TableHead className="px-4 py-3 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60">
              {query.isPending ? (
                // Skeleton loading state
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="animate-pulse">
                    <TableCell className="px-4 py-3.5">
                      <div className="h-4 w-24 rounded bg-muted/60" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="h-4 w-32 rounded bg-muted/60" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="h-4 w-20 rounded bg-muted/60" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="space-y-1">
                        <div className="h-4 w-28 rounded bg-muted/60" />
                        <div className="h-3 w-20 rounded bg-muted/40" />
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="h-4 w-12 rounded bg-muted/60" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="ml-auto h-4 w-20 rounded bg-muted/60" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <div className="h-4 w-24 rounded bg-muted/60" />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="ml-auto h-7 w-14 rounded bg-muted/60" />
                    </TableCell>
                  </TableRow>
                ))
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-40 text-center text-destructive">
                    <p className="font-medium">Failed to load sales invoices</p>
                    <p className="mt-1 text-xs text-muted-foreground">{query.error.message}</p>
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-56 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-3">
                      {hasAnyFilter ? (
                        <>
                          <div className="rounded-full bg-muted/80 p-3">
                            <SearchX className="size-6 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">No invoices match your filters</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Try clearing some filters or searching for another document number or customer.
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleClearAllFilters}
                            className="gap-1.5 text-xs"
                          >
                            <RotateCcw className="size-3.5" />
                            Clear Filters
                          </Button>
                        </>
                      ) : (
                        <>
                          <div className="rounded-full bg-primary/10 p-3 text-primary">
                            <ReceiptText className="size-6" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">No sales invoices yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Record your first sales invoice to immediately track receivables, revenue, and inventory.
                            </p>
                          </div>
                          <Link to="/sales/invoices/new">
                            <Button size="sm" className="gap-1.5 text-xs">
                              <Plus className="size-3.5" />
                              Create Sales Invoice
                            </Button>
                          </Link>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((invoice) => (
                  <TableRow
                    key={invoice.id}
                    className="group transition-colors hover:bg-muted/40 cursor-default"
                  >
                    {/* Document Number */}
                    <TableCell className="px-4 py-3.5 font-mono text-xs font-semibold">
                      <Link
                        className="text-primary hover:underline focus:underline focus:outline-none"
                        to={`/sales/invoices/${invoice.id}`}
                      >
                        {invoice.documentNumber}
                      </Link>
                    </TableCell>

                    {/* Customer */}
                    <TableCell className="px-4 py-3.5 text-xs">
                      {invoice.customerName ? (
                        <span className="font-medium text-foreground">{invoice.customerName}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground italic">
                          <User className="size-3" /> Walk-in customer
                        </span>
                      )}
                    </TableCell>

                    {/* Invoice Date */}
                    <TableCell className="px-4 py-3.5 text-xs text-muted-foreground font-mono">
                      {invoice.invoiceDate}
                    </TableCell>

                    {/* Branch / Warehouse */}
                    <TableCell className="px-4 py-3.5 text-xs">
                      <p className="font-medium text-foreground">{invoice.branchName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {invoice.warehouseName ?? 'No stock warehouse'}
                      </p>
                    </TableCell>

                    {/* Currency */}
                    <TableCell className="px-4 py-3.5 font-mono text-xs text-muted-foreground">
                      <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                        {invoice.currencyCode}
                      </Badge>
                    </TableCell>

                    {/* Total Amount */}
                    <TableCell className="px-4 py-3.5 text-right font-mono text-xs font-bold text-foreground">
                      {formatAmount(invoice.total)} {invoice.currencyCode}
                    </TableCell>

                    {/* Created By */}
                    <TableCell className="px-4 py-3.5 text-xs text-muted-foreground">
                      {invoice.createdByUsername}
                    </TableCell>

                    {/* Action Buttons Column */}
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {/* Primary View Action */}
                        <Link
                          to={`/sales/invoices/${invoice.id}`}
                          className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          aria-label={`View invoice ${invoice.documentNumber}`}
                          title="View invoice details"
                        >
                          <Eye className="size-3.5" />
                        </Link>

                        {/* Primary Edit Action (if authorized) */}
                        {canEditPosted && (
                          <Link
                            to={`/sales/invoices/${invoice.id}?edit=true`}
                            className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            aria-label={`Edit invoice ${invoice.documentNumber}`}
                            title="Edit invoice"
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                        )}

                        {/* Overflow Dropdown Actions Menu */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="text-muted-foreground hover:text-foreground"
                                aria-label={`Actions for invoice ${invoice.documentNumber}`}
                              >
                                <MoreHorizontal className="size-3.5" />
                              </Button>
                            }
                          />
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => navigate(`/sales/invoices/${invoice.id}`)}
                            >
                              <Eye />
                              <span>View details</span>
                            </DropdownMenuItem>

                            {canEditPosted && (
                              <DropdownMenuItem
                                onClick={() => navigate(`/sales/invoices/${invoice.id}?edit=true`)}
                              >
                                <Pencil />
                                <span>Edit invoice</span>
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuItem
                              onClick={() =>
                                handleCopyDocument(invoice.id, invoice.documentNumber)
                              }
                            >
                              {copiedId === invoice.id ? (
                                <Check className="text-emerald-500" />
                              ) : (
                                <Copy />
                              )}
                              <span>
                                {copiedId === invoice.id ? 'Copied to clipboard' : 'Copy Document #'}
                              </span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                navigate(
                                  `/inventory/ledger?documentNumber=${encodeURIComponent(invoice.documentNumber)}`
                                )
                              }
                            >
                              <PackageSearch />
                              <span>Stock movements</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              onClick={() =>
                                navigate(
                                  `/accounting/journal?search=${encodeURIComponent(invoice.documentNumber)}`
                                )
                              }
                            >
                              <BookOpen />
                              <span>Accounting journal</span>
                            </DropdownMenuItem>

                            {canDeletePosted && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    setDeleteTarget(invoice)
                                    setDeleteReason('')
                                    setDeleteError('')
                                  }}
                                >
                                  <Trash2 />
                                  <span>Delete invoice</span>
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
        totalItems={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
      />
      </div>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && !deleteMutation.isPending) {
            setDeleteTarget(null)
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" />
              Delete Posted Sales Invoice
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice{' '}
              <strong className="font-mono text-foreground">{deleteTarget?.documentNumber}</strong>?
              This action reverses receivable ledger entries, reverses revenue journal entries, and
              restores inventory stock movements.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <label className="text-xs font-semibold text-foreground">
              Reason for deletion <span className="text-destructive">*</span>
            </label>
            <Input
              placeholder="e.g., Invoiced duplicate or order cancelled"
              value={deleteReason}
              onChange={(e) => {
                setDeleteReason(e.target.value)
                setDeleteError('')
              }}
              className="text-xs"
              autoFocus
            />
            {deleteError && <p className="text-xs text-destructive">{deleteError}</p>}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteTarget(null)}
              disabled={deleteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
              className="gap-1.5"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Trash2 className="size-3.5" />
              )}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <Badge
      variant="secondary"
      className="gap-1 pl-2.5 pr-1 py-0.5 text-[11px] font-normal text-muted-foreground hover:text-foreground"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-0.5 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        aria-label={`Remove filter ${label}`}
      >
        <X className="size-3" />
      </button>
    </Badge>
  )
}

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
