import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatNumber } from '@/lib/i18n'
import { useAdjustments, useOpeningStocks, useTransfers } from '../hooks/useInventory'
import { InventoryDocumentStatus } from '../types/inventory.types'

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
const filters = (search: string, status: string, fromDate: string, toDate: string) => ({
  documentNumber: search || undefined,
  status: status || undefined,
  fromDate: fromDate || undefined,
  toDate: toDate || undefined,
})

function Status({ value }: { value: InventoryDocumentStatus }) {
  const { t } = useTranslation('inventory')
  const posted = value === InventoryDocumentStatus.Posted
  return (
    <span className={posted ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700' : 'inline-flex rounded bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700'}>
      {posted ? t('inventory:documents.posted') : t('inventory:documents.draft')}
    </span>
  )
}

function ListHeader({ title, description, newTo, newLabel }: { title: string; description: string; newTo: string; newLabel: string }) {
  return (
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Link to={newTo}>
        <Button>
          <Plus className="size-4" />
          {newLabel}
        </Button>
      </Link>
    </div>
  )
}

function Filters({
  search,
  setSearch,
  status,
  setStatus,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
}: {
  search: string
  setSearch: (v: string) => void
  status: string
  setStatus: (v: string) => void
  fromDate: string
  setFromDate: (v: string) => void
  toDate: string
  setToDate: (v: string) => void
}) {
  const { t } = useTranslation('inventory')
  return (
    <div className="grid gap-3 md:grid-cols-[minmax(220px,1fr)_160px_160px_160px]">
      <div className="relative">
        <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="ps-9" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t('inventory:documents.documentNumber')} />
      </div>
      <select className="h-9 rounded-md border bg-background px-3 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="">{t('inventory:documents.allStatuses')}</option>
        <option value="0">{t('inventory:documents.draft')}</option>
        <option value="1">{t('inventory:documents.posted')}</option>
      </select>
      <Input type="date" aria-label={t('inventory:documents.fromDate')} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
      <Input type="date" aria-label={t('inventory:documents.toDate')} value={toDate} onChange={(e) => setToDate(e.target.value)} />
    </div>
  )
}

function useFilters() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  return { search, setSearch, status, setStatus, fromDate, setFromDate, toDate, setToDate, query: filters(search, status, fromDate, toDate) }
}

