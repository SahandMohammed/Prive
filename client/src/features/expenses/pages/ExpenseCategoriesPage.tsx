import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Edit2, Plus, Search, Trash2, X } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useAccountTree } from '@/features/accounting'
import {
  useExpenseCategories,
  useSaveExpenseCategory,
  useDeleteExpenseCategory,
} from '../hooks/useExpenses'
import { expenseCategorySchema } from '../schemas/expenses.schemas'
import type { ExpenseCategory, ExpenseCategoryInput } from '../types/expenses.types'

export function ExpenseCategoriesPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editingCategory, setEditingCategory] = useState<ExpenseCategory | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const query = useExpenseCategories({
    page,
    pageSize,
    search: search.trim() || undefined,
  })

  // Load chart of accounts to find Expense GL accounts (classification 4 = Expense)
  const accountsQuery = useAccountTree()
  const expenseAccounts = (accountsQuery.data ?? []).filter(
    (a) => a.isActive && !a.isGroup && a.classification === 4
  )

  const saveCategory = useSaveExpenseCategory(editingCategory?.id)
  const deleteCategory = useDeleteExpenseCategory()

  const form = useForm<ExpenseCategoryInput>({
    resolver: zodResolver(expenseCategorySchema),
    defaultValues: {
      code: '',
      name: '',
      accountingAccountId: '',
      isActive: true,
      description: '',
    },
  })

  const openCreateDialog = () => {
    setEditingCategory(null)
    form.reset({
      code: '',
      name: '',
      accountingAccountId: '',
      isActive: true,
      description: '',
    })
    setIsDialogOpen(true)
  }

  const openEditDialog = (category: ExpenseCategory) => {
    setEditingCategory(category)
    form.reset({
      code: category.code,
      name: category.name,
      accountingAccountId: category.accountingAccountId,
      isActive: category.isActive,
      description: category.description || '',
    })
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingCategory(null)
    form.reset()
  }

  const onSubmit = form.handleSubmit((data) => {
    saveCategory.mutate(
      {
        ...data,
        description: data.description?.trim() || null,
      },
      {
        onSuccess: () => {
          closeDialog()
        },
      }
    )
  })

  const rows = query.data?.data ?? []

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to="/expenses">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expense Categories</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Map operational expense classifications directly to Iraqi Unified Accounting Expense GL accounts.
            </p>
          </div>
        </div>
        <Button onClick={openCreateDialog} className="bg-primarytext-primary-foregroundhover:bg-primary/90">
          <Plus className="size-4 mr-1.5" />
          Add Category
        </Button>
      </div>

      {/* Delete / Save Error Feedback */}
      {(deleteCategory.error || saveCategory.error) && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium">
          {(deleteCategory.error || saveCategory.error)?.message}
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="flex gap-3 max-w-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search code, name..."
          />
        </div>
      </div>

      {/* Categories Table */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead>Code</TableHead>
                <TableHead>Category Name</TableHead>
                <TableHead>Mapped Expense GL Account</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    Loading categories…
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No expense categories found.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono font-semibold text-primary">
                      {category.code}
                    </TableCell>
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded mr-1.5">
                        {category.accountingAccountCode}
                      </span>
                      <span className="text-sm">{category.accountingAccountName}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {category.description || '—'}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          category.isActive
                            ? 'rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                        }
                      >
                        {category.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8"
                          onClick={() => openEditDialog(category)}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          disabled={deleteCategory.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                `Delete expense category '${category.code} — ${category.name}'?`
                              )
                            ) {
                              deleteCategory.mutate(category.id)
                            }
                          }}
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={query.data?.meta.totalCount ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(val) => {
          setPageSize(val)
          setPage(1)
        }}
      />

      {/* Modal / Dialog for Create / Edit */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-lg shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>
                {editingCategory ? 'Edit Expense Category' : 'Create Expense Category'}
              </CardTitle>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={closeDialog}>
                <X className="size-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                {/* Code */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Category Code <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. RENT, ELEC, ADV"
                    {...form.register('code')}
                  />
                  {form.formState.errors.code && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.code.message}
                    </p>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Category Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Office Rent, Electricity, Cleaning"
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                {/* Accounting GL Account */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Mapped Expense GL Account <span className="text-destructive">*</span>
                  </label>
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    {...form.register('accountingAccountId')}
                  >
                    <option value="">Select Expense Account (Class 3)</option>
                    {expenseAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} — {account.name}
                      </option>
                    ))}
                  </select>
                  {form.formState.errors.accountingAccountId && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.accountingAccountId.message}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">
                    Description (Optional)
                  </label>
                  <Input
                    placeholder="Category notes or details..."
                    {...form.register('description')}
                  />
                </div>

                {/* Is Active */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isActiveCheckbox"
                    className="size-4 rounded border"
                    {...form.register('isActive')}
                  />
                  <label htmlFor="isActiveCheckbox" className="text-sm font-medium">
                    Active (available for new expense documents)
                  </label>
                </div>

                {saveCategory.error && (
                  <p className="text-xs text-destructive font-medium">
                    {saveCategory.error.message}
                  </p>
                )}

                <div className="flex justify-end gap-2 pt-4 border-t">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-primarytext-primary-foregroundhover:bg-primary/90"
                    disabled={saveCategory.isPending}
                  >
                    {saveCategory.isPending ? 'Saving…' : 'Save Category'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
