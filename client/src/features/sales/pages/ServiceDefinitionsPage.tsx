import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAccountTree } from '@/features/accounting'
import { useCurrentBusiness } from '@/features/business'
import { formatMoney } from '@/lib/money'
import {
  useDeleteService,
  useDeleteServiceCategory,
  useSaveService,
  useSaveServiceCategory,
  useServiceCategories,
  useServices,
} from '../hooks/useSales'
import { serviceCategorySchema, serviceSchema } from '../schemas/sales.schemas'
import type {
  Service,
  ServiceCategory,
  ServiceCategoryInput,
  ServiceInput,
} from '../types/sales.types'

type ServiceDefinitionTab = 'services' | 'categories'

const tabs: { id: ServiceDefinitionTab; label: string }[] = [
  { id: 'services', label: 'Services' },
  { id: 'categories', label: 'Categories' },
]

export function ServiceDefinitionsPage() {
  const [activeTab, setActiveTab] = useState<ServiceDefinitionTab>('services')

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Service definitions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage salon services, pricing, duration, and categories used to define them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((tab) => (
          <Button
            key={tab.id}
            type="button"
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {activeTab === 'services' && <ServicesTab />}
      {activeTab === 'categories' && <ServiceCategoriesTab />}
    </div>
  )
}

function ServicesTab() {
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const categoriesQuery = useServiceCategories()
  const categories = categoriesQuery.data?.data ?? []

  const servicesQuery = useServices({
    page,
    pageSize,
    search: search.trim() || undefined,
    categoryId: categoryId || undefined,
    isActive: status || undefined,
  })
  const remove = useDeleteService()
  const business = useCurrentBusiness().data

  const rows = servicesQuery.data?.data ?? []
  const total = servicesQuery.data?.meta.totalCount ?? 0

  const resetPage = () => setPage(1)
  const openCreate = () => {
    setEditingService(null)
    setDialogOpen(true)
  }
  const openEdit = (service: Service) => {
    setEditingService(service)
    setDialogOpen(true)
  }
  const closeDialog = () => {
    setDialogOpen(false)
    setEditingService(null)
  }

  const handleDelete = (service: Service) => {
    if (window.confirm(`Delete ${service.name}? Unused services only.`)) {
      remove.mutate(service.id)
    }
  }

  const money = (value: number) =>
    formatMoney(
      value,
      business?.baseCurrencySymbol ?? business?.baseCurrencyCode ?? '',
      business?.baseCurrencyDecimalPlaces ?? 2
    )

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Services</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Define non-stock salon services, duration, pricing, and revenue account mappings.
          </p>
        </div>
        <Button
          className="gap-1.5 bg-primarytext-primary-foregroundhover:bg-primary/90"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          Add service
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            placeholder="Search name or description"
            className="pl-9"
          />
        </div>
        <select
          value={categoryId}
          onChange={(event) => {
            setCategoryId(event.target.value)
            resetPage()
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All categories</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={tableHeadClass}>
                <TableHead className="px-4">Service</TableHead>
                <TableHead className="px-4">Category</TableHead>
                <TableHead className="px-4 text-right">Base price</TableHead>
                <TableHead className="px-4">Duration</TableHead>
                <TableHead className="px-4">Revenue account</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="w-24 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesQuery.isPending ? (
                <LoadingRow colSpan={7} />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} label="No services found." onClick={openCreate} />
              ) : (
                rows.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="px-4 py-3.5">
                      <p className="font-medium">{service.name}</p>
                      <p className="max-w-64 truncate text-xs text-muted-foreground">
                        {service.description ?? 'No description'}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">{service.categoryName}</TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-mono">
                      {money(service.sellingPriceBase)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      {formatDuration(service.durationMinutes)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <p className="font-mono text-xs text-muted-foreground">{service.revenueAccountCode}</p>
                      <p className="text-sm">{service.revenueAccountName}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <StatusBadge active={service.isActive} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${service.name}`}
                        onClick={() => openEdit(service)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${service.name}`}
                        disabled={remove.isPending}
                        onClick={() => handleDelete(service)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      {(servicesQuery.isError || remove.isError) && (
        <p className="text-sm text-destructive">
          {servicesQuery.error?.message ?? remove.error?.message}
        </p>
      )}

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={(value) => (value ? setDialogOpen(true) : closeDialog())}
        service={editingService}
        categories={categories}
        currencyCode={business?.baseCurrencyCode ?? 'Base Currency'}
      />
    </div>
  )
}

function ServiceCategoriesTab() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)

  const categoriesQuery = useServiceCategories({
    page,
    pageSize,
    search: search.trim() || undefined,
    isActive: status || undefined,
  })
  const remove = useDeleteServiceCategory()

  const rows = categoriesQuery.data?.data ?? []
  const total = categoriesQuery.data?.meta.totalCount ?? 0

  const resetPage = () => setPage(1)
  const openCreate = () => {
    setEditingCategory(null)
    setDialogOpen(true)
  }
  const openEdit = (category: ServiceCategory) => {
    setEditingCategory(category)
    setDialogOpen(true)
  }
  const closeDialog = () => {
    setDialogOpen(false)
    setEditingCategory(null)
  }

  const handleDelete = (category: ServiceCategory) => {
    if (window.confirm(`Delete ${category.name}? Assigned categories cannot be deleted.`)) {
      remove.mutate(category.id)
    }
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">Service categories</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Organize salon services into operational categories.
          </p>
        </div>
        <Button
          className="gap-1.5 bg-primarytext-primary-foregroundhover:bg-primary/90"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          Add category
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            placeholder="Search categories"
            className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={tableHeadClass}>
                <TableHead className="px-4">Category</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="w-24 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesQuery.isPending ? (
                <LoadingRow colSpan={3} />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={3} label="No categories found" onClick={openCreate} />
              ) : (
                rows.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="px-4 py-3.5 font-medium">{category.name}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <StatusBadge active={category.isActive} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Edit ${category.name}`}
                        onClick={() => openEdit(category)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Delete ${category.name}`}
                        disabled={remove.isPending}
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      {(categoriesQuery.isError || remove.isError) && (
        <p className="text-sm text-destructive">
          {categoriesQuery.error?.message ?? remove.error?.message}
        </p>
      )}

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      <ServiceCategoryDialog
        open={dialogOpen}
        onOpenChange={(value) => (value ? setDialogOpen(true) : closeDialog())}
        category={editingCategory}
      />
    </div>
  )
}

