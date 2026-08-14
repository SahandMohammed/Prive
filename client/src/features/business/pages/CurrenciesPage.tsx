import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Coins, Loader2, Pencil, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { currencySchema, type CurrencyFormValues } from '../schemas/business.schemas'
import { useCurrencies, useSaveCurrency } from '../hooks/useBusiness'
import type { Currency, CurrencyInput } from '../types/business.types'

const defaults: CurrencyFormValues = { code: '', name: '', symbol: '', decimalPlaces: 2, isActive: true }

export function CurrenciesPage() {
  const currenciesQuery = useCurrencies()
  const [editing, setEditing] = useState<Currency | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const form = useForm<CurrencyFormValues, unknown, CurrencyInput>({ resolver: zodResolver(currencySchema), defaultValues: defaults })
  const saveCurrency = useSaveCurrency(editing?.id ?? null)

  useEffect(() => { form.reset(editing ?? defaults) }, [editing, form])

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditing(null)
  }

  const openCreateDialog = () => {
    setEditing(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (currency: Currency) => {
    setEditing(currency)
    setIsDialogOpen(true)
  }

  const currencies = currenciesQuery.data?.data ?? []

  const filteredCurrencies = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return currencies
    return currencies.filter((c) =>
      c.name.toLowerCase().includes(term) ||
      c.code.toLowerCase().includes(term) ||
      c.symbol.toLowerCase().includes(term)
    )
  }, [currencies, search])

  const totalCurrencies = filteredCurrencies.length
  const paginatedCurrencies = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredCurrencies.slice(start, start + pageSize)
  }, [filteredCurrencies, page, pageSize])

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Currencies</h1>
          <p className="mt-1 text-sm text-slate-500">Manage currencies available to the business. Exchange rates are configured separately.</p>
        </div>
        <Button className="gap-1.5 bg-[#e05d38] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#c94f2d]" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Add currency
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            placeholder="Search currencies"
            className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        <p className="text-sm text-slate-500">{totalCurrencies} {totalCurrencies === 1 ? 'currency' : 'currencies'}</p>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Code</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Name</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Symbol</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Decimals</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="w-24 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {currenciesQuery.isLoading && <LoadingRow />}
              {currenciesQuery.isError && !currenciesQuery.isLoading && <ErrorRow />}
              {!currenciesQuery.isLoading && !currenciesQuery.isError && paginatedCurrencies.length === 0 && <EmptyRow onAdd={openCreateDialog} />}
              {!currenciesQuery.isLoading && !currenciesQuery.isError && paginatedCurrencies.map((currency) => (
                <TableRow key={currency.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <TableCell className="px-4 py-3.5 font-mono text-sm font-bold text-slate-800 dark:text-slate-200">{currency.code}</TableCell>
                  <TableCell className="px-4 py-3.5 font-medium text-slate-800 dark:text-slate-200">{currency.name}</TableCell>
                  <TableCell className="px-4 py-3.5 font-medium text-slate-600 dark:text-slate-300">{currency.symbol}</TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{currency.decimalPlaces}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    <span className={currency.isActive ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600' : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500'}>
                      {currency.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(currency)} aria-label={`Edit ${currency.code}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
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
        totalItems={totalCurrencies}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : closeDialog()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : 'Add currency'}</DialogTitle>
            <DialogDescription>Set the code, display details, precision, and availability for this currency.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => saveCurrency.mutate(values, { onSuccess: closeDialog }))} className="space-y-4">
            <Field label="Code" error={form.formState.errors.code?.message}><Input maxLength={3} className="uppercase" {...form.register('code')} /></Field>
            <Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field>
            <Field label="Symbol" error={form.formState.errors.symbol?.message}><Input {...form.register('symbol')} /></Field>
            <Field label="Decimal places" error={form.formState.errors.decimalPlaces?.message}><Input type="number" min={0} max={6} {...form.register('decimalPlaces', { valueAsNumber: true })} /></Field>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active</label>
            {saveCurrency.isError && <p className="text-sm text-destructive">{saveCurrency.error.message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saveCurrency.isPending}>Cancel</Button>
              <Button type="submit" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" disabled={saveCurrency.isPending}>{saveCurrency.isPending && <Loader2 className="size-4 animate-spin" />}{editing ? 'Save changes' : 'Add currency'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label>
}

function LoadingRow() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-48 text-center text-sm text-slate-500">
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#e05d38]" />
          <span>Loading currencies...</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function ErrorRow() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-48 text-center">
        <div className="flex flex-col items-center text-red-500">
          <AlertCircle className="mb-2 h-8 w-8" />
          <p className="text-sm font-medium">Failed to load currencies</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EmptyRow({ onAdd }: { onAdd: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-56 text-center">
        <div className="flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
            <Coins className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">No currencies found</p>
            <p className="mt-1 text-sm text-slate-500">Create your first currency to get started.</p>
          </div>
          <Button size="sm" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add currency
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
