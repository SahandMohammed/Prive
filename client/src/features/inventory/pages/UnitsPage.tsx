import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useDeleteUnit, useSaveUnit, useUnits } from '../hooks/useInventory'
import { unitSchema } from '../schemas/inventory.schemas'
import type { Unit, UnitInput } from '../types/inventory.types'
import { Empty, Field, Header, Loading, SearchBar, Status } from './CategoriesPage'

const defaults: UnitInput = { name: '', code: '', isActive: true }

export function UnitsPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const [editing, setEditing] = useState<Unit | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const units = useUnits({
    page: String(page),
    pageSize: String(pageSize),
    search: search.trim() || undefined,
    isActive: status || undefined,
  })
  const form = useForm<UnitInput>({ resolver: zodResolver(unitSchema), defaultValues: defaults })
  const save = useSaveUnit(editing?.id ?? null)
  const remove = useDeleteUnit()

  useEffect(() => form.reset(editing ?? defaults), [editing, form])

  const rows = units.data?.data ?? []
  const total = units.data?.meta.totalCount ?? 0
  const close = () => { setOpen(false); setEditing(null) }
  const create = () => { setEditing(null); setOpen(true) }
  const edit = (item: Unit) => { setEditing(item); setOpen(true) }
  const deleteUnit = (item: Unit) => {
    if (window.confirm(t('inventory:unitsTable.deleteConfirm', { name: item.name }))) {
      remove.mutate(item.id)
    }
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <Header
        title={t('inventory:unitsTable.title')}
        description={t('inventory:unitsTable.description')}
        action={t('inventory:unitsTable.addUnit')}
        onClick={create}
      />
      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); setPage(1) }}
          placeholder={t('inventory:unitsTable.searchPlaceholder')}
          count={t('inventory:unitsTable.count', { count: total })}
        />
        <select
          value={status}
          onChange={(event) => { setStatus(event.target.value); setPage(1) }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('inventory:subcategories.allStatuses')}</option>
          <option value="true">{t('inventory:common.active')}</option>
          <option value="false">{t('inventory:common.inactive')}</option>
        </select>
      </div>
      <DataTableShell>
        <Table>
          <TableHeader>
            <TableRow className={head}>
              <TableHead className="px-4 text-start">{t('inventory:unitsTable.th.code')}</TableHead>
              <TableHead className="px-4 text-start">{t('inventory:unitsTable.th.unit')}</TableHead>
              <TableHead className="px-4 text-start">{t('inventory:unitsTable.th.status')}</TableHead>
              <TableHead className="w-24 px-4 text-end">{t('inventory:unitsTable.th.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {units.isLoading ? (
              <Loading colSpan={4} />
            ) : rows.length === 0 ? (
              <Empty colSpan={4} label={t('inventory:unitsTable.empty')} onClick={create} />
            ) : (
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-3.5 text-start font-mono font-medium">{item.code}</TableCell>
                  <TableCell className="px-4 py-3.5 text-start font-medium">{item.name}</TableCell>
                  <TableCell className="px-4 py-3.5 text-start">
                    <Status active={item.isActive} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => edit(item)}
                      aria-label={t('inventory:unitsTable.editUnit', { code: item.code })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteUnit(item)}
                      disabled={remove.isPending}
                      aria-label={t('common:actions.delete')}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </DataTableShell>
      {(units.isError || remove.isError) && (
        <p className="text-sm text-destructive">{units.error?.message ?? remove.error?.message}</p>
      )}
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />
      <Dialog open={open} onOpenChange={(value) => value ? setOpen(true) : close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t('inventory:unitsTable.editUnit', { code: editing.code }) : t('inventory:unitsTable.addUnit')}
            </DialogTitle>
            <DialogDescription>
              {t('inventory:unitsTable.dialogDescription')}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => save.mutate(values, { onSuccess: close }))} className="space-y-4">
            <Field label={t('inventory:unitsTable.symbolCode')} error={form.formState.errors.code?.message}>
              <Input className="uppercase" {...form.register('code')} />
            </Field>
            <Field label={t('inventory:unitsTable.name')} error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...form.register('isActive')} />
              {t('inventory:unitsTable.active')}
            </label>
            {save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={close}>{t('common:actions.cancel')}</Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="size-4 animate-spin" />}
                {editing ? t('common:actions.save') : t('inventory:unitsTable.addUnit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
