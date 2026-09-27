import { useEffect, useMemo, useRef, type FormEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Store } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useOpenPosSession } from '../hooks/usePos'
import { posOpenSessionSchema } from '../schemas/pos.schema'
import type { PosOpenSessionValues } from '../schemas/pos.schema'
import type { PosBranch, PosRegister, PosSession, PosSetup } from '../types/pos.types'

export function OpenSessionScreen({
  setup,
  branch,
  registers,
  cashier,
  onExit,
  embedded = false,
  prepareWorkspaceWindow,
  onOpened,
}: {
  setup: PosSetup
  branch: PosBranch | undefined
  registers: PosRegister[]
  cashier: string
  onExit: () => void
  embedded?: boolean
  prepareWorkspaceWindow?: () => Window | null
  onOpened?: (session: PosSession, workspace: Window | null) => void
}) {
  const openSession = useOpenPosSession()
  const preparedWorkspace = useRef<Window | null>(null)

  useEffect(() => () => {
    preparedWorkspace.current?.close()
  }, [])

  const activeRegisters = useMemo(
    () => registers.filter((register) => register.isActive),
    [registers]
  )
  const availableRegisters = useMemo(
    () => activeRegisters.filter((register) => !register.hasOpenSession),
    [activeRegisters]
  )
  const initialRegister = availableRegisters[0]

  const form = useForm<PosOpenSessionValues>({
    resolver: zodResolver(posOpenSessionSchema),
    defaultValues: {
      registerId: availableRegisters[0]?.id ?? '',
      openingCounts: initialRegister?.cashboxes.map((cashbox) => ({ moneyAccountId: cashbox.moneyAccountId, amount: 0 })) ?? [],
      notes: '',
    },
  })
  const registerId = useWatch({ control: form.control, name: 'registerId' })
  const selectedRegister = useMemo(
    () => availableRegisters.find((register) => register.id === registerId),
    [availableRegisters, registerId],
  )
  const selectedCashboxes = useMemo(() => selectedRegister?.cashboxes ?? [], [selectedRegister])
  const unavailableCashboxes = selectedCashboxes.filter((cashbox) => {
    const account = setup.moneyAccounts.find((item) => item.id === cashbox.moneyAccountId)
    return !account || account.currentExchangeRate === null
  })
  const lastRegisterId = useRef(initialRegister?.id ?? '')

  useEffect(() => {
    if (registerId === lastRegisterId.current) return
    lastRegisterId.current = registerId
    form.setValue('openingCounts', selectedCashboxes.map((cashbox) => ({
      moneyAccountId: cashbox.moneyAccountId,
      amount: 0,
    })))
    form.clearErrors('openingCounts')
  }, [form, registerId, selectedCashboxes])

  const submit = (event: FormEvent<HTMLFormElement>) => {
    void form.handleSubmit((values) => {
      const workspace = preparedWorkspace.current
      preparedWorkspace.current = null
      openSession.mutate({
        registerId: values.registerId,
        openingCounts: values.openingCounts,
        notes: values.notes.trim() || null,
      }, {
        onSuccess: (session) => onOpened?.(session, workspace),
        onError: () => workspace?.close(),
      })
    }, () => {
      preparedWorkspace.current?.close()
      preparedWorkspace.current = null
    })(event)
  }

  const prepareWorkspace = () => {
    if (!prepareWorkspaceWindow) return
    preparedWorkspace.current?.close()
    preparedWorkspace.current = prepareWorkspaceWindow()
  }

  return (
    <div className={embedded ? 'w-full' : 'min-h-screen bg-muted/20 p-4 sm:grid sm:place-items-center sm:p-6'}>
      <div className={embedded ? 'w-full bg-card' : 'mx-auto w-full max-w-xl rounded-2xl border bg-card shadow-sm'}>
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
              {availableRegisters.map((register) => (
                <option key={register.id} value={register.id}>{register.code} — {register.name}</option>
              ))}
            </select>
            {form.formState.errors.registerId?.message && (
              <span className="text-xs font-normal text-destructive">{form.formState.errors.registerId.message}</span>
            )}
          </label>

          {availableRegisters.length === 0 && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
              {activeRegisters.length === 0
                ? 'No active POS Register exists for this branch. A Manager, Owner, or SuperAdmin must create one first.'
                : 'All active POS Registers are currently in use. Close an open session before starting another one on those registers.'}
            </p>
          )}

          <div>
            <div className="mb-2">
              <h2 className="font-semibold">Opening cash</h2>
              <p className="text-xs text-muted-foreground">Count each physical Cashbox currency separately.</p>
            </div>
            <div className="space-y-2">
              {unavailableCashboxes.length > 0 && (
                <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/20 dark:text-amber-100">
                  {unavailableCashboxes.map((cashbox) => cashbox.moneyAccountCode).join(', ')} cannot open because cashier access or an effective rate to {setup.baseCurrencyCode} is missing.
                </p>
              )}
              {selectedCashboxes.length === 0 ? (
                <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                  This Register has no configured Cashboxes. A Manager, Owner, or SuperAdmin must correct its configuration before opening a session.
                </p>
              ) : selectedCashboxes.map((cashbox, index) => (
                <label key={cashbox.moneyAccountId} className="grid grid-cols-[minmax(130px,1fr)_1fr] items-center gap-3 rounded-xl border p-3">
                  <span>
                    <span className="block font-mono text-sm font-semibold">{cashbox.currencyCode} · {cashbox.moneyAccountCode}</span>
                    <span className="block text-xs text-muted-foreground">{cashbox.moneyAccountName}</span>
                  </span>
                  <span>
                    <input type="hidden" {...form.register(`openingCounts.${index}.moneyAccountId`)} />
                    <Input
                      aria-label={`${cashbox.moneyAccountCode} opening physical count`}
                      type="number"
                      min="0"
                      step={displayQuantum(cashbox.currencyDecimalPlaces)}
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
              <ArrowLeft className="size-4" /> Back to Sessions
            </Button>
            <Button
              type="submit"
              disabled={availableRegisters.length === 0 || selectedCashboxes.length === 0
                || unavailableCashboxes.length > 0 || openSession.isPending}
              onClick={prepareWorkspace}
            >
              {openSession.isPending ? 'Opening…' : 'Open Session'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

const displayQuantum = (decimalPlaces: number) => 10 ** -Math.max(0, Math.min(decimalPlaces, 4))

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/50 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}
