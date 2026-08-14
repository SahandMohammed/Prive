import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSaveUnit, useUnits } from '../hooks/useInventory'
import { unitSchema } from '../schemas/inventory.schemas'
import type { Unit, UnitInput } from '../types/inventory.types'
import { Empty, Field, Header, Loading, SearchBar, Status } from './CategoriesPage'

const defaults: UnitInput = { name: '', code: '', isActive: true }
export function UnitsPage() {
  const unitsQuery = useUnits(); const [editing, setEditing] = useState<Unit | null>(null); const [open, setOpen] = useState(false); const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [pageSize, setPageSize] = useState(10)
  const form = useForm<UnitInput>({ resolver: zodResolver(unitSchema), defaultValues: defaults }); const save = useSaveUnit(editing?.id ?? null)
  useEffect(() => form.reset(editing ?? defaults), [editing, form])
  const close = () => { setOpen(false); setEditing(null) }; const create = () => { setEditing(null); setOpen(true) }; const edit = (item: Unit) => { setEditing(item); setOpen(true) }
  const rows = useMemo(() => { const term = search.trim().toLowerCase(); return (unitsQuery.data?.data ?? []).filter((item) => !term || item.name.toLowerCase().includes(term) || item.code.toLowerCase().includes(term)) }, [unitsQuery.data?.data, search]); const paged = rows.slice((page - 1) * pageSize, page * pageSize)
  return <div className="flex h-full w-full flex-col space-y-6"><Header title="Units of Measure" description="Maintain the base units used for inventory quantities." action="Add unit" onClick={create} /><SearchBar value={search} onChange={(value) => { setSearch(value); setPage(1) }} placeholder="Search units" count={`${rows.length} unit${rows.length === 1 ? '' : 's'}`} /><DataTableShell><Table><TableHeader><TableRow className={head}><TableHead className="px-4">Code</TableHead><TableHead className="px-4">Unit</TableHead><TableHead className="px-4">Status</TableHead><TableHead className="w-20 px-4 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>{unitsQuery.isLoading ? <Loading colSpan={4} /> : paged.length === 0 ? <Empty colSpan={4} label="No units found" onClick={create} /> : paged.map((item) => <TableRow key={item.id}><TableCell className="px-4 py-3.5 font-mono font-medium">{item.code}</TableCell><TableCell className="px-4 py-3.5 font-medium">{item.name}</TableCell><TableCell className="px-4 py-3.5"><Status active={item.isActive} /></TableCell><TableCell className="px-4 py-3.5 text-right"><Button variant="ghost" size="icon-sm" onClick={() => edit(item)} aria-label={`Edit ${item.name}`}><Pencil className="size-4" /></Button></TableCell></TableRow>)}</TableBody></Table></DataTableShell><DataTablePagination page={page} pageSize={pageSize} totalItems={rows.length} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} /><Dialog open={open} onOpenChange={(value) => value ? setOpen(true) : close()}><DialogContent><DialogHeader><DialogTitle>{editing ? `Edit ${editing.code}` : 'Add unit'}</DialogTitle><DialogDescription>Use a concise code such as PCS, BTL, BOX, or L.</DialogDescription></DialogHeader><form onSubmit={form.handleSubmit((values) => save.mutate(values, { onSuccess: close }))} className="space-y-4"><Field label="Code" error={form.formState.errors.code?.message}><Input className="uppercase" {...form.register('code')} /></Field><Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active</label>{save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}<DialogFooter><Button type="button" variant="outline" onClick={close}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{editing ? 'Save changes' : 'Add unit'}</Button></DialogFooter></form></DialogContent></Dialog></div>
}
const head = 'border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60'
