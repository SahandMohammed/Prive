import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatDate, formatNumber } from '@/lib/i18n'
import { useMovements, useProducts, useWarehouses } from '../hooks/useInventory'
import { InventoryDocumentType } from '../types/inventory.types'

export function MovementHistoryPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const [searchParams] = useSearchParams()
  const [documentNumber, setDocumentNumber] = useState(searchParams.get('documentNumber') ?? '')
  const [documentType, setDocumentType] = useState('')
  const [movementType, setMovementType] = useState('')
  const [productId, setProductId] = useState('')
  const [warehouseId, setWarehouseId] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const query = useMovements({
    documentNumber: documentNumber || undefined,
    documentType: documentType || undefined,
    type: movementType || undefined,
    productId: productId || undefined,
    warehouseId: warehouseId || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })
  const products = useProducts().data?.data ?? []
  const warehouses = useWarehouses().data?.data ?? []
  const rows = query.data?.data ?? []

  const movementNames: Record<number, string> = {
    0: t('inventory:ledger.movementNames.openingStock'),
    1: t('inventory:ledger.movementNames.positiveAdjustment'),
    2: t('inventory:ledger.movementNames.negativeAdjustment'),
    3: t('inventory:ledger.movementNames.transferOut'),
    4: t('inventory:ledger.movementNames.transferIn'),
    5: t('inventory:ledger.movementNames.purchaseReceipt'),
    6: t('inventory:ledger.movementNames.saleIssue'),
    7: t('inventory:ledger.movementNames.saleReturn'),
  }

  const documentNames: Record<number, string> = {
    0: t('inventory:ledger.documentNames.openingStock'),
    1: t('inventory:ledger.documentNames.adjustment'),
    2: t('inventory:ledger.documentNames.transfer'),
    3: t('inventory:ledger.documentNames.purchaseInvoice'),
    4: t('inventory:ledger.documentNames.salesInvoice'),
    5: t('inventory:ledger.documentNames.posSale'),
    6: t('inventory:ledger.documentNames.posRefund'),
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('inventory:ledger.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('inventory:ledger.description')}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={documentNumber}
            onChange={(e) => setDocumentNumber(e.target.value)}
            placeholder={t('inventory:ledger.documentNumberPlaceholder')}
            className="ps-9"
          />
        </div>
        <Select value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
          <option value="">{t('inventory:ledger.allDocumentTypes')}</option>
          {Object.entries(documentNames).map(([value, name]) => (
            <option key={value} value={value}>{name}</option>
          ))}
        </Select>
        <Select value={movementType} onChange={(e) => setMovementType(e.target.value)}>
          <option value="">{t('inventory:ledger.allMovementTypes')}</option>
          {Object.entries(movementNames).map(([value, name]) => (
            <option key={value} value={value}>{name}</option>
          ))}
        </Select>
        <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
          <option value="">{t('inventory:ledger.allProducts')}</option>
          {products.map((x) => <option key={x.id} value={x.id}>{x.sku} — {x.name}</option>)}
        </Select>
        <Select value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)}>
          <option value="">{t('inventory:ledger.allWarehouses')}</option>
          {warehouses.map((x) => <option key={x.id} value={x.id}>{x.code} — {x.name}</option>)}
        </Select>
        <Input type="date" aria-label={t('inventory:ledger.fromDate')} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        <Input type="date" aria-label={t('inventory:ledger.toDate')} value={toDate} onChange={(e) => setToDate(e.target.value)} />
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead className="text-start">{t('inventory:ledger.th.date')}</TableHead>
                <TableHead className="text-start">{t('inventory:ledger.th.document')}</TableHead>
                <TableHead className="text-start">{t('inventory:ledger.th.product')}</TableHead>
                <TableHead className="text-start">{t('inventory:ledger.th.warehouseBranch')}</TableHead>
                <TableHead className="text-start">{t('inventory:ledger.th.movement')}</TableHead>
                <TableHead className="text-end">{t('inventory:ledger.th.in')}</TableHead>
                <TableHead className="text-end">{t('inventory:ledger.th.out')}</TableHead>
                <TableHead className="text-end">{t('inventory:ledger.th.unitCost')}</TableHead>
                <TableHead className="text-start">{t('inventory:ledger.th.userReason')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                    {t('inventory:ledger.loading')}
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-40 text-center text-muted-foreground">
                    {t('inventory:ledger.empty')}
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-start">{formatDate(item.movementDate)}</TableCell>
                    <TableCell className="text-start">
                      {item.sourceDocumentId !== null && item.sourceDocumentType !== null ? (
                        <Link className="font-mono font-semibold text-primary" to={documentPath(item.sourceDocumentType, item.sourceDocumentId)}>
                          {item.documentNumber}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{t('inventory:ledger.historical')}</span>
                      )}
                    </TableCell>
                    <TableCell className="text-start">
                      <p className="font-medium">{item.productName}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.sku} · {item.unitCode}</p>
                    </TableCell>
                    <TableCell className="text-start">
                      <p>{item.warehouseCode} — {item.warehouseName}</p>
                      <p className="text-xs text-muted-foreground">{item.branchName}</p>
                    </TableCell>
                    <TableCell className="text-start">{movementNames[item.type] ?? item.type}</TableCell>
                    <TableCell className="text-end font-mono text-emerald-700">
                      {item.quantityIn ? formatNumber(item.quantityIn, { maximumFractionDigits: 4 }) : '—'}
                    </TableCell>
                    <TableCell className="text-end font-mono text-red-700">
                      {item.quantityOut ? formatNumber(item.quantityOut, { maximumFractionDigits: 4 }) : '—'}
                    </TableCell>
                    <TableCell className="text-end font-mono">
                      {formatNumber(item.unitCostBase, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
                    </TableCell>
                    <TableCell className="text-start">
                      <p>{item.performedByUsername}</p>
                      <p className="max-w-64 truncate text-xs text-muted-foreground">{item.note ?? item.reference ?? '—'}</p>
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

function documentPath(type: InventoryDocumentType, id: string) {
  if (type === InventoryDocumentType.OpeningStock) return `/inventory/opening-stock/${id}`
  if (type === InventoryDocumentType.Adjustment) return `/inventory/adjustments/${id}`
  if (type === InventoryDocumentType.Purchase) return `/purchases/invoices/${id}`
  if (type === InventoryDocumentType.SalesInvoice) return `/sales/invoices/${id}`
  if (type === InventoryDocumentType.PosSale) return `/pos/sales/${id}`
  if (type === InventoryDocumentType.PosRefund) return `/pos/refunds/${id}`
  return `/inventory/transfers/${id}`
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} />
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
