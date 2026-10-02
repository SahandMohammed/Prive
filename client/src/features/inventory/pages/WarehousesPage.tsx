import { getSelectedBranchId, useBranches } from '@/features/business'
import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useSaveWarehouse, useWarehouses } from '../hooks/useInventory'
import { warehouseSchema } from '../schemas/inventory.schemas'
import type { Warehouse, WarehouseInput } from '../types/inventory.types'
import { Empty, Field, Header, Loading, SearchBar, Status } from './CategoriesPage'

const defaults: WarehouseInput = { code: '', name: '', branchId: '', isActive: true }

export function WarehousesPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const warehousesQuery = useWarehouses()
  const branches = useBranches().data?.data.filter((item) => item.isActive) ?? []
  const [editing, setEditing] = useState<Warehouse | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const form = useForm<WarehouseInput>({
    resolver: zodResolver(warehouseSchema),
    defaultValues: { ...defaults, branchId: getSelectedBranchId() },
  })
  const save = useSaveWarehouse(editing?.id ?? null)

  useEffect(() => {
    form.reset(editing ?? { ...defaults, branchId: getSelectedBranchId() })
  }, [editing, form])

  const close = () => { setOpen(false); setEditing(null) }
  const create = () => { setEditing(null); setOpen(true) }
  const edit = (item: Warehouse) => { setEditing(item); setOpen(true) }

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    return (warehousesQuery.data?.data ?? []).filter((item) =>
      !term || `${item.code} ${item.name} ${item.branchName}`.toLowerCase().includes(term)
    )
  }, [warehousesQuery.data?.data, search])

  const paged = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <Header
        title={t('inventory:warehouses.title')}
        description={t('inventory:warehouses.description')}
        action={t('inventory:warehouses.addWarehouse')}
        onClick={create}
      />
      <SearchBar
        value={search}
        onChange={(value) => { setSearch(value); setPage(1) }}
        placeholder={t('inventory:warehouses.searchPlaceholder')}
        count={t('inventory:warehouses.count', { count: rows.length })}
      />
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className={head}>
              <TableHead className="px-4 text-start">{t('inventory:warehouses.th.code')}</TableHead>
              <TableHead className="px-4 text-start">{t('inventory:warehouses.th.warehouse')}</TableHead>
              <TableHead className="px-4 text-start">{t('inventory:warehouses.th.branch')}</TableHead>
              <TableHead className="px-4 text-start">{t('inventory:warehouses.th.status')}</TableHead>
              <TableHead className="w-20 px-4 text-end">{t('inventory:warehouses.th.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {warehousesQuery.isLoading ? (
              <Loading colSpan={5} />
            ) : paged.length === 0 ? (
              <Empty colSpan={5} label={t('inventory:warehouses.empty')} onClick={create} />
            ) : (
              paged.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-3.5 text-start font-mono">{item.code}</TableCell>
                  <TableCell className="px-4 py-3.5 text-start font-medium">{item.name}</TableCell>
                  <TableCell className="px-4 py-3.5 text-start">{item.branchCode} — {item.branchName}</TableCell>
                  <TableCell className="px-4 py-3.5 text-start">
                    <Status active={item.isActive} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => edit(item)}
                      aria-label={t('inventory:warehouses.editWarehouse', { code: item.code })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={rows.length}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />
      <Dialog open={open} onOpenChange={(value) => value ? setOpen(true) : close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t('inventory:warehouses.editWarehouse', { code: editing.code }) : t('inventory:warehouses.addWarehouse')}
            </DialogTitle>
            <DialogDescription>
              {t('inventory:warehouses.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => save.mutate(values, { onSuccess: close }))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t('inventory:warehouses.code')} error={form.formState.errors.code?.message}>
                <Input className="uppercase" {...form.register('code')} />
              </Field>
              <Field label={t('inventory:warehouses.name')} error={form.formState.errors.name?.message}>
                <Input {...form.register('name')} />
              </Field>
            </div>
            <Field label={t('inventory:warehouses.branch')} error={form.formState.errors.branchId?.message}>
              <select className="h-9 rounded-md border bg-background px-3" {...form.register('branchId')}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} — {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('isActive')} />
              {t('inventory:warehouses.active')}
            </label>
            {save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>{t('common:actions.cancel')}</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                {editing ? t('common:actions.save') : t('inventory:warehouses.addWarehouse')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
