import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCategories, useDeleteSubcategory, useSubcategories } from '../hooks/useInventory'
import type { Subcategory } from '../types/inventory.types'
import { Empty, Header, Loading, SearchBar, Status } from './CategoriesPage'
import { SubcategoryDialog } from './DefinitionDialogs'

export function SubcategoriesPage() {
  const { t } = useTranslation(['inventory', 'common'])
  const categories = useCategories().data?.data ?? []
  const [editing, setEditing] = useState<Subcategory | null>(null)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const subcategories = useSubcategories({
    page: String(page),
    pageSize: String(pageSize),
    search: search.trim() || undefined,
    categoryId: categoryId || undefined,
    isActive: status || undefined,
  })
  const remove = useDeleteSubcategory()

  const rows = subcategories.data?.data ?? []
  const total = subcategories.data?.meta.totalCount ?? 0
  const close = () => { setOpen(false); setEditing(null) }
  const create = () => { setEditing(null); setOpen(true) }
  const edit = (item: Subcategory) => { setEditing(item); setOpen(true) }
  const deleteSubcategory = (item: Subcategory) => {
    if (window.confirm(t('inventory:subcategories.deleteConfirm', { name: item.name }))) {
      remove.mutate(item.id)
    }
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <Header
        title={t('inventory:subcategories.title')}
        description={t('inventory:subcategories.description')}
        action={t('inventory:subcategories.addSubcategory')}
        onClick={create}
      />
      <div className="grid gap-3 md:grid-cols-[1fr_220px_180px]">
        <SearchBar
          value={search}
          onChange={(value) => { setSearch(value); setPage(1) }}
          placeholder={t('inventory:subcategories.searchPlaceholder')}
          count={t('inventory:subcategories.count', { count: total })}
        />
        <select
          value={categoryId}
          onChange={(event) => { setCategoryId(event.target.value); setPage(1) }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">{t('inventory:subcategories.allCategories')}</option>
          {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
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
              <TableHead className="px-4 text-start">{t('inventory:subcategories.th.subcategory')}</TableHead>
              <TableHead className="px-4 text-start">{t('inventory:subcategories.th.category')}</TableHead>
              <TableHead className="px-4 text-start">{t('inventory:subcategories.th.status')}</TableHead>
              <TableHead className="w-24 px-4 text-end">{t('inventory:subcategories.th.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subcategories.isLoading ? (
              <Loading colSpan={4} />
            ) : rows.length === 0 ? (
              <Empty colSpan={4} label={t('inventory:subcategories.empty')} onClick={create} />
            ) : (
              rows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="px-4 py-3.5 text-start font-medium">{item.name}</TableCell>
                  <TableCell className="px-4 py-3.5 text-start">{item.categoryName}</TableCell>
                  <TableCell className="px-4 py-3.5 text-start">
                    <Status active={item.isActive} />
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-end">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => edit(item)}
                      aria-label={t('inventory:subcategories.editSubcategory', { name: item.name })}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => deleteSubcategory(item)}
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
      {(subcategories.isError || remove.isError) && (
        <p className="text-sm text-destructive">{subcategories.error?.message ?? remove.error?.message}</p>
      )}
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />
      <SubcategoryDialog
        open={open}
        onOpenChange={(value) => value ? setOpen(true) : close()}
        categories={categories}
        subcategory={editing}
      />
    </div>
  )
}

const head = 'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