export function OpeningStockListPage() {
  const { t } = useTranslation('inventory')
  const f = useFilters()
  const query = useOpeningStocks(f.query)
  const rows = query.data?.data ?? []

  return (
    <div className="flex h-full flex-col space-y-6">
      <ListHeader
        title={t('inventory:documents.openingStock.listTitle')}
        description={t('inventory:documents.openingStock.listDescription')}
        newTo="/inventory/opening-stock/new"
        newLabel={t('inventory:documents.openingStock.newButton')}
      />
      <Filters {...f} />
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className={head}>
              <TableHead className="text-start">{t('inventory:documents.th.document')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.date')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.branch')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.warehouse')}</TableHead>
              <TableHead className="text-end">{t('inventory:documents.th.lines')}</TableHead>
              <TableHead className="text-end">{t('inventory:documents.th.totalValue')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.status')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.createdBy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <Loading span={8} />
            ) : rows.length === 0 ? (
              <Empty span={8} />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} className="cursor-pointer">
                  <TableCell className="text-start">
                    <Link className="font-mono font-semibold text-primary" to={`/inventory/opening-stock/${row.id}`}>
                      {row.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-start">{formatDate(row.documentDate)}</TableCell>
                  <TableCell className="text-start">{row.branchName}</TableCell>
                  <TableCell className="text-start">{row.warehouseName}</TableCell>
                  <TableCell className="text-end font-mono">{formatNumber(row.lineCount)}</TableCell>
                  <TableCell className="text-end font-mono">{formatNumber(row.totalValueBase, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</TableCell>
                  <TableCell className="text-start"><Status value={row.status} /></TableCell>
                  <TableCell className="text-start">{row.createdByUsername}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  )
}

export function AdjustmentsListPage() {
  const { t } = useTranslation('inventory')
  const f = useFilters()
  const query = useAdjustments(f.query)
  const rows = query.data?.data ?? []

  return (
    <div className="flex h-full flex-col space-y-6">
      <ListHeader
        title={t('inventory:documents.adjustments.listTitle')}
        description={t('inventory:documents.adjustments.listDescription')}
        newTo="/inventory/adjustments/new"
        newLabel={t('inventory:documents.adjustments.newButton')}
      />
      <Filters {...f} />
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className={head}>
              <TableHead className="text-start">{t('inventory:documents.th.document')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.date')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.branch')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.warehouse')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.reason')}</TableHead>
              <TableHead className="text-end">{t('inventory:documents.th.lines')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.status')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.createdBy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <Loading span={8} />
            ) : rows.length === 0 ? (
              <Empty span={8} />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-start">
                    <Link className="font-mono font-semibold text-primary" to={`/inventory/adjustments/${row.id}`}>
                      {row.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-start">{formatDate(row.documentDate)}</TableCell>
                  <TableCell className="text-start">{row.branchName}</TableCell>
                  <TableCell className="text-start">{row.warehouseName}</TableCell>
                  <TableCell className="text-start">{row.reason}</TableCell>
                  <TableCell className="text-end font-mono">{formatNumber(row.lineCount)}</TableCell>
                  <TableCell className="text-start"><Status value={row.status} /></TableCell>
                  <TableCell className="text-start">{row.createdByUsername}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  )
}

export function TransfersListPage() {
  const { t } = useTranslation('inventory')
  const f = useFilters()
  const query = useTransfers(f.query)
  const rows = query.data?.data ?? []

  return (
    <div className="flex h-full flex-col space-y-6">
      <ListHeader
        title={t('inventory:documents.transfers.listTitle')}
        description={t('inventory:documents.transfers.listDescription')}
        newTo="/inventory/transfers/new"
        newLabel={t('inventory:documents.transfers.newButton')}
      />
      <Filters {...f} />
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className={head}>
              <TableHead className="text-start">{t('inventory:documents.th.document')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.date')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.branch')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.source')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.destination')}</TableHead>
              <TableHead className="text-end">{t('inventory:documents.th.lines')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.status')}</TableHead>
              <TableHead className="text-start">{t('inventory:documents.th.createdBy')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {query.isPending ? (
              <Loading span={8} />
            ) : rows.length === 0 ? (
              <Empty span={8} />
            ) : (
              rows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="text-start">
                    <Link className="font-mono font-semibold text-primary" to={`/inventory/transfers/${row.id}`}>
                      {row.documentNumber}
                    </Link>
                  </TableCell>
                  <TableCell className="text-start">{formatDate(row.documentDate)}</TableCell>
                  <TableCell className="text-start">{row.branchName}</TableCell>
                  <TableCell className="text-start">{row.sourceWarehouseName}</TableCell>
                  <TableCell className="text-start">{row.destinationWarehouseName}</TableCell>
                  <TableCell className="text-end font-mono">{formatNumber(row.lineCount)}</TableCell>
                  <TableCell className="text-start"><Status value={row.status} /></TableCell>
                  <TableCell className="text-start">{row.createdByUsername}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>
    </div>
  )
}

function Loading({ span }: { span: number }) {
  const { t } = useTranslation('inventory')
  return (
    <TableRow>
      <TableCell colSpan={span} className="h-40 text-center text-muted-foreground">
        {t('inventory:documents.loading')}
      </TableCell>
    </TableRow>
  )
}

function Empty({ span }: { span: number }) {
  const { t } = useTranslation('inventory')
  return (
    <TableRow>
      <TableCell colSpan={span} className="h-40 text-center text-muted-foreground">
        {t('inventory:documents.empty')}
      </TableCell>
    </TableRow>
  )
}
