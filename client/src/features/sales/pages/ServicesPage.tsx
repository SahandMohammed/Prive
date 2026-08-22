import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAccountTree } from '@/features/accounting'
import { useCurrentBusiness } from '@/features/business'
import { serviceCategorySchema, serviceSchema } from '../schemas/sales.schemas'
import {
  useDeleteService,
  useDeleteServiceCategory,
  useSaveService,
  useSaveServiceCategory,
  useServiceCategories,
  useServices,
} from '../hooks/useSales'
import type { Service, ServiceCategory, ServiceCategoryInput, ServiceInput } from '../types/sales.types'

type ServiceForm = Omit<ServiceInput, 'description'> & { description: string }
const serviceDefaults: ServiceForm = { name: '', categoryId: '', sellingPriceBase: 0, durationMinutes: 30, revenueAccountId: '', isActive: true, description: '' }
const categoryDefaults: ServiceCategoryInput = { name: '', isActive: true }

export function ServicesPage() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('true')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [serviceOpen, setServiceOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [categoryOpen, setCategoryOpen] = useState(false)

  const categoriesQuery = useServiceCategories()
  const categories = categoriesQuery.data?.data ?? []
  const servicesQuery = useServices({
    page,
    pageSize,
    search: search.trim() || undefined,
    categoryId: categoryId || undefined,
    isActive: status || undefined,
  })
  const accounts = useAccountTree({ classification: '3', isActive: true, postingAccountsOnly: true }).data ?? []
  const business = useCurrentBusiness().data
  const saveService = useSaveService(editingService?.id ?? null)
  const deleteService = useDeleteService()
  const saveCategory = useSaveServiceCategory(editingCategory?.id ?? null)
  const deleteCategory = useDeleteServiceCategory()
  const serviceForm = useForm<ServiceForm>({ resolver: zodResolver(serviceSchema), defaultValues: serviceDefaults })
  const categoryForm = useForm<ServiceCategoryInput>({ resolver: zodResolver(serviceCategorySchema), defaultValues: categoryDefaults })

  useEffect(() => {
    serviceForm.reset(editingService ? {
      name: editingService.name,
      categoryId: editingService.categoryId,
      sellingPriceBase: editingService.sellingPriceBase,
      durationMinutes: editingService.durationMinutes,
      revenueAccountId: editingService.revenueAccountId,
      isActive: editingService.isActive,
      description: editingService.description ?? '',
    } : serviceDefaults)
  }, [editingService, serviceForm])

  useEffect(() => {
    categoryForm.reset(editingCategory ? { name: editingCategory.name, isActive: editingCategory.isActive } : categoryDefaults)
  }, [editingCategory, categoryForm])

  const openService = (service: Service | null) => { setEditingService(service); setServiceOpen(true) }
  const closeService = () => { setServiceOpen(false); setEditingService(null) }
  const openCategory = (category: ServiceCategory | null) => { setEditingCategory(category); setCategoryOpen(true) }
  const closeCategory = () => { setCategoryOpen(false); setEditingCategory(null) }
  const resetPage = () => setPage(1)

  return <div className="flex h-full flex-col space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div><h1 className="text-2xl font-bold tracking-tight">Services</h1><p className="mt-1 text-sm text-muted-foreground">Manage non-stock salon services and their Revenue account mapping.</p></div>
      <Button className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" onClick={() => openService(null)}><Plus className="size-4" />Add service</Button>
    </div>

    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-4">
        <div className="grid gap-3 rounded-lg border bg-card p-4 md:grid-cols-3">
          <Input aria-label="Search services" placeholder="Search name or description" value={search} onChange={(event) => { setSearch(event.target.value); resetPage() }} />
          <Select aria-label="Filter by category" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); resetPage() }}><option value="">All categories</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select>
          <Select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); resetPage() }}><option value="">All statuses</option><option value="true">Active</option><option value="false">Inactive</option></Select>
        </div>
        <DataTableShell><div className="overflow-x-auto"><Table><TableHeader><TableRow className={head}><TableHead>Service</TableHead><TableHead>Category</TableHead><TableHead className="text-right">Base price</TableHead><TableHead>Duration</TableHead><TableHead>Revenue account</TableHead><TableHead>Status</TableHead><TableHead className="w-20 text-right">Actions</TableHead></TableRow></TableHeader><TableBody>
          {servicesQuery.isPending ? <MessageRow colSpan={7} label="Loading services…" /> : servicesQuery.isError ? <MessageRow colSpan={7} label={servicesQuery.error.message} error /> : servicesQuery.data.data.length === 0 ? <MessageRow colSpan={7} label="No services found." /> : servicesQuery.data.data.map((service) => <TableRow key={service.id}>
            <TableCell><p className="font-medium">{service.name}</p><p className="max-w-64 truncate text-xs text-muted-foreground">{service.description ?? 'No description'}</p></TableCell>
            <TableCell>{service.categoryName}</TableCell>
            <TableCell className="text-right font-mono">{formatAmount(service.sellingPriceBase)} {business?.baseCurrencyCode ?? ''}</TableCell>
            <TableCell>{formatDuration(service.durationMinutes)}</TableCell>
            <TableCell><p className="font-mono text-xs">{service.revenueAccountCode}</p><p>{service.revenueAccountName}</p></TableCell>
            <TableCell><Status active={service.isActive} /></TableCell>
            <TableCell className="text-right"><Button variant="ghost" size="icon-sm" aria-label={`Edit ${service.name}`} onClick={() => openService(service)}><Pencil className="size-4" /></Button></TableCell>
          </TableRow>)}
        </TableBody></Table></div></DataTableShell>
        <DataTablePagination page={page} pageSize={pageSize} totalItems={servicesQuery.data?.meta.totalCount ?? 0} onPageChange={setPage} onPageSizeChange={(value) => { setPageSize(value); setPage(1) }} />
      </div>

      <Card className="h-fit"><CardHeader className="flex flex-row items-center justify-between"><CardTitle className="text-lg">Service categories</CardTitle><Button size="sm" variant="outline" onClick={() => openCategory(null)}><Plus className="size-4" />Add</Button></CardHeader><CardContent className="space-y-2">
        {categoriesQuery.isPending ? <p className="text-sm text-muted-foreground">Loading categories…</p> : categoriesQuery.isError ? <p className="text-sm text-destructive">{categoriesQuery.error.message}</p> : categories.length === 0 ? <p className="text-sm text-muted-foreground">No categories yet.</p> : categories.map((category) => <div key={category.id} className="flex items-center justify-between rounded-md border px-3 py-2"><div><p className="text-sm font-medium">{category.name}</p><Status active={category.isActive} /></div><div><Button variant="ghost" size="icon-sm" onClick={() => openCategory(category)}><Pencil className="size-4" /></Button><Button variant="ghost" size="icon-sm" aria-label={`Delete ${category.name}`} onClick={() => { if (window.confirm(`Delete unused category ${category.name}?`)) deleteCategory.mutate(category.id) }}><Trash2 className="size-4" /></Button></div></div>)}
        {deleteCategory.isError && <p className="text-sm text-destructive">{deleteCategory.error.message}</p>}
      </CardContent></Card>
    </div>

    <Dialog open={serviceOpen} onOpenChange={(value) => value ? setServiceOpen(true) : closeService()}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{editingService ? `Edit ${editingService.name}` : 'Add service'}</DialogTitle><DialogDescription>Prices use the Business Base Currency. Multiple Services may share the same Revenue account.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={serviceForm.handleSubmit((values) => saveService.mutate({ ...values, description: values.description.trim() || null }, { onSuccess: closeService }))}>
      <div className="grid gap-4 sm:grid-cols-2"><Field label="Name" error={serviceForm.formState.errors.name?.message}><Input {...serviceForm.register('name')} /></Field><Field label="Category" error={serviceForm.formState.errors.categoryId?.message}><Select {...serviceForm.register('categoryId')}><option value="">Select active category</option>{categories.filter((item) => item.isActive || item.id === editingService?.categoryId).map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}</Select></Field><Field label={`Selling price (${business?.baseCurrencyCode ?? 'Base Currency'})`} error={serviceForm.formState.errors.sellingPriceBase?.message}><Input type="number" min="0" step="0.0001" {...serviceForm.register('sellingPriceBase', { valueAsNumber: true })} /></Field><Field label="Duration (minutes)" error={serviceForm.formState.errors.durationMinutes?.message}><Input type="number" min="1" max="1440" {...serviceForm.register('durationMinutes', { valueAsNumber: true })} /></Field></div>
      <Field label="Revenue account" error={serviceForm.formState.errors.revenueAccountId?.message}><Select {...serviceForm.register('revenueAccountId')}><option value="">Select active Revenue posting account</option>{accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name}</option>)}</Select></Field>
      <Field label="Description" error={serviceForm.formState.errors.description?.message}><Textarea rows={3} {...serviceForm.register('description')} /></Field>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...serviceForm.register('isActive')} />Active</label>
      {(saveService.error ?? deleteService.error) && <p className="text-sm text-destructive">{(saveService.error ?? deleteService.error)?.message}</p>}
      <DialogFooter className="sm:justify-between">{editingService ? <Button type="button" variant="destructive" onClick={() => { if (window.confirm(`Delete unused Service ${editingService.name}?`)) deleteService.mutate(editingService.id, { onSuccess: closeService }) }}>Delete unused</Button> : <span />}<div className="flex gap-2"><Button type="button" variant="outline" onClick={closeService}>Cancel</Button><Button type="submit" disabled={saveService.isPending}>{saveService.isPending && <Loader2 className="size-4 animate-spin" />}Save service</Button></div></DialogFooter>
    </form></DialogContent></Dialog>

    <Dialog open={categoryOpen} onOpenChange={(value) => value ? setCategoryOpen(true) : closeCategory()}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{editingCategory ? `Edit ${editingCategory.name}` : 'Add service category'}</DialogTitle><DialogDescription>Categories are flat operational groupings, separate from Accounting.</DialogDescription></DialogHeader><form className="space-y-4" onSubmit={categoryForm.handleSubmit((values) => saveCategory.mutate(values, { onSuccess: closeCategory }))}><Field label="Name" error={categoryForm.formState.errors.name?.message}><Input {...categoryForm.register('name')} /></Field><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...categoryForm.register('isActive')} />Active</label>{saveCategory.isError && <p className="text-sm text-destructive">{saveCategory.error.message}</p>}<DialogFooter><Button type="button" variant="outline" onClick={closeCategory}>Cancel</Button><Button type="submit" disabled={saveCategory.isPending}>{saveCategory.isPending && <Loader2 className="size-4 animate-spin" />}Save category</Button></DialogFooter></form></DialogContent></Dialog>
  </div>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label> }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...props} /> }
function Status({ active }: { active: boolean }) { return <span className={active ? 'text-xs font-medium text-emerald-700' : 'text-xs font-medium text-slate-500'}>{active ? 'Active' : 'Inactive'}</span> }
function MessageRow({ colSpan, label, error = false }: { colSpan: number; label: string; error?: boolean }) { return <TableRow><TableCell colSpan={colSpan} className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>{label}</TableCell></TableRow> }
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatDuration = (minutes: number) => minutes >= 60 && minutes % 60 === 0 ? `${minutes / 60} hr` : `${minutes} min`
const head = 'border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60'
