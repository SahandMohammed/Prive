import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCategories, useDeleteSubcategory, useSubcategories } from '../hooks/useInventory'
import type { Subcategory } from '../types/inventory.types'
import { Empty, Header, Loading, SearchBar, Status } from './CategoriesPage'
import { SubcategoryDialog } from './DefinitionDialogs'

export function SubcategoriesPage() {
  const categories = useCategories().data?.data ?? []
  const [editing, setEditing] = useState<Subcategory | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const subcategories = useSubcategories({ page: String(page), pageSize: String(pageSize), search: search.trim() || undefined, categoryId: categoryId || undefined, isActive: status || undefined })
  const remove = useDeleteSubcategory()

  const rows = subcategories.data?.data ?? []
  const total = subcategories.data?.meta.totalCount ?? 0
  const close = () => { setOpen(false); setEditing(null) }
  const create = () => { setEditing(null); setOpen(true) }
  const edit = (item: Subcategory) => { setEditing(item); setOpen(true) }
  const deleteSubcategory = (item: Subcategory) => {
    if (window.confirm(`Delete ${item.name}? Assigned subcategories cannot be deleted.`)) remove.mutate(item.id)
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <Header title="Subcategories" description="Add one optional organizational level beneath a category." action="Add subcategory" onClick={create} />
      <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]"><SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search subcategories" count={`${total} subcategor${total === 1 ? 'y' : 'ies'}`} /><select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1) }} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select></div>
      <DataTableShell><Table><TableHeader><TableRow className={head}><TableHead className="px-4">Subcategory</TableHead><TableHead className="px-4">Category</TableHead><TableHead className="px-4">Status</TableHead><TableHead className="w-24 px-4 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{subcategories.isLoading ? <Loading colSpan={4} /> : rows.length === 0 ? <Empty colSpan={4} label="No subcategories found" onClick={create} /> : rows.map((item) => <TableRow key={item.id}><TableCell className="px-4 py-3.5 font-medium">{item.name}</TableCell><TableCell className="px-4 py-3.5">{item.categoryName}</TableCell><TableCell className="px-4 py-3.5"><Status active={item.isActive} /></TableCell><TableCell className="px-4 py-3.5 text-right"><Button variant="ghost" size="icon-sm" onClick={() => edit(item)} aria-label={`Edit ${item.name}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => deleteSubcategory(item)} disabled={remove.isPending} aria-label={`Delete ${item.name}`}><Trash2 className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></DataTableShell>
      {(subcategories.isError || remove.isError) && <p className="text-sm text-destructive">{subcategories.error?.message ?? remove.error?.message}</p>}
      <DataTablePagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
      <SubcategoryDialog open={open} onOpenChange={(value) => value ? setOpen(true) : close()} categories={categories} subcategory={editing} />
    </div>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
