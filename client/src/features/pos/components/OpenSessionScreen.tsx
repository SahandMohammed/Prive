import { useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Store } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { MoneyAccountType } from '@/features/finance'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOpenPosSession } from '../hooks/usePos'
import { posOpenSessionSchema } from '../schemas/pos.schema'
import type { PosOpenSessionValues } from '../schemas/pos.schema'
import type { PosBranch, PosRegister, PosSetup } from '../types/pos.types'

export function OpenSessionScreen({
  setup,
  branch,
  registers,
  cashier,
  onExit,
}: {
  setup: PosSetup
  branch: PosBranch | undefined
  registers: PosRegister[]
  cashier: string
  onExit: () => void
}) {
  const openSession = useOpenPosSession()
  const activeRegisters = useMemo(
    () => registers.filter((register) => register.isActive),
    [registers]
  )
  const cashCurrencies = useMemo(() => {
    const rows = setup.moneyAccounts
      .filter((account) => account.type === MoneyAccountType.Cashbox)
      .map((account) => ({ id: account.currencyId, code: account.currencyCode }))
    return [...new Map(rows.map((row) => [row.id, row])).values()].sort((a, b) => a.code.localeCompare(b.code))
  }, [setup.moneyAccounts])

  const form = useForm<PosOpenSessionValues>({
    resolver: zodResolver(posOpenSessionSchema),
    defaultValues: {
      registerId: activeRegisters[0]?.id ?? '',
      openingCounts: cashCurrencies.map((currency) => ({ currencyId: currency.id, amount: 0 })),
      notes: '',
    },
  })

  const submit = form.handleSubmit((values) => {
    openSession.mutate({
      registerId: values.registerId,
      openingCounts: values.openingCounts,
      notes: values.notes.trim() || null,
    })
  })

  return (
    <div className="min-h-screen bg-muted/20 p-4 sm:grid sm:place-items-center sm:p-6">
      <div className="mx-auto w-full max-w-xl rounded-2xl border bg-card shadow-sm">
        <div className="flex items-center gap-3 border-b p-5">
          <div className="grid size-10 place-items-center rounded-xl bg-foreground text-background">
            <Store className="size-4" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Open POS Session</h1>
            <p className="text-sm text-muted-foreground">Count the physical opening drawer before selling.</p>
          </div>
        </div>

        <form className="space-y-5 p-5" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <ReadOnly label="Branch" value={branch ? `${branch.code} — ${branch.name}` : 'Selected branch'} />
            <ReadOnly label="Cashier" value={cashier} />
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Register
            <select
              {...form.register('registerId')}
              className="h-10 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Select register</option>
              {activeRegisters.map((register) => (
                <option key={register.id} value={register.id}>{register.code} — {register.name}</option>
              ))}
            </select>
            {form.formState.errors.registerId?.message && (
              <span className="text-xs font-normal text-destructive">{form.formState.errors.registerId.message}</span>
            )}
          </label>

          {activeRegisters.length === 0 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              No active POS Register exists for this branch. A Manager, Owner, or SuperAdmin must create one first.
            </p>
          )}

          <div>
            <div className="mb-2">
              <h2 className="font-semibold">Opening cash</h2>
              <p className="text-xs text-muted-foreground">Count each physical Cashbox currency separately.</p>
            </div>
            <div className="space-y-2">
              {cashCurrencies.length === 0 ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  No operable Cashbox Money Account is assigned to this cashier. The session can open with no physical drawer currencies, but cash tender will not be available until Finance access is configured.
                </p>
              ) : cashCurrencies.map((currency, index) => (
                <label key={currency.id} className="grid grid-cols-[90px_1fr] items-center gap-3 rounded-xl border p-3">
                  <span className="font-mono text-sm font-semibold">{currency.code}</span>
                  <span>
                    <input type="hidden" {...form.register(`openingCounts.${index}.currencyId`)} />
                    <Input
                      type="number"
                      min="0"
                      step="0.0001"
                      {...form.register(`openingCounts.${index}.amount`, { valueAsNumber: true })}
                    />
                    {form.formState.errors.openingCounts?.[index]?.amount?.message && (
                      <span className="mt-1 block text-xs font-normal text-destructive">
                        {form.formState.errors.openingCounts[index]?.amount?.message}
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="grid gap-1.5 text-sm font-medium">
            Opening notes <span className="font-normal text-muted-foreground">optional</span>
            <textarea
              {...form.register('notes')}
              rows={3}
              maxLength={500}
              className="resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            {form.formState.errors.notes?.message && (
              <span className="text-xs font-normal text-destructive">{form.formState.errors.notes.message}</span>
            )}
          </label>

          {openSession.error && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{openSession.error.message}</p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <Button type="button" variant="outline" onClick={onExit}>
              <ArrowLeft className="size-4" /> Exit POS
            </Button>
            <Button type="submit" disabled={activeRegisters.length === 0 || openSession.isPending}>
              {openSession.isPending ? 'Opening…' : 'Open Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
