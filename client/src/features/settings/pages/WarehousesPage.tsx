import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Box, MapPin, Plus, Search, WarehouseIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { useCreateWarehouse, useWarehouses } from '../hooks/useSettings'
import { createWarehouseSchema, type CreateWarehouseFormValues } from '../schemas/settings.schemas'

export function WarehousesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const warehouseQuery = useMemo(() => ({ page, pageSize, search: search.trim() || undefined }), [page, pageSize, search])
  const { data: warehousePage, isLoading, isError } = useWarehouses(warehouseQuery)
  const warehouses = warehousePage?.data ?? []
  const totalWarehouses = warehousePage?.meta.totalCount ?? 0

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Warehouses</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the locations used for inventory movement and fulfillment.</p>
        </div>
        <Button className="gap-1.5 bg-[#e05d38] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#c94f2d]" onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Create warehouse
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search warehouses" className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900" />
        </div>
        <p className="text-sm text-slate-500">{totalWarehouses} warehouse{totalWarehouses === 1 ? '' : 's'}</p>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Code</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Address</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {isLoading && <StateRow message="Loading warehouses..." />}
              {isError && !isLoading && <StateRow error message="Failed to load warehouses" />}
              {!isLoading && !isError && warehouses.length === 0 && <StateRow message="No warehouses found. Create your first warehouse to begin tracking stock." />}
              {!isLoading && !isError && warehouses.map((warehouse) => (
                <TableRow key={warehouse.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <TableCell className="px-4 py-3.5 font-mono text-sm text-slate-500">{warehouse.code}</TableCell>
                  <TableCell className="px-4 py-3.5"><div className="flex items-center gap-3"><div className="rounded-md bg-orange-50 p-2 text-[#e05d38]"><WarehouseIcon className="h-4 w-4" /></div><span className="font-medium text-slate-800 dark:text-slate-200">{warehouse.name}</span></div></TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{warehouse.address ? <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-400" />{warehouse.address}</span> : '—'}</TableCell>
                  <TableCell className="px-4 py-3.5"><span className={warehouse.isActive ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600' : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500'}>{warehouse.isActive ? 'Active' : 'Inactive'}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      <DataTablePagination page={page} pageSize={pageSize} totalItems={totalWarehouses} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
      <CreateWarehouseDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}

function CreateWarehouseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const createWarehouse = useCreateWarehouse()
  const form = useForm<CreateWarehouseFormValues>({ resolver: zodResolver(createWarehouseSchema), defaultValues: { code: '', name: '', address: '' } })
  const onSubmit = (values: CreateWarehouseFormValues) => createWarehouse.mutate({ code: values.code, name: values.name, address: values.address || null }, { onSuccess: () => { form.reset(); onOpenChange(false) } })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader><DialogTitle>Create warehouse</DialogTitle><DialogDescription>Add an inventory location. Stock movements will always be recorded against a warehouse.</DialogDescription></DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Warehouse code" error={form.formState.errors.code?.message}><Input {...form.register('code')} autoFocus placeholder="e.g. MAIN" /></FormField>
          <FormField label="Warehouse name" error={form.formState.errors.name?.message}><Input {...form.register('name')} placeholder="e.g. Main Warehouse" /></FormField>
          <FormField label="Address" error={form.formState.errors.address?.message}><Input {...form.register('address')} placeholder="Optional location or address" /></FormField>
          {createWarehouse.isError && <p className="text-sm text-red-600">{createWarehouse.error.message}</p>}
          <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={createWarehouse.isPending}>Cancel</Button><Button type="submit" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" disabled={createWarehouse.isPending}>{createWarehouse.isPending ? 'Creating...' : 'Create warehouse'}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <div className="space-y-1.5"><label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>{children}{error && <p className="text-xs text-red-600">{error}</p>}</div> }
function StateRow({ message, error = false }: { message: string; error?: boolean }) { return <TableRow><TableCell colSpan={4} className={error ? 'h-48 text-center text-red-500' : 'h-48 text-center text-sm text-slate-500'}>{error ? <span className="inline-flex items-center gap-2"><AlertCircle className="h-5 w-5" />{message}</span> : <span className="inline-flex items-center gap-2"><Box className="h-5 w-5" />{message}</span>}</TableCell></TableRow> }
