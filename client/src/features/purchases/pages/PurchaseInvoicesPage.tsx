import { useState } from 'react'
import { FilePlus2, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBranches, useCurrencies } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useWarehouses } from '@/features/inventory'
import { formatNumber } from '@/lib/i18n'
import { usePurchaseInvoices } from '../hooks/usePurchases'
import { PurchaseInvoiceStatus } from '../types/purchase.types'

export function PurchaseInvoicesPage() {
  const { t } = useTranslation(['purchases', 'common'])
  const [search, setSearch] = useState('')
  const [supplierId, setSupplierId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [branchId, setBranchId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const query = usePurchaseInvoices({ page, pageSize, search: search.trim() || undefined, supplierId: supplierId || undefined, fromDate: fromDate || undefined, toDate: toDate || undefined, branchId: branchId || undefined, warehouseId: warehouseId || undefined, currencyId: currencyId || undefined, status: status || undefined })
  const suppliers = useContacts({ page: 1, pageSize: 100, role: 1, isActive: true }).data?.data ?? []
  const branches = useBranches().data?.data ?? []
  const warehouses = useWarehouses().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const rows = query.data?.data ?? []
  const resetPage = () => setPage(1)

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('purchases:invoices.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('purchases:invoices.subtitle')}</p>
        </div>
        <Link to="/purchases/invoices/new">
          <Button>
            <FilePlus2 className="size-4" />
            {t('purchases:invoices.newInvoice')}
          </Button>
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="ps-9"
            value={search}
            onChange={(event) => { setSearch(event.target.value); resetPage() }}
            placeholder={t('purchases:invoices.searchPlaceholder')}
          />
        </div>
        <Select value={supplierId} onChange={(event) => { setSupplierId(event.target.value); resetPage() }}>
          <option value="">{t('purchases:invoices.allSuppliers')}</option>
          {suppliers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </Select>
        <Select value={branchId} onChange={(event) => { setBranchId(event.target.value); setWarehouseId(''); resetPage() }}>
          <option value="">{t('purchases:invoices.currentBranch')}</option>
          {branches.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
        </Select>
        <Select value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); resetPage() }}>
          <option value="">{t('purchases:invoices.allWarehouses')}</option>
          {warehouses.filter((item) => !branchId || item.branchId === branchId).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
        </Select>
        <Select value={currencyId} onChange={(event) => { setCurrencyId(event.target.value); resetPage() }}>
          <option value="">{t('purchases:invoices.allCurrencies')}</option>
          {currencies.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}
        </Select>
        <Select value={status} onChange={(event) => { setStatus(event.target.value); resetPage() }}>
          <option value="">{t('purchases:invoices.allStatuses')}</option>
          <option value="0">{t('purchases:invoices.draftStatus')}</option>
          <option value="1">{t('purchases:invoices.postedStatus')}</option>
        </Select>
        <Input aria-label={t('purchases:invoices.fromDateAria')} type="date" value={fromDate} onChange={(event) => { setFromDate(event.target.value); resetPage() }} />
        <Input aria-label={t('purchases:invoices.toDateAria')} type="date" value={toDate} onChange={(event) => { setToDate(event.target.value); resetPage() }} />
      </div>
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead>{t('purchases:invoices.table.document')}</TableHead>
                <TableHead>{t('purchases:invoices.table.supplierRef')}</TableHead>
                <TableHead>{t('purchases:invoices.table.date')}</TableHead>
                <TableHead>{t('purchases:invoices.table.branchWarehouse')}</TableHead>
                <TableHead>{t('purchases:invoices.table.currency')}</TableHead>
                <TableHead className="text-end">{t('purchases:invoices.table.total')}</TableHead>
                <TableHead>{t('purchases:invoices.table.status')}</TableHead>
                <TableHead>{t('purchases:invoices.table.createdBy')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <MessageRow label={t('purchases:invoices.table.loading')} />
              ) : query.isError ? (
                <MessageRow label={query.error.message} error />
              ) : rows.length === 0 ? (
                <MessageRow label={t('purchases:invoices.table.noInvoices')} />
              ) : (
                rows.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <Link className="font-mono font-semibold text-primary" to={`/purchases/invoices/${invoice.id}`}>
                        {invoice.documentNumber}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{invoice.supplierName}</p>
                      <p className="text-xs text-muted-foreground">{invoice.supplierReference ?? t('purchases:invoices.table.noSupplierRef')}</p>
                    </TableCell>
                    <TableCell>{invoice.invoiceDate}</TableCell>
                    <TableCell>
                      <p>{invoice.branchName}</p>
                      <p className="text-xs text-muted-foreground">{invoice.warehouseName}</p>
                    </TableCell>
                    <TableCell>{invoice.currencyCode}</TableCell>
                    <TableCell className="text-end font-mono">
                      {formatNumber(invoice.total, { maximumFractionDigits: 4 })} {invoice.currencyCode}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell>{invoice.createdByUsername}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={query.data?.meta.totalCount ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(value) => { setPageSize(value); setPage(1) }}
      />
    </div>
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} />
}

function MessageRow({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={8} className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
        {label}
      </TableCell>
    </TableRow>
  )
}

export function StatusBadge({ status }: { status: PurchaseInvoiceStatus }) {
  const { t } = useTranslation(['purchases'])
  return (
    <span
      className={
        status === PurchaseInvoiceStatus.Posted
          ? 'rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700'
          : 'rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700'
      }
    >
      {status === PurchaseInvoiceStatus.Posted ? t('purchases:status.posted') : t('purchases:status.draft')}
    </span>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
