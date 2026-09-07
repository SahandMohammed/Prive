import { getSelectedBranchId } from '@/features/business'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Box, MapPin, Plus, Search, WarehouseIcon } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useBranches } from '@/features/business'
import { useSaveWarehouse, useWarehouses, warehouseSchema, type WarehouseInput } from '@/features/inventory'

const warehouseDefaults: WarehouseInput = {
  code: '',
  name: '',
  branchId: '',
  isActive: true,
}

export function WarehousesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const warehouseQuery = useWarehouses()
  const filteredWarehouses = useMemo(() => {
    const term = search.trim().toLowerCase()
    const warehouses = warehouseQuery.data?.data ?? []

    return term
      ? warehouses.filter((warehouse) =>
          `${warehouse.code} ${warehouse.name} ${warehouse.branchCode} ${warehouse.branchName}`
            .toLowerCase()
            .includes(term))
      : warehouses
  }, [search, warehouseQuery.data?.data])
  const warehouses = filteredWarehouses.slice(
    (page - 1) * pageSize,
    page * pageSize,
  )

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Warehouses</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the locations used for inventory movement and fulfillment.</p>
        </div>
        <Button
          className="gap-1.5 bg-primary px-4 text-sm font-medium text-white shadow-sm hover:bg-primary/90"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Create warehouse
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            placeholder="Search warehouses"
            className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        <p className="text-sm text-slate-500">
          {filteredWarehouses.length} warehouse{filteredWarehouses.length === 1 ? '' : 's'}
        </p>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Code</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Warehouse</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Branch</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {warehouseQuery.isLoading && <StateRow message="Loading warehouses..." />}
              {warehouseQuery.isError && !warehouseQuery.isLoading && <StateRow error message="Failed to load warehouses" />}
              {!warehouseQuery.isLoading && !warehouseQuery.isError && filteredWarehouses.length === 0 && (
                <StateRow message="No warehouses found. Create your first warehouse to begin tracking stock." />
              )}
              {!warehouseQuery.isLoading && !warehouseQuery.isError && warehouses.map((warehouse) => (
                <TableRow key={warehouse.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <TableCell className="px-4 py-3.5 font-mono text-sm text-slate-500">{warehouse.code}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-md bg-orange-50 p-2 text-primary">
                        <WarehouseIcon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200">{warehouse.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400" />
                      {warehouse.branchCode} — {warehouse.branchName}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <span className={warehouse.isActive
                      ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600'
                      : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500'}>
                      {warehouse.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={filteredWarehouses.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />
      <CreateWarehouseDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
    </div>
  )
}

function CreateWarehouseDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const branchQuery = useBranches()
  const branches = branchQuery.data?.data.filter((branch) => branch.isActive) ?? []
  const createWarehouse = useSaveWarehouse(null)
  const form = useForm<WarehouseInput>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { ...warehouseDefaults, branchId: getSelectedBranchId() },
  })
  const close = () => {
    createWarehouse.reset()
    form.reset({ ...warehouseDefaults, branchId: getSelectedBranchId() })
    onOpenChange(false)
  }
  const onSubmit = (values: WarehouseInput) => createWarehouse.mutate(values, {
    onSuccess: close,
  })

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => nextOpen ? onOpenChange(true) : close()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create warehouse</DialogTitle>
          <DialogDescription>Add an inventory location. Stock movements will always be recorded against a warehouse.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField label="Warehouse code" error={form.formState.errors.code?.message}>
            <Input {...form.register('code')} autoFocus placeholder="e.g. MAIN" />
          </FormField>
          <FormField label="Warehouse name" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} placeholder="e.g. Main Warehouse" />
          </FormField>
          <FormField label="Branch" error={form.formState.errors.branchId?.message}>
            <select
              {...form.register('branchId')}
              className="h-10 w-full rounded-md border border-slate-200 bg-slate-50 px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring dark:border-slate-800 dark:bg-slate-800/50"
              disabled={branchQuery.isLoading}
            >
              <option value="">{branchQuery.isLoading ? 'Loading branches...' : 'Select a branch'}</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>
              ))}
            </select>
          </FormField>
          <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input type="checkbox" {...form.register('isActive')} />
            Active
          </label>
          {branchQuery.isError && <p className="text-sm text-red-600">Failed to load branches.</p>}
          {createWarehouse.isError && <p className="text-sm text-red-600">{createWarehouse.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close} disabled={createWarehouse.isPending}>Cancel</Button>
            <Button
              type="submit"
              className="bg-primarytext-primary-foregroundhover:bg-primary/90"
              disabled={createWarehouse.isPending || branchQuery.isLoading || branches.length === 0}
            >
              {createWarehouse.isPending ? 'Creating...' : 'Create warehouse'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function StateRow({ message, error = false }: { message: string; error?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className={error ? 'h-48 text-center text-red-500' : 'h-48 text-center text-sm text-slate-500'}>
        {error
          ? <span className="inline-flex items-center gap-2"><AlertCircle className="h-5 w-5" />{message}</span>
          : <span className="inline-flex items-center gap-2"><Box className="h-5 w-5" />{message}</span>}
      </TableCell>
    </TableRow>
  )
}
