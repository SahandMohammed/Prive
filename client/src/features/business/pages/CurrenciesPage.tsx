import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { currencySchema, type CurrencyFormValues } from '../schemas/business.schemas'
import { useCurrencies, useSaveCurrency } from '../hooks/useBusiness'
import type { Currency, CurrencyInput } from '../types/business.types'

const defaults: CurrencyFormValues = { code: '', name: '', symbol: '', decimalPlaces: 2, isActive: true }

export function CurrenciesPage() {
  const currenciesQuery = useCurrencies()
  const [editing, setEditing] = useState<Currency | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
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
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Currencies</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage currencies available to the business. Exchange rates are configured separately.</p>
        </div>
        <Button onClick={openCreateDialog}><Plus className="size-4" /> Add currency</Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {currenciesQuery.isLoading ? <Loading /> : <table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Code</th><th className="p-3">Name</th><th className="p-3">Symbol</th><th className="p-3">Decimals</th><th className="p-3">Status</th><th className="p-3" /></tr></thead><tbody>{currencies.map((currency) => <tr key={currency.id} className="border-b last:border-0"><td className="p-3 font-mono font-medium">{currency.code}</td><td className="p-3">{currency.name}</td><td className="p-3">{currency.symbol}</td><td className="p-3">{currency.decimalPlaces}</td><td className="p-3">{currency.isActive ? 'Active' : 'Inactive'}</td><td className="p-3 text-right"><Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(currency)}><Pencil className="size-4" /><span className="sr-only">Edit {currency.code}</span></Button></td></tr>)}</tbody></table>}
      </div>

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
              <Button type="submit" disabled={saveCurrency.isPending}>{saveCurrency.isPending && <Loader2 className="size-4 animate-spin" />}{editing ? 'Save changes' : 'Add currency'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label>
}

function Loading() { return <div className="flex min-h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> }
