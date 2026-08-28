import { useMemo, useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentBusiness } from '@/features/business'
import { formatMoney } from '@/lib/money'
import { useCategories, useDeleteProduct, useProducts, useSubcategories } from '../hooks/useInventory'
import { Empty, Loading, Status } from './CategoriesPage'

export function ProductsPage() {
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
    if (window.confirm(`Delete ${name}? Products with history cannot be deleted.`)) remove.mutate(id)
  }
  const money = (value: number) => formatMoney(
    value,
    business?.baseCurrencySymbol ?? business?.baseCurrencyCode ?? '',
    business?.baseCurrencyDecimalPlaces ?? 2,
  )

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Items</h2>
          <p className="mt-1 text-sm text-muted-foreground">Define inventory items, their base units, and selling or purchasing conversions.</p>
        </div>
        <Link to="/settings/items/new"><Button className="gap-1.5 bg-[#e05d38] text-white hover:bg-[#c94f2d]"><Plus className="size-4" />Add item</Button></Link>
      </div>

      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} placeholder="Search name, SKU, or barcode" className="pl-9" />
        </div>
        <Select value={categoryId} onChange={selectCategory} label="All categories">
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </Select>
        <Select value={subcategoryId} onChange={(value) => { setSubcategoryId(value); resetPage() }} label="All subcategories">
          {subcategories.map((subcategory) => <option key={subcategory.id} value={subcategory.id}>{subcategory.name}</option>)}
        </Select>
        <Select value={status} onChange={(value) => { setStatus(value); resetPage() }} label="All statuses">
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader><TableRow className={head}>
              <TableHead className="px-4">Item</TableHead>
              <TableHead className="px-4">Category</TableHead>
              <TableHead className="px-4">Base unit</TableHead>
              <TableHead className="px-4 text-right">Purchase price</TableHead>
              <TableHead className="px-4 text-right">Selling price</TableHead>
              <TableHead className="px-4">Status</TableHead>
              <TableHead className="w-24 px-4 text-right">Actions</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {products.isLoading ? <Loading colSpan={7} /> : rows.length === 0 ? <Empty colSpan={7} label="No items found" /> : rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-3.5"><p className="font-medium">{item.name}</p><p className="font-mono text-xs text-muted-foreground">{item.sku}</p></TableCell>
                  <TableCell className="px-4 py-3.5"><p>{item.categoryName}</p><p className="text-xs text-muted-foreground">{item.subcategoryName ?? 'No subcategory'}</p></TableCell>
                  <TableCell className="px-4 py-3.5"><p>{item.unitName}</p><p className="text-xs text-muted-foreground">{item.unitCode}{item.unitConversions.length > 0 ? ` · ${item.unitConversions.length} conversion${item.unitConversions.length === 1 ? '' : 's'}` : ''}</p></TableCell>
                  <TableCell className="px-4 py-3.5 text-right font-mono">{money(item.purchasePriceBase)}</TableCell>
                  <TableCell className="px-4 py-3.5 text-right font-mono">{money(item.sellingPriceBase)}</TableCell>
                  <TableCell className="px-4 py-3.5"><Status active={item.isActive} /></TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    <Link to={`/settings/items/${item.id}`} aria-label={`Edit ${item.name}`}><Button variant="ghost" size="icon-sm"><Pencil className="size-4" /></Button></Link>
                    <Button variant="ghost" size="icon-sm" onClick={() => deleteProduct(item.id, item.name)} disabled={remove.isPending} aria-label={`Delete ${item.name}`}><Trash2 className="size-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>
      {products.isError && <p className="text-sm text-destructive">{products.error.message}</p>}
      {remove.isError && <p className="text-sm text-destructive">{remove.error.message}</p>}
      <DataTablePagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
    </div>
  )
}

function Select({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: React.ReactNode }) {
  return <select value={value} onChange={(event) => onChange(event.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm"><option value="">{label}</option>{children}</select>
}

const head = 'border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60'
