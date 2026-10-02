import { useEffect, useMemo, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  Coins,
  Download,
  History,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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
import { formatDate, formatDateTime, formatNumber } from '@/lib/i18n'
import { useCurrentUser } from '@/features/auth'
import { useCurrencies, useCurrentBusiness } from '@/features/business'
import { useExchangeRateActions, useExchangeRates } from '../hooks/useFinance'
import { exchangeRateSchema } from '../schemas/finance.schema'
import type { ExchangeRateInput } from '../types/finance.types'

const localNow = () => {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

export function ExchangeRatesPage() {
  const { t } = useTranslation(['finance', 'common'])
  const current = useCurrentUser().data
  const admin = Boolean(current && ['SuperAdmin', 'Manager', 'Owner'].includes(current.role))
  const business = useCurrentBusiness().data
  const currenciesQuery = useCurrencies()
  const currencies = useMemo(
    () => currenciesQuery.data?.data.filter((c) => c.isActive) ?? [],
    [currenciesQuery.data]
  )
  const baseCurrencyId = business?.baseCurrencyId ?? ''
  const baseCurrencyCode = business?.baseCurrencyCode ?? 'IQD'

  const [search, setSearch] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const query = useExchangeRates({ page: 1, pageSize: 200 })
  const actions = useExchangeRateActions()
  const allRates = useMemo(() => query.data?.data ?? [], [query.data?.data])

  // Filter rates
  const filteredRates = useMemo(() => {
    return allRates.filter((rate) => {
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchPair = `${rate.fromCurrencyCode} ${rate.toCurrencyCode}`.toLowerCase().includes(term)
        const matchUser = rate.createdByUsername?.toLowerCase().includes(term)
        if (!matchPair && !matchUser) return false
      }
      if (currencyFilter) {
        if (rate.fromCurrencyId !== currencyFilter && rate.toCurrencyId !== currencyFilter) {
          return false
        }
      }
      if (statusFilter === 'active' && !rate.isActive) return false
      if (statusFilter === 'inactive' && rate.isActive) return false
      return true
    })
  }, [allRates, search, currencyFilter, statusFilter])

  const totalCount = filteredRates.length
  const paginatedRates = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredRates.slice(start, start + pageSize)
  }, [filteredRates, page, pageSize])

  // Active rate cards (most recent active rate for each foreign currency)
  const activeRateSummaries = useMemo(() => {
    const foreignCurrencies = currencies.filter((c) => c.id !== baseCurrencyId)
    return foreignCurrencies.map((fc) => {
      const activeRate = allRates.find(
        (r) => r.isActive
          && r.fromCurrencyId === fc.id
          && r.toCurrencyId === baseCurrencyId
          && new Date(r.effectiveAtUtc).getTime() <= Date.now()
      )
      return {
        currency: fc,
        rate: activeRate,
      }
    })
  }, [currencies, baseCurrencyId, allRates])

  const handleClearFilters = () => {
    setSearch('')
    setCurrencyFilter('')
    setStatusFilter('all')
    setPage(1)
  }

  const handleExportCsv = () => {
    if (filteredRates.length === 0) return
    const headers = [
      'From Currency',
      'To Currency',
      'Exchange Rate',
      'Effective At (UTC)',
      'Status',
      'Created By',
    ]
    const rows = filteredRates.map((r) => [
      r.fromCurrencyCode,
      r.toCurrencyCode,
      r.rate.toFixed(6),
      r.effectiveAtUtc,
      r.isActive ? 'Active' : 'Inactive',
      r.createdByUsername ?? '',
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `Exchange_Rates_${new Date().toISOString().slice(0, 10)}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const hasActiveFilters = search || currencyFilter || statusFilter !== 'all'

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('finance:exchangeRatesPage.title')}
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
              <Coins className="size-3.5" />
              {t('finance:exchangeRatesPage.badge')}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            {t('finance:exchangeRatesPage.description')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shadow-xs"
            onClick={handleExportCsv}
            disabled={filteredRates.length === 0}
          >
            <Download className="size-3.5" />
            {t('finance:exchangeRatesPage.exportCsv')}
          </Button>
          {admin && (
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => setIsDialogOpen(true)}
            >
              <Plus className="size-4 stroke-[2.5]" />
              {t('finance:exchangeRatesPage.addRate')}
            </Button>
          )}
        </div>
      </div>

      {/* ACTIVE RATES QUICK-VIEW CARDS */}
      {activeRateSummaries.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {activeRateSummaries.map(({ currency, rate }) => (
            <Card
              key={currency.id}
              className="border-slate-200 bg-white transition-all hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-slate-100 font-mono text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                      {currency.symbol || currency.code}
                    </span>
                    <div>
                      <p className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        {currency.code} / {baseCurrencyCode}
                      </p>
                      <p className="text-[10px] text-slate-500">{currency.name}</p>
                    </div>
                  </div>
                  <TrendingUp className="size-4 text-emerald-600" />
                </div>

                <div className="mt-3">
                  {rate ? (
                    <div>
                      <p className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                        1 {currency.code} = {formatNumber(rate.rate, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{' '}
                        <span className="text-xs font-normal text-slate-500">{baseCurrencyCode}</span>
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {t('finance:exchangeRatesPage.effective', {
                          date: formatDate(rate.effectiveAtUtc),
                        })}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-medium text-amber-600">{t('finance:exchangeRatesPage.noActiveRate')}</p>
                      {admin && (
                        <button
                          type="button"
                          onClick={() => setIsDialogOpen(true)}
                          className="mt-1 text-[11px] font-semibold text-primary hover:underline"
                        >
                          {t('finance:exchangeRatesPage.setInitialRate')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* FILTER CONTROLS TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder={t('finance:exchangeRatesPage.searchPlaceholder')}
              className="h-9 ps-9 text-xs"
            />
          </div>

          <select
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value)
              setPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="">{t('finance:exchangeRatesPage.allCurrencies')}</option>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              setPage(1)
            }}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="all">{t('finance:exchangeRatesPage.allStatuses')}</option>
            <option value="active">{t('finance:exchangeRatesPage.activeOnly')}</option>
            <option value="inactive">{t('finance:exchangeRatesPage.inactiveOnly')}</option>
          </select>

          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              {t('finance:exchangeRatesPage.rateRecordsCount', { count: totalCount })}
            </p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                className="h-9 gap-1.5 text-xs text-slate-600"
                onClick={handleClearFilters}
              >
                <RotateCcw className="size-3.5" />
                {t('finance:exchangeRatesPage.resetFilters')}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* RATES HISTORY DATA TABLE */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-700 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                <TableHead className="w-48 px-4 py-3 text-start">{t('finance:exchangeRatesPage.th.pair')}</TableHead>
                <TableHead className="px-4 py-3 text-end">{t('finance:exchangeRatesPage.th.rate')}</TableHead>
                <TableHead className="w-48 px-4 py-3 text-start">{t('finance:exchangeRatesPage.th.effectiveDate')}</TableHead>
                <TableHead className="w-36 px-4 py-3 text-start">{t('finance:exchangeRatesPage.th.createdBy')}</TableHead>
                <TableHead className="w-28 px-4 py-3 text-start">{t('finance:exchangeRatesPage.th.status')}</TableHead>
                {admin && <TableHead className="w-28 px-4 py-3 text-end">{t('finance:exchangeRatesPage.th.actions')}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {query.isPending ? (
                <TableRow>
                  <TableCell colSpan={admin ? 6 : 5} className="h-48 text-center text-sm text-slate-500">
                    <Loader2 className="mx-auto mb-2 size-6 animate-spin text-primary" />
                    {t('finance:exchangeRatesPage.loading')}
                  </TableCell>
                </TableRow>
              ) : query.isError ? (
                <TableRow>
                  <TableCell colSpan={admin ? 6 : 5} className="h-48 text-center text-sm text-rose-500">
                    {query.error.message}
                  </TableCell>
                </TableRow>
              ) : paginatedRates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={admin ? 6 : 5} className="h-48 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History className="size-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        {t('finance:exchangeRatesPage.empty')}
                      </p>
                      <p className="text-xs text-slate-400">
                        {t('finance:exchangeRatesPage.emptySub')}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRates.map((rate) => {
                  return (
                    <TableRow
                      key={rate.id}
                      className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                    >
                      <TableCell className="px-4 py-3.5 text-start">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                            {rate.fromCurrencyCode}
                          </span>
                          <ArrowRight className="size-3.5 text-slate-400 rtl:rotate-180" />
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                            {rate.toCurrencyCode}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-end font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        1 {rate.fromCurrencyCode} ={' '}
                        {formatNumber(rate.rate, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 6,
                        })}{' '}
                        {rate.toCurrencyCode}
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-start text-xs text-slate-700 dark:text-slate-300">
                        {formatDateTime(rate.effectiveAtUtc)}
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-start text-xs text-slate-600 dark:text-slate-400">
                        {rate.createdByUsername ?? t('finance:exchangeRatesPage.systemUser')}
                      </TableCell>

                      <TableCell className="px-4 py-3.5 text-start">
                        <span
                          className={`inline-flex rounded px-2 py-0.5 text-[11px] font-semibold ${
                            rate.isActive
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {rate.isActive ? t('finance:exchangeRatesPage.active') : t('finance:exchangeRatesPage.inactive')}
                        </span>
                      </TableCell>

                      {admin && (
                        <TableCell className="px-4 py-3.5 text-end">
                          {rate.isActive && (
                            <Button
                              variant="outline"
                              size="xs"
                              className="text-xs text-slate-600 hover:border-red-200 hover:text-red-600"
                              disabled={actions.deactivate.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    t('finance:exchangeRatesPage.deactivateConfirm', {
                                      from: rate.fromCurrencyCode,
                                      rate: formatNumber(rate.rate, { minimumFractionDigits: 2, maximumFractionDigits: 6 }),
                                      to: rate.toCurrencyCode,
                                    })
                                  )
                                ) {
                                  actions.deactivate.mutate(rate.id)
                                }
                              }}
                            >
                              {t('finance:exchangeRatesPage.deactivate')}
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      {/* PAGINATION */}
      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalCount}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPage(1)
        }}
      />

      {/* CREATE RATE DIALOG */}
      <AddRateDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        currencies={currencies}
        baseCurrencyId={baseCurrencyId}
        baseCurrencyCode={baseCurrencyCode}
      />
    </div>
  )
}

