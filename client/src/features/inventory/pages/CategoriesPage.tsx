import { useState } from 'react'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCategories, useDeleteCategory } from '../hooks/useInventory'
import type { Category } from '../types/inventory.types'
import { CategoryDialog } from './DefinitionDialogs'

export function CategoriesPage() {
  const [editing, setEditing] = useState<Category | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const categories = useCategories({ page: String(page), pageSize: String(pageSize), search: search.trim() || undefined, isActive: status || undefined })
  const remove = useDeleteCategory()

  const rows = categories.data?.data ?? []
  const total = categories.data?.meta.totalCount ?? 0
  const close = () => { setOpen(false); setEditing(null) }
  const create = () => { setEditing(null); setOpen(true) }
  const edit = (item: Category) => { setEditing(item); setOpen(true) }
  const deleteCategory = (item: Category) => {
    if (window.confirm(`Delete ${item.name}? Assigned categories cannot be deleted.`)) remove.mutate(item.id)
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <Header title="Categories" description="Organize items into one top-level category." action="Add category" onClick={create} />
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search categories" count={`${total} categor${total === 1 ? 'y' : 'ies'}`} />
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1) }} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></select>
      </div>
      <DataTableShell><Table><TableHeader><TableRow className={head}><TableHead className="px-4">Category</TableHead><TableHead className="px-4">Status</TableHead><TableHead className="w-24 px-4 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{categories.isLoading ? <Loading colSpan={3} /> : rows.length === 0 ? <Empty colSpan={3} label="No categories found" onClick={create} /> : rows.map((item) => <TableRow key={item.id}><TableCell className="px-4 py-3.5 font-medium">{item.name}</TableCell><TableCell className="px-4 py-3.5"><Status active={item.isActive} /></TableCell><TableCell className="px-4 py-3.5 text-right"><Button variant="ghost" size="icon-sm" onClick={() => edit(item)} aria-label={`Edit ${item.name}`}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" onClick={() => deleteCategory(item)} disabled={remove.isPending} aria-label={`Delete ${item.name}`}><Trash2 className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></DataTableShell>
      {(categories.isError || remove.isError) && <p className="text-sm text-destructive">{categories.error?.message ?? remove.error?.message}</p>}
      <DataTablePagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
      <CategoryDialog open={open} onOpenChange={(value) => value ? setOpen(true) : close()} category={editing} />
    </div>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
export function Header({ title, description, action, onClick }: { title: string; description: string; action: string; onClick: () => void }) { return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><Button className="gap-1.5 bg-primarytext-primary-foregroundhover:bg-primary/90" onClick={onClick}><Plus className="size-4" />{action}</Button></div> }
export function SearchBar({ value, onChange, placeholder, count }: { value: string; onChange: (value: string) => void; placeholder: string; count: string }) { return <div className="flex flex-1 flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900" /></div><p className="text-sm text-slate-500">{count}</p></div> }
export function Status({ active }: { active: boolean }) { return <span className={active ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600' : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500'}>{active ? 'Active' : 'Inactive'}</span> }
export function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label> }
export function Loading({ colSpan }: { colSpan: number }) { return <TableRow><TableCell colSpan={colSpan} className="h-48 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 size-6 animate-spin text-primary" />Loading…</TableCell></TableRow> }
export function Empty({ colSpan, label, onClick }: { colSpan: number; label: string; onClick?: () => void }) { return <TableRow><TableCell colSpan={colSpan} className="h-48 text-center"><p className="mb-3 text-sm text-slate-500">{label}</p>{onClick && <Button size="sm" onClick={onClick}><Plus className="size-4" />Add record</Button>}</TableCell></TableRow> }
