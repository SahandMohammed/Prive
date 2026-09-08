import { useEffect, useMemo, type ReactNode, type SelectHTMLAttributes } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SalesLineType } from '@/features/sales'
import { useCompletePosSale } from '../hooks/usePos'
import { posCheckoutSchema } from '../schemas/pos.schema'
import type { PosCheckoutValues } from '../schemas/pos.schema'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCartLine, PosSale, PosSetup } from '../types/pos.types'

export function CheckoutDialog({
  open,
  setup,
  branchId,
  sessionId,
  warehouseId,
  customerId,
  cart,
  onOpenChange,
  onCompleted,
}: {
  open: boolean
  setup: PosSetup
  branchId: string
  sessionId: string
  warehouseId: string
  customerId: string | null
  cart: PosCartLine[]
  onOpenChange: (open: boolean) => void
  onCompleted: (sale: PosSale) => void
}) {
  const total = cart.reduce((sum, line) => sum + line.unitPriceBase * line.quantity, 0)
  const complete = useCompletePosSale()
  const resetComplete = complete.reset
  const accounts = useMemo(
    () => setup.moneyAccounts.filter((account) => account.branchId === branchId),
    [branchId, setup.moneyAccounts]
  )
  const baseAccount = accounts.find(
    (account) => account.currencyId === setup.baseCurrencyId && account.currentExchangeRate === 1
  )
  const defaultAccount = baseAccount ?? accounts[0]
  const form = useForm<PosCheckoutValues>({
    resolver: zodResolver(posCheckoutSchema),
    defaultValues: {
      tenders: [{ moneyAccountId: '', amount: 0 }],
      changeMoneyAccountId: '',
      changeAmount: 0,
    },
  })
  const tenderFields = useFieldArray({ control: form.control, name: 'tenders' })
  const values = useWatch({ control: form.control })

  useEffect(() => {
    if (!open) return
    form.reset({
      tenders: [
        {
          moneyAccountId: defaultAccount?.id ?? '',
          amount: defaultAccount?.currentExchangeRate
            ? round4(total / defaultAccount.currentExchangeRate)
            : 0,
        },
      ],
      changeMoneyAccountId: '',
      changeAmount: 0,
    })
    resetComplete()
  }, [defaultAccount, form, open, resetComplete, total])

  const tenderedBase = (values.tenders ?? []).reduce((sum, tender) => {
    const account = accounts.find((item) => item.id === tender?.moneyAccountId)
    return sum + (Number(tender?.amount) || 0) * (account?.currentExchangeRate ?? 0)
  }, 0)
  const remaining = round4(Math.max(total - tenderedBase, 0))
  const changeDue = round4(Math.max(tenderedBase - total, 0))
  const changeAccount = accounts.find((account) => account.id === values.changeMoneyAccountId)
  const changeBase = round4(
    (Number(values.changeAmount) || 0) * (changeAccount?.currentExchangeRate ?? 0)
  )
  const ready =
    accounts.length > 0 &&
    remaining === 0 &&
    (changeDue === 0 || (Boolean(changeAccount) && changeBase === changeDue))

  useEffect(() => {
    if (changeDue === 0) {
      form.setValue('changeAmount', 0)
      form.setValue('changeMoneyAccountId', '')
      return
    }
    if (!changeAccount?.currentExchangeRate) return
    form.setValue('changeAmount', round4(changeDue / changeAccount.currentExchangeRate), {
      shouldValidate: true,
    })
  }, [changeAccount, changeDue, form])

  const submit = form.handleSubmit((value) => {
    if (!ready) {
      form.setError('root', {
        message:
          accounts.length === 0
            ? 'No operable Money Account is available for this branch.'
            : remaining > 0
              ? `Collect ${amount(remaining)} ${setup.baseCurrencyCode} more.`
              : 'Record change that exactly resolves the excess tender.',
      })
      return
    }
    form.clearErrors('root')
    complete.mutate(
      {
        branchId,
        posSessionId: sessionId,
        warehouseId: warehouseId || null,
        customerId,
        lines: cart.map((line) => ({
          lineType:
            line.item.itemType === PosCatalogItemType.Service
              ? SalesLineType.Service
              : SalesLineType.Product,
          serviceId: line.item.itemType === PosCatalogItemType.Service ? line.item.id : null,
          productId: line.item.itemType === PosCatalogItemType.Product ? line.item.id : null,
          unitOfMeasureId:
            line.item.itemType === PosCatalogItemType.Product ? line.unitOfMeasureId : null,
          quantity: line.quantity,
          professionalUserId: line.professionalUserId || null,
        })),
        tenders: value.tenders.map((tender) => ({
          moneyAccountId: tender.moneyAccountId,
          amount: tender.amount,
        })),
        change:
          changeDue > 0
            ? { moneyAccountId: value.changeMoneyAccountId, amount: value.changeAmount }
            : null,
      },
      {
        onSuccess: (sale) => {
          onOpenChange(false)
          onCompleted(sale)
        },
      }
    )
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Checkout · {amount(total)} {setup.baseCurrencyCode}</DialogTitle>
          <DialogDescription>
            Record exactly what the customer hands over. The backend revalidates the active session, rates, account access, balances and stock before committing.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Payment</h3>
                <p className="text-xs text-muted-foreground">One or more tender lines may settle the sale.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={accounts.length === 0}
                onClick={() => tenderFields.append({ moneyAccountId: baseAccount?.id ?? accounts[0]?.id ?? '', amount: 0 })}
              >
                <Plus className="size-4" />
                Add tender
              </Button>
            </div>

            {tenderFields.fields.map((field, index) => {
              const account = accounts.find((item) => item.id === values.tenders?.[index]?.moneyAccountId)
              const baseEquivalent = round4(
                (Number(values.tenders?.[index]?.amount) || 0) * (account?.currentExchangeRate ?? 0)
              )
              return (
                <div key={field.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_170px_auto]">
                  <Field label="Money Account" error={form.formState.errors.tenders?.[index]?.moneyAccountId?.message}>
                    <Select {...form.register(`tenders.${index}.moneyAccountId`)}>
                      <option value="">Select account</option>
                      {accounts.map((item) => (
                        <option key={item.id} value={item.id} disabled={item.currentExchangeRate === null}>
                          {item.code} — {item.name} · {item.currencyCode}{item.currentExchangeRate === null ? ' · rate missing' : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={`Tendered ${account?.currencyCode ?? ''}`} error={form.formState.errors.tenders?.[index]?.amount?.message}>
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      {...form.register(`tenders.${index}.amount`, { valueAsNumber: true })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="self-end"
                    disabled={tenderFields.fields.length === 1}
                    onClick={() => tenderFields.remove(index)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                  <p className="text-xs text-muted-foreground sm:col-span-3">
                    {account
                      ? `${amount(Number(values.tenders?.[index]?.amount) || 0)} ${account.currencyCode} × ${account.currentExchangeRate ?? '—'} = ${amount(baseEquivalent)} ${setup.baseCurrencyCode}`
                      : 'Select an operable Money Account.'}
                  </p>
                </div>
              )
            })}

            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={!baseAccount}
              onClick={() => form.setValue('tenders', [{ moneyAccountId: baseAccount?.id ?? '', amount: total }], { shouldValidate: true })}
            >
              Exact cash · {amount(total)} {setup.baseCurrencyCode}
            </Button>
          </div>

          <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
            <Summary label="Sale total" value={`${amount(total)} ${setup.baseCurrencyCode}`} />
            <Summary label="Tendered" value={`${amount(tenderedBase)} ${setup.baseCurrencyCode}`} />
            <Summary
              label={remaining > 0 ? 'Remaining' : 'Change due'}
              value={`${amount(remaining > 0 ? remaining : changeDue)} ${setup.baseCurrencyCode}`}
              accent={remaining > 0 || changeDue > 0}
            />
          </div>

          {changeDue > 0 && (
            <div className="grid gap-3 rounded-xl border border-amber-300 bg-amber-50/50 p-4 sm:grid-cols-2 dark:bg-amber-950/10">
              <Field label="Return change from">
                <Select {...form.register('changeMoneyAccountId')}>
                  <option value="">Select Money Account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id} disabled={account.currentExchangeRate === null}>
                      {account.code} — {account.name} · balance {amount(account.balance)} {account.currencyCode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={`Physical change ${changeAccount?.currencyCode ?? ''}`} error={form.formState.errors.changeAmount?.message}>
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  {...form.register('changeAmount', { valueAsNumber: true })}
                />
              </Field>
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Base equivalent: {amount(changeBase)} {setup.baseCurrencyCode}. Account balance is checked again during completion.
              </p>
            </div>
          )}

          {(form.formState.errors.root?.message || complete.error) && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {form.formState.errors.root?.message ?? complete.error?.message}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Back to cart</Button>
            <Button type="submit" className="min-w-40" disabled={!ready || complete.isPending}>
              {complete.isPending ? 'Completing…' : 'Complete Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="grid content-start gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  )
}

function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`h-9 w-full rounded-md border bg-background px-3 text-sm ${className ?? ''}`} {...props} />
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${accent ? 'text-primary' : ''}`}>{value}</p>
    </div>
  )
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000
