import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, ClipboardPlus, SlidersHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber } from '@/lib/i18n'
import { useStockBalances } from '../hooks/useInventory'

export function InventoryOverviewPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const [search, setSearch] = useState('')
  const query = useStockBalances({ search })
  const rows = query.data?.data ?? []

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('inventory:overview.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('inventory:overview.description')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/inventory/opening-stock/new">
            <Button variant="outline">
              <ClipboardPlus className="size-4" />
              {t('inventory:overview.openingStock')}
            </Button>
          </Link>
          <Link to="/inventory/adjustments/new">
            <Button variant="outline">
              <SlidersHorizontal className="size-4" />
              {t('inventory:overview.adjustment')}
            </Button>
          </Link>
          <Link to="/inventory/transfers/new">
            <Button>
              <ArrowRightLeft className="size-4" />
              {t('inventory:overview.transfer')}
            </Button>
          </Link>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('inventory:overview.searchPlaceholder')}
          className="h-10 w-full rounded-lg sm:w-80"
        />
        <p className="text-sm text-slate-500">
          {t('inventory:overview.balancesCount', { count: rows.length })}
        </p>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead className="px-4 text-start">{t('inventory:overview.th.product')}</TableHead>
                <TableHead className="px-4 text-start">{t('inventory:overview.th.warehouse')}</TableHead>
                <TableHead className="px-4 text-start">{t('inventory:overview.th.branch')}</TableHead>
                <TableHead className="px-4 text-end">{t('inventory:overview.th.quantity')}</TableHead>
                <TableHead className="px-4 text-end">{t('inventory:overview.th.averageCost')}</TableHead>
                <TableHead className="px-4 text-end">{t('inventory:overview.th.inventoryValue')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-sm text-slate-500">
                    {t('inventory:overview.loading')}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center text-sm text-slate-500">
                    {t('inventory:overview.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => (
                  <TableRow key={`${row.productId}-${row.warehouseId}`}>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p className="font-medium">{row.productName}</p>
                      <p className="font-mono text-xs text-slate-500">{row.sku}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      {row.warehouseCode} — {row.warehouseName}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">{row.branchName}</TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono">
                      {formatNumber(row.quantity, { maximumFractionDigits: 4 })} {row.unitCode}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono">
                      {formatNumber(row.averageCostBase, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono">
                      {formatNumber(row.totalValueBase, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
    </div>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