type ServiceFormValues = Omit<ServiceInput, 'description'> & { description: string }

const serviceDefaults: ServiceFormValues = {
  name: '',
  categoryId: '',
  sellingPriceBase: 0,
  durationMinutes: 30,
  revenueAccountId: '',
  isActive: true,
  description: '',
}

function ServiceDialog({
  open,
  onOpenChange,
  service,
  categories,
  currencyCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  service: Service | null
  categories: ServiceCategory[]
  currencyCode: string
}) {
  const accounts =
    useAccountTree({ classification: '3', isActive: true, postingAccountsOnly: true }).data ?? []
  const saveService = useSaveService(service?.id ?? null)
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema),
    defaultValues: serviceDefaults,
  })

  useEffect(() => {
    if (!open) return
    form.reset(
      service
        ? {
            name: service.name,
            categoryId: service.categoryId,
            sellingPriceBase: service.sellingPriceBase,
            durationMinutes: service.durationMinutes,
            revenueAccountId: service.revenueAccountId,
            isActive: service.isActive,
            description: service.description ?? '',
          }
        : serviceDefaults
    )
  }, [form, open, service])

  const close = () => {
    saveService.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{service ? `Edit ${service.name}` : 'Add service'}</DialogTitle>
          <DialogDescription>
            Prices use the Business Base Currency. Multiple Services may share the same Revenue
            account.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) =>
            saveService.mutate(
              { ...values, description: values.description.trim() || null },
              { onSuccess: close }
            )
          )}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} autoFocus />
            </FormField>
            <FormField label="Category" error={form.formState.errors.categoryId?.message}>
              <select
                {...form.register('categoryId')}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select active category</option>
                {categories
                  .filter((item) => item.isActive || item.id === service?.categoryId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {!item.isActive ? ' (inactive)' : ''}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField
              label={`Selling price (${currencyCode})`}
              error={form.formState.errors.sellingPriceBase?.message}
            >
              <Input
                type="number"
                min="0"
                step="0.0001"
                {...form.register('sellingPriceBase', { valueAsNumber: true })}
              />
            </FormField>
            <FormField
              label="Duration (minutes)"
              error={form.formState.errors.durationMinutes?.message}
            >
              <Input
                type="number"
                min="1"
                max="1440"
                {...form.register('durationMinutes', { valueAsNumber: true })}
              />
            </FormField>
          </div>

          <FormField
            label="Revenue account"
            error={form.formState.errors.revenueAccountId?.message}
          >
            <select
              {...form.register('revenueAccountId')}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Select active Revenue posting account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} — {account.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Description" error={form.formState.errors.description?.message}>
            <Textarea rows={3} {...form.register('description')} />
          </FormField>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            Active
          </label>

          {saveService.isError && (
            <p className="text-sm text-destructive">{saveService.error.message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveService.isPending}>
              {saveService.isPending && <Loader2 className="size-4 animate-spin" />}
              {service ? 'Save changes' : 'Add service'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const categoryDefaults: ServiceCategoryInput = { name: '', isActive: true }

function ServiceCategoryDialog({
  open,
  onOpenChange,
  category,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: ServiceCategory | null
}) {
  const saveCategory = useSaveServiceCategory(category?.id ?? null)
  const form = useForm<ServiceCategoryInput>({
    resolver: zodResolver(serviceCategorySchema),
    defaultValues: categoryDefaults,
  })

  useEffect(() => {
    if (!open) return
    form.reset(category ? { name: category.name, isActive: category.isActive } : categoryDefaults)
  }, [category, form, open])

  const close = () => {
    saveCategory.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? `Edit ${category.name}` : 'Add service category'}</DialogTitle>
          <DialogDescription>
            Categories are flat operational groupings for organizing salon services.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveCategory.mutate(values, { onSuccess: close }))}
        >
          <FormField label="Name" error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} autoFocus />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            Active
          </label>
          {saveCategory.isError && (
            <p className="text-sm text-destructive">{saveCategory.error.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={saveCategory.isPending}>
              {saveCategory.isPending && <Loader2 className="size-4 animate-spin" />}
              {category ? 'Save changes' : 'Add category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  )
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={
        active
          ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center text-sm text-slate-500">
        <Loader2 className="mx-auto mb-2 size-6 animate-spin text-primary" />
        Loading…
      </TableCell>
    </TableRow>
  )
}

function EmptyRow({
  colSpan,
  label,
  onClick,
}: {
  colSpan: number
  label: string
  onClick?: () => void
}) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <p className="mb-3 text-sm text-slate-500">{label}</p>
        {onClick && (
          <Button size="sm" onClick={onClick}>
            <Plus className="size-4" />
            Add record
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return `${hours} hr`
  return `${hours} hr ${remaining} min`
}

const tableHeadClass =
  'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
