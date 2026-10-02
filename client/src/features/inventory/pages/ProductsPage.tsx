import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentBusiness } from '@/features/business'
import { formatCurrency } from '@/lib/i18n'
import { useCategories, useDeleteProduct, useProducts, useSubcategories } from '../hooks/useInventory'
import { Empty, Loading, Status } from './CategoriesPage'

export function ProductsPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [subcategoryId, setSubcategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const filters = useMemo(() => ({
    page: String(page),
    pageSize: String(pageSize),
    search: search.trim() || undefined,
    categoryId: categoryId || undefined,
    subcategoryId: subcategoryId || undefined,
    isActive: status || undefined,
  }), [categoryId, page, pageSize, search, status, subcategoryId])
  const products = useProducts(filters)
  const categories = useCategories().data?.data ?? []
  const subcategories = useSubcategories({ categoryId: categoryId || undefined }).data?.data ?? []
  const business = useCurrentBusiness().data
  const remove = useDeleteProduct()
  const rows = products.data?.data ?? []
  const total = products.data?.meta.totalCount ?? 0

  const resetPage = () => setPage(1)
  const selectCategory = (value: string) => {
    setCategoryId(value)
    setSubcategoryId('')
    resetPage()
  }
  const deleteProduct = (id: string, name: string) => {
    if (window.confirm(t('inventory:items.deleteConfirm', { name }))) {
      remove.mutate(id)
    }
  }

  const currencyCode = business?.baseCurrencyCode ?? 'IQD'

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('inventory:items.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t('inventory:items.description')}</p>
        </div>
        <Link to="/settings/items/new">
          <Button className="gap-1.5">
            <Plus className="size-4" />
            {t('inventory:items.addItem')}
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); resetPage() }}
            placeholder={t('inventory:items.searchPlaceholder')}
            className="ps-9"
          />
        </div>
        <Select value={categoryId} onChange={selectCategory} label={t('inventory:items.allCategories')}>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
        <Select value={subcategoryId} onChange={(value) => { setSubcategoryId(value); resetPage() }} label={t('inventory:items.allSubcategories')}>
          {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
        </Select>
        <Select value={status} onChange={(value) => { setStatus(value); resetPage() }} label={t('inventory:items.allStatuses')}>
          <option value="true">{t('inventory:items.active')}</option>
          <option value="false">{t('inventory:items.inactive')}</option>
        </Select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead className="px-4 text-start">{t('inventory:items.th.item')}</TableHead>
                <TableHead className="px-4 text-start">{t('inventory:items.th.category')}</TableHead>
                <TableHead className="px-4 text-start">{t('inventory:items.th.baseUnit')}</TableHead>
                <TableHead className="px-4 text-end">{t('inventory:items.th.purchasePrice')}</TableHead>
                <TableHead className="px-4 text-end">{t('inventory:items.th.sellingPrice')}</TableHead>
                <TableHead className="px-4 text-start">{t('inventory:items.th.status')}</TableHead>
                <TableHead className="w-24 px-4 text-end">{t('inventory:items.th.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.isLoading ? (
                <Loading colSpan={7} />
              ) : rows.length === 0 ? (
                <Empty colSpan={7} label={t('inventory:items.empty')} />
              ) : (
                rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p className="font-medium">{item.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.sku}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p>{item.categoryName}</p>
                      <p className="text-xs text-muted-foreground">{item.subcategoryName ?? t('inventory:items.noSubcategory')}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p>{item.unitName}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.unitCode}
                        {item.unitConversions.length > 0
                          ? ` · ${t('inventory:items.conversionsCount', { count: item.unitConversions.length })}`
                          : ''}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono">
                      {formatCurrency(item.purchasePriceBase, currencyCode)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono">
                      {formatCurrency(item.sellingPriceBase, currencyCode)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <Status active={item.isActive} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <Link to={`/settings/items/${item.id}`} aria-label={`${t('common:actions.edit')} ${item.name}`}>
                        <Button variant="ghost" size="icon-sm">
                          <Pencil className="size-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => deleteProduct(item.id, item.name)}
                        disabled={remove.isPending}
                        aria-label={`${t('common:actions.delete')} ${item.name}`}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
      {products.isError && <p className="text-sm text-destructive">{products.error.message}</p>}
      {remove.isError && <p className="text-sm text-destructive">{remove.error.message}</p>}
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />
    </div>
  )
}

function Select({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
    >
      <option value="">{label}</option>
      {children}
    </select>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