function AddRateDialog({
  open,
  onOpenChange,
  currencies,
  baseCurrencyId,
  baseCurrencyCode,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currencies: { id: string; code: string; name: string; symbol: string }[]
  baseCurrencyId: string
  baseCurrencyCode: string
}) {
  const { t } = useTranslation(['finance', 'common'])
  const actions = useExchangeRateActions()

  const defaultFromCurrencyId = useMemo(() => {
    const foreign = currencies.find((c) => c.code === 'USD' && c.id !== baseCurrencyId)
      ?? currencies.find((c) => c.id !== baseCurrencyId)
    return foreign?.id ?? ''
  }, [currencies, baseCurrencyId])

  const form = useForm<ExchangeRateInput>({
    resolver: zodResolver(exchangeRateSchema),
    defaultValues: {
      fromCurrencyId: defaultFromCurrencyId,
      toCurrencyId: baseCurrencyId,
      rate: 0,
      effectiveAtUtc: localNow(),
    },
  })

  const fromCurrencyId = useWatch({ control: form.control, name: 'fromCurrencyId' })
  const toCurrencyId = useWatch({ control: form.control, name: 'toCurrencyId' })
  const rateValue = useWatch({ control: form.control, name: 'rate' })

  const fromCurrObj = currencies.find((c) => c.id === fromCurrencyId)
  const toCurrObj = currencies.find((c) => c.id === toCurrencyId)

  useEffect(() => {
    if (open) {
      form.reset({
        fromCurrencyId: defaultFromCurrencyId,
        toCurrencyId: baseCurrencyId,
        rate: 0,
        effectiveAtUtc: localNow(),
      })
    }
  }, [open, form, defaultFromCurrencyId, baseCurrencyId])

  const close = () => {
    form.reset()
    onOpenChange(false)
  }

  const submit = form.handleSubmit((values) => {
    actions.create.mutate(
      {
        ...values,
        effectiveAtUtc: new Date(values.effectiveAtUtc).toISOString(),
      },
      {
        onSuccess: close,
      }
    )
  })

  const numericRate = Number(rateValue) || 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('finance:exchangeRatesPage.dialog.title')}</DialogTitle>
          <DialogDescription>
            {t('finance:exchangeRatesPage.dialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label={t('finance:exchangeRatesPage.dialog.fromCurrency')} error={form.formState.errors.fromCurrencyId?.message}>
              <select
                {...form.register('fromCurrencyId')}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">{t('finance:exchangeRatesPage.dialog.selectSource')}</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label={t('finance:exchangeRatesPage.dialog.toCurrency')} error={form.formState.errors.toCurrencyId?.message}>
              <select
                {...form.register('toCurrencyId')}
                className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
              >
                <option value="">{t('finance:exchangeRatesPage.dialog.selectTarget')}</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} — {c.name} {c.id === baseCurrencyId ? t('finance:exchangeRatesPage.dialog.baseTag') : ''}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField
            label={t('finance:exchangeRatesPage.dialog.rateLabel', {
              from: fromCurrObj?.code ?? '—',
              to: toCurrObj?.code ?? baseCurrencyCode,
            })}
            error={form.formState.errors.rate?.message}
          >
            <Input
              type="number"
              min="0.000001"
              step="0.000001"
              placeholder={t('finance:exchangeRatesPage.dialog.ratePlaceholder')}
              className="h-9 font-mono text-sm"
              {...form.register('rate', { valueAsNumber: true })}
            />
          </FormField>

          {/* Conversion Preview Pill */}
          {fromCurrObj && toCurrObj && numericRate > 0 && (
            <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-xs dark:border-indigo-950 dark:bg-indigo-950/20">
              <p className="font-semibold text-indigo-900 dark:text-indigo-200">
                {t('finance:exchangeRatesPage.dialog.preview')}
              </p>
              <div className="mt-1 flex flex-col gap-1 font-mono text-slate-700 dark:text-slate-300">
                <p>
                  1 {fromCurrObj.code} = <strong>{formatNumber(numericRate)}</strong> {toCurrObj.code}
                </p>
              </div>
            </div>
          )}

          {fromCurrObj && toCurrObj && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              {t('finance:exchangeRatesPage.dialog.guidance', {
                to: toCurrObj.code,
                from: fromCurrObj.code,
                base: baseCurrencyCode,
              })}
            </p>
          )}

          <FormField
            label={t('finance:exchangeRatesPage.dialog.effectiveAt')}
            error={form.formState.errors.effectiveAtUtc?.message}
          >
            <Input type="datetime-local" className="h-9 text-xs" {...form.register('effectiveAtUtc')} />
          </FormField>

          {actions.create.isError && (
            <p className="text-xs text-destructive">{actions.create.error.message}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={actions.create.isPending}
            >
              {actions.create.isPending && <Loader2 className="size-4 animate-spin" />}
              {t('finance:exchangeRatesPage.dialog.saveRate')}
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
    <label className="block space-y-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      {children}
      {error && <span className="text-[11px] font-normal text-destructive">{error}</span>}
    </label>
  )
}
