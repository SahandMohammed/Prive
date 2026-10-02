import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
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
import { formatNumber } from '@/lib/i18n'
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

export function ServiceDefinitionsPage() {
  const { t } = useTranslation(['sales', 'common'])
  const [activeTab, setActiveTab] = useState<ServiceDefinitionTab>('services')

  const tabs: { id: ServiceDefinitionTab; label: string }[] = useMemo(
    () => [
      { id: 'services', label: t('sales:services.servicesTab') },
      { id: 'categories', label: t('sales:services.categoriesTab') },
    ],
    [t]
  )

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('sales:services.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('sales:services.subtitle')}
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
  const { t } = useTranslation(['sales', 'common'])
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
    if (window.confirm(t('sales:services.deleteServicePrompt', { name: service.name }))) {
      remove.mutate(service.id)
    }
  }

  const money = (value: number) =>
    `${formatNumber(value, { maximumFractionDigits: business?.baseCurrencyDecimalPlaces ?? 2 })} ${business?.baseCurrencySymbol ?? business?.baseCurrencyCode ?? ''}`

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('sales:services.servicesTab')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('sales:services.servicesSectionSubtitle')}
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          {t('sales:services.addService')}
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            placeholder={t('sales:services.searchServicesPlaceholder')}
            className="ps-9"
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
          <option value="">{t('sales:services.allCategories')}</option>
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
          <option value="">{t('sales:services.allStatuses')}</option>
          <option value="true">{t('sales:services.active')}</option>
          <option value="false">{t('sales:services.inactive')}</option>
        </select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={tableHeadClass}>
                <TableHead className="px-4">{t('sales:services.name')}</TableHead>
                <TableHead className="px-4">{t('sales:services.category')}</TableHead>
                <TableHead className="px-4 text-end">{t('sales:services.price')}</TableHead>
                <TableHead className="px-4">{t('sales:services.duration')}</TableHead>
                <TableHead className="px-4">{t('sales:services.revenueAccount')}</TableHead>
                <TableHead className="px-4">{t('sales:services.active')}</TableHead>
                <TableHead className="w-24 px-4 text-end">{t('sales:table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servicesQuery.isPending ? (
                <LoadingRow colSpan={7} />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={7} label={t('sales:services.noServicesFound')} onClick={openCreate} />
              ) : (
                rows.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="px-4 py-3.5">
                      <p className="font-medium">{service.name}</p>
                      <p className="max-w-64 truncate text-xs text-muted-foreground">
                        {service.description ?? t('sales:services.noDescription')}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">{service.categoryName}</TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono">
                      {money(service.sellingPriceBase)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      {formatDuration(service.durationMinutes, t)}
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <p className="font-mono text-xs text-muted-foreground">{service.revenueAccountCode}</p>
                      <p className="text-sm">{service.revenueAccountName}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <StatusBadge active={service.isActive} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('sales:services.editService')}
                        onClick={() => openEdit(service)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('sales:services.deleteService')}
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
  const { t } = useTranslation(['sales', 'common'])
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
    if (window.confirm(t('sales:services.deleteCategoryPrompt', { name: category.name }))) {
      remove.mutate(category.id)
    }
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('sales:services.categoryTitle')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('sales:services.categorySubtitle')}
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={openCreate}
        >
          <Plus className="size-4" />
          {t('sales:services.addCategory')}
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-3 sm:flex-row">
        <div className="relative w-full sm:w-80">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              resetPage()
            }}
            placeholder={t('sales:services.searchCategoriesPlaceholder')}
            className="h-10 rounded-lg border-slate-200 bg-white ps-9 shadow-xs dark:border-slate-800 dark:bg-slate-900"
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
          <option value="">{t('sales:services.allStatuses')}</option>
          <option value="true">{t('sales:services.active')}</option>
          <option value="false">{t('sales:services.inactive')}</option>
        </select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={tableHeadClass}>
                <TableHead className="px-4">{t('sales:services.category')}</TableHead>
                <TableHead className="px-4">{t('sales:services.active')}</TableHead>
                <TableHead className="w-24 px-4 text-end">{t('sales:table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesQuery.isPending ? (
                <LoadingRow colSpan={3} />
              ) : rows.length === 0 ? (
                <EmptyRow colSpan={3} label={t('sales:services.noCategoriesFound')} onClick={openCreate} />
              ) : (
                rows.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="px-4 py-3.5 font-medium">{category.name}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <StatusBadge active={category.isActive} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('sales:services.editCategoryTitle', { name: category.name })}
                        onClick={() => openEdit(category)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={t('sales:services.deleteCategory')}
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

  const { t } = useTranslation(['sales', 'common'])

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{service ? t('sales:services.editServiceTitle', { name: service.name }) : t('sales:services.addServiceTitle')}</DialogTitle>
          <DialogDescription>
            {t('sales:services.serviceDialogDesc')}
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
            <FormField label={t('sales:services.name')} error={form.formState.errors.name?.message}>
              <Input {...form.register('name')} autoFocus />
            </FormField>
            <FormField label={t('sales:services.category')} error={form.formState.errors.categoryId?.message}>
              <select
                {...form.register('categoryId')}
                className="h-9 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="">{t('sales:services.selectActiveCategory')}</option>
                {categories
                  .filter((item) => item.isActive || item.id === service?.categoryId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {!item.isActive ? ` ${t('sales:createInvoicePage.inactive')}` : ''}
                    </option>
                  ))}
              </select>
            </FormField>
            <FormField
              label={t('sales:services.sellingPrice', { currency: currencyCode })}
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
              label={t('sales:services.durationMinutes')}
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
            label={t('sales:services.revenueAccount')}
            error={form.formState.errors.revenueAccountId?.message}
          >
            <select
              {...form.register('revenueAccountId')}
              className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">{t('sales:services.selectRevenueAccount')}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} — {account.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label={t('sales:services.description')} error={form.formState.errors.description?.message}>
            <Textarea rows={3} {...form.register('description')} />
          </FormField>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            {t('sales:services.active')}
          </label>

          {saveService.isError && (
            <p className="text-sm text-destructive">{saveService.error.message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={saveService.isPending}>
              {saveService.isPending && <Loader2 className="size-4 animate-spin" />}
              {service ? t('sales:services.saveChanges') : t('sales:services.addService')}
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
  const { t } = useTranslation(['sales', 'common'])
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
          <DialogTitle>{category ? t('sales:services.editCategoryTitle', { name: category.name }) : t('sales:services.addCategoryTitle')}</DialogTitle>
          <DialogDescription>
            {t('sales:services.categoryDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit((values) => saveCategory.mutate(values, { onSuccess: close }))}
        >
          <FormField label={t('sales:services.category')} error={form.formState.errors.name?.message}>
            <Input {...form.register('name')} autoFocus />
          </FormField>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('isActive')} />
            {t('sales:services.active')}
          </label>
          {saveCategory.isError && (
            <p className="text-sm text-destructive">{saveCategory.error.message}</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t('common:actions.cancel')}
            </Button>
            <Button type="submit" disabled={saveCategory.isPending}>
              {saveCategory.isPending && <Loader2 className="size-4 animate-spin" />}
              {category ? t('sales:services.saveChanges') : t('sales:services.addCategory')}
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
  const { t } = useTranslation(['sales', 'common'])
  return (
    <span
      className={
        active
          ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'
          : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }
    >
      {active ? t('sales:services.active') : t('sales:services.inactive')}
    </span>
  )
}

function LoadingRow({ colSpan }: { colSpan: number }) {
  const { t } = useTranslation(['common'])
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center text-sm text-slate-500">
        <Loader2 className="mx-auto mb-2 size-6 animate-spin text-primary" />
        {t('common:status.loading', 'Loading…')}
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
  const { t } = useTranslation(['sales', 'common'])
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-48 text-center">
        <p className="mb-3 text-sm text-slate-500">{label}</p>
        {onClick && (
          <Button size="sm" onClick={onClick}>
            <Plus className="size-4" />
            {t('sales:services.addRecord')}
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

function formatDuration(minutes: number, t: TFunction) {
  if (minutes < 60) return t('sales:services.minutes', { count: minutes })
  const hours = Math.floor(minutes / 60)
  const remaining = minutes % 60
  if (remaining === 0) return t('sales:services.hours', { count: hours })
  return t('sales:services.hoursAndMinutes', { hours, minutes: remaining })
}

const tableHeadClass =
  'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
