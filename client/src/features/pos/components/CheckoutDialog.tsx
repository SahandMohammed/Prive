import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Banknote, Check, RotateCcw } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
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
import { posCartTotal } from '../lib/posCart'
import { posTenderBaseAmount, roundPosMoney } from '../lib/posMoney'
import { posCheckoutSchema } from '../schemas/pos.schema'
import type { PosCheckoutValues } from '../schemas/pos.schema'
import { PosCatalogItemType, PosPaymentMode } from '../types/pos.types'
import type {
  PosCartLine,
  PosCustomer,
  PosProfessional,
  PosSale,
  PosSession,
  PosSessionCount,
  PosSetup,
} from '../types/pos.types'

const IQD_BILLS = [250, 500, 1_000, 5_000, 10_000, 25_000, 50_000]
const USD_BILLS = [1, 5, 10, 20, 50, 100]
const POS_MONEY_QUANTUM = 0.0001

type SessionCashbox = PosSessionCount & { currentExchangeRate: number | null }

export function CheckoutDialog({
  open,
  setup,
  session,
  warehouseId,
  customer,
  professional,
  cart,
  onOpenChange,
  onBack,
  onCompleted,
}: {
  open: boolean
  setup: PosSetup
  session: PosSession
  warehouseId: string
  customer: PosCustomer | null
  professional: PosProfessional | null
  cart: PosCartLine[]
  onOpenChange: (open: boolean) => void
  onBack: () => void
  onCompleted: (sale: PosSale) => void
}) {
  const total = posCartTotal(cart)
  const complete = useCompletePosSale()
  const resetComplete = complete.reset
  const initializedForOpen = useRef(false)
  const cashboxes = useMemo<SessionCashbox[]>(() => session.openingCounts
    .map((snapshot) => ({
      ...snapshot,
      currentExchangeRate: setup.moneyAccounts.find((account) => account.id === snapshot.moneyAccountId)
        ?.currentExchangeRate ?? null,
    }))
    .sort((left, right) => {
      const leftBase = left.currencyId === setup.baseCurrencyId ? 0 : 1
      const rightBase = right.currencyId === setup.baseCurrencyId ? 0 : 1
      return leftBase - rightBase || left.currencyCode.localeCompare(right.currencyCode)
    }), [session.openingCounts, setup.baseCurrencyId, setup.moneyAccounts])
  const baseCashbox = cashboxes.find((cashbox) => cashbox.currencyId === setup.baseCurrencyId)
  const initialCashboxId = cashboxes[0]?.moneyAccountId ?? ''
  const [activeCashboxId, setActiveCashboxId] = useState(initialCashboxId)
  const form = useForm<PosCheckoutValues>({
    resolver: zodResolver(posCheckoutSchema),
    defaultValues: {
      paymentMode: PosPaymentMode.Paid,
      cashboxAmounts: Object.fromEntries(cashboxes.map((cashbox) => [cashbox.moneyAccountId, 0])),
    },
  })
  const values = useWatch({ control: form.control })
  const paymentMode = values.paymentMode ?? PosPaymentMode.Paid
  const paid = paymentMode === PosPaymentMode.Paid
  const cashboxAmounts = values.cashboxAmounts ?? {}
  const positiveCashboxes = cashboxes.filter((cashbox) => numberOrZero(cashboxAmounts[cashbox.moneyAccountId]) > 0)
  const missingRate = positiveCashboxes.find((cashbox) => cashbox.currentExchangeRate === null)
  const receivedBaseAmount = roundPosMoney(cashboxes.reduce((sum, cashbox) => sum + posTenderBaseAmount(
    numberOrZero(cashboxAmounts[cashbox.moneyAccountId]), cashbox.currentExchangeRate ?? 0,
  ), 0))
  const remaining = roundPosMoney(Math.max(total - receivedBaseAmount, 0))
  const changeDue = paid ? roundPosMoney(Math.max(receivedBaseAmount - total, 0)) : 0
  const hasCustomer = Boolean(customer)
  const ready = paid
    ? positiveCashboxes.length > 0 && !missingRate && Boolean(baseCashbox) && receivedBaseAmount >= total
    : hasCustomer
  const activeCashbox = cashboxes.find((cashbox) => cashbox.moneyAccountId === activeCashboxId)

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false
      return
    }
    if (initializedForOpen.current) return
    form.reset({
      paymentMode: PosPaymentMode.Paid,
      cashboxAmounts: Object.fromEntries(cashboxes.map((cashbox) => [cashbox.moneyAccountId, 0])),
    })
    setActiveCashboxId(initialCashboxId)
    resetComplete()
    initializedForOpen.current = true
  }, [cashboxes, form, initialCashboxId, open, resetComplete])

  const selectPaymentMode = (mode: typeof PosPaymentMode.Paid | typeof PosPaymentMode.Credit) => {
    form.setValue('paymentMode', mode, { shouldValidate: true })
    form.clearErrors('root')
    complete.reset()
  }

  const setCashboxAmount = (cashbox: SessionCashbox, next: number) => {
    const normalized = normalizeDisplayAmount(Math.max(next, 0), cashbox.currencyDecimalPlaces)
    form.setValue(`cashboxAmounts.${cashbox.moneyAccountId}`, normalized, { shouldValidate: true })
    form.clearErrors('root')
    complete.reset()
  }

  const appendDigit = (digit: string) => {
    if (!activeCashbox) return
    const current = numberOrZero(cashboxAmounts[activeCashbox.moneyAccountId])
    const nextText = current === 0 ? digit : `${current}${digit}`
    if (decimalPlaces(nextText) > activeCashbox.currencyDecimalPlaces) return
    const next = Number(nextText)
    if (Number.isFinite(next)) setCashboxAmount(activeCashbox, next)
  }

  const backspace = () => {
    if (!activeCashbox) return
    const current = numberOrZero(cashboxAmounts[activeCashbox.moneyAccountId])
    const nextText = String(current).slice(0, -1)
    setCashboxAmount(activeCashbox, nextText === '' ? 0 : Number(nextText))
  }

  const exactRemaining = () => {
    if (!activeCashbox || !activeCashbox.currentExchangeRate) return
    const otherBase = roundPosMoney(cashboxes
      .filter((cashbox) => cashbox.moneyAccountId !== activeCashbox.moneyAccountId)
      .reduce((sum, cashbox) => sum + posTenderBaseAmount(
        Math.max(numberOrZero(cashboxAmounts[cashbox.moneyAccountId]), 0),
        cashbox.currentExchangeRate ?? 0,
      ), 0))
    const remainingBase = roundPosMoney(Math.max(total - otherBase, 0))
    if (remainingBase === 0) {
      setCashboxAmount(activeCashbox, 0)
      return
    }

    let nativeAmount = roundPosMoney(remainingBase / activeCashbox.currentExchangeRate)
    while (posTenderBaseAmount(nativeAmount, activeCashbox.currentExchangeRate) < remainingBase) {
      nativeAmount = roundPosMoney(nativeAmount + POS_MONEY_QUANTUM)
    }
    nativeAmount = ceilToDisplayPrecision(nativeAmount, activeCashbox.currencyDecimalPlaces)
    const displayQuantum = quantum(activeCashbox.currencyDecimalPlaces)
    while (posTenderBaseAmount(nativeAmount, activeCashbox.currentExchangeRate) < remainingBase) {
      nativeAmount = normalizeDisplayAmount(nativeAmount + displayQuantum, activeCashbox.currencyDecimalPlaces)
    }
    setCashboxAmount(activeCashbox, nativeAmount)
  }

  const submit = form.handleSubmit((value) => {
    if (!ready) {
      form.setError('root', { message: readinessMessage({
        paid, customer, cashboxes, positiveCashboxes, missingRate, baseCashbox, remaining, setup,
      }) })
      return
    }

    form.clearErrors('root')
    complete.mutate(
      {
        branchId: session.branchId,
        posSessionId: session.id,
        warehouseId: warehouseId || null,
        customerId: customer?.id ?? null,
        lines: cart.map((line) => {
          const service = line.item.itemType === PosCatalogItemType.Service
          return {
            lineType: service ? SalesLineType.Service : SalesLineType.Product,
            serviceId: service ? line.item.id : null,
            productId: service ? null : line.item.id,
            unitOfMeasureId: service ? null : line.unitOfMeasureId,
            quantity: line.quantity,
            professionalId: service ? professional?.id ?? null : null,
          }
        }),
        tenders: paid
          ? cashboxes.flatMap((cashbox) => {
              const nativeAmount = normalizeDisplayAmount(
                numberOrZero(value.cashboxAmounts[cashbox.moneyAccountId]), cashbox.currencyDecimalPlaces,
              )
              return nativeAmount > 0 ? [{ moneyAccountId: cashbox.moneyAccountId, amount: nativeAmount }] : []
            })
          : [],
        change: paid && changeDue > 0 && baseCashbox
          ? { moneyAccountId: baseCashbox.moneyAccountId, amount: changeDue }
          : null,
        paymentMode: paid ? PosPaymentMode.Paid : PosPaymentMode.Credit,
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
      <DialogContent className="max-h-[96vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Payment</DialogTitle>
          <DialogDescription>
            Enter native amounts in this session’s Cashboxes. Exchange values shown here are previews; Save validates current rates again.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
            <Summary label="Customer" value={customer?.name ?? 'Walk-in'} />
            <Summary label="Master" value={professional?.name ?? '—'} />
            <Summary label="Sale total" value={`${amount(total)} ${setup.baseCurrencyCode}`} />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1.5">
            <PaymentModeButton active={paid} title="Paid" description="Settle now" onClick={() => selectPaymentMode(PosPaymentMode.Paid)} />
            <PaymentModeButton active={!paid} title="Unpaid" description="Collect later" onClick={() => selectPaymentMode(PosPaymentMode.Credit)} />
          </div>

          {paid ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                {cashboxes.length === 0 && (
                  <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                    This session has no Cashbox snapshot. Paid completion is unavailable.
                  </p>
                )}
                {cashboxes.map((cashbox) => {
                  const fieldName = `cashboxAmounts.${cashbox.moneyAccountId}` as const
                  const field = form.register(fieldName, { setValueAs: (input) => input === '' ? 0 : Number(input) })
                  const nativeAmount = numberOrZero(cashboxAmounts[cashbox.moneyAccountId])
                  const bills = cashbox.currencyCode === 'IQD' ? IQD_BILLS : cashbox.currencyCode === 'USD' ? USD_BILLS : []
                  const error = form.formState.errors.cashboxAmounts?.[cashbox.moneyAccountId]?.message
                  return (
                    <section
                      key={cashbox.moneyAccountId}
                      className={`space-y-3 rounded-xl border p-4 ${activeCashboxId === cashbox.moneyAccountId ? 'ring-2 ring-ring' : ''}`}
                    >
                      <Field label={`${cashbox.currencyCode} · ${cashbox.moneyAccountCode}`} error={error}>
                        <div className="relative">
                          <Input
                            aria-label={`${cashbox.currencyCode} amount`}
                            type="number"
                            min="0"
                            step={quantum(cashbox.currencyDecimalPlaces)}
                            inputMode="decimal"
                            className="h-16 pr-20 text-right font-mono text-2xl font-bold"
                            {...field}
                            onFocus={() => setActiveCashboxId(cashbox.moneyAccountId)}
                            onChange={(event) => {
                              if (decimalPlaces(event.target.value) <= cashbox.currencyDecimalPlaces) field.onChange(event)
                              form.clearErrors('root')
                              complete.reset()
                            }}
                            onBlur={(event) => {
                              field.onBlur(event)
                              setCashboxAmount(cashbox, Number(event.target.value) || 0)
                            }}
                          />
                          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                            {cashbox.currencyCode}
                          </span>
                        </div>
                      </Field>

                      <p className="text-xs text-muted-foreground">
                        {cashbox.moneyAccountName}
                        {cashbox.currencyId !== setup.baseCurrencyId && cashbox.currentExchangeRate !== null && (
                          <span className="ml-2 font-medium text-foreground">
                            {formatNative(nativeAmount, cashbox.currencyDecimalPlaces)} {cashbox.currencyCode} ≈ {amount(posTenderBaseAmount(nativeAmount, cashbox.currentExchangeRate))} {setup.baseCurrencyCode}
                          </span>
                        )}
                        {cashbox.currentExchangeRate === null && <span className="ml-2 text-destructive">Current rate unavailable</span>}
                      </p>

                      {bills.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {bills.map((bill) => (
                            <Button
                              key={bill}
                              type="button"
                              variant="outline"
                              className="h-11 font-mono"
                              onClick={() => {
                                setActiveCashboxId(cashbox.moneyAccountId)
                                setCashboxAmount(cashbox, nativeAmount + bill)
                              }}
                            >
                              {cashbox.currencyCode === 'USD' ? `$${bill}` : compactBill(bill)}
                            </Button>
                          ))}
                        </div>
                      )}
                    </section>
                  )
                })}
              </div>

              <div className="space-y-4">
                <NumericKeypad
                  onDigit={appendDigit}
                  onClear={() => activeCashbox && setCashboxAmount(activeCashbox, 0)}
                  onBackspace={backspace}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-14 w-full text-base"
                  disabled={!activeCashbox?.currentExchangeRate}
                  onClick={exactRemaining}
                >
                  <RotateCcw className="size-4" />
                  Exact remaining{activeCashbox ? ` · ${activeCashbox.currencyCode}` : ''}
                </Button>
                <PaymentSummary
                  total={total}
                  receivedBaseAmount={receivedBaseAmount}
                  remaining={remaining}
                  changeDue={changeDue}
                  baseCashbox={baseCashbox}
                  baseCurrencyCode={setup.baseCurrencyCode}
                />
              </div>
            </div>
          ) : (
            <UnpaidSummary customer={customer} professional={professional} total={total} baseCurrencyCode={setup.baseCurrencyCode} />
          )}

          {(form.formState.errors.root?.message || form.formState.errors.cashboxAmounts?.root?.message || complete.error) && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {form.formState.errors.root?.message ?? form.formState.errors.cashboxAmounts?.root?.message ?? complete.error?.message}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" className="h-12" onClick={onBack}>Back to sale</Button>
            <Button type="submit" className="h-12 min-w-56" disabled={!ready || complete.isPending}>
              <Banknote className="size-4" />
              {complete.isPending ? 'Saving…' : paid ? `Save Paid Sale · ${amount(total)} ${setup.baseCurrencyCode}` : 'Save Unpaid Sale'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function PaymentModeButton({ active, title, description, onClick }: { active: boolean; title: string; description: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-14 rounded-lg px-4 text-left transition-colors ${active ? 'bg-background shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}
    >
      <span className="flex items-center gap-2 text-base font-semibold">{active && <Check className="size-4" />}{title}</span>
      <span className="mt-0.5 block text-xs">{description}</span>
    </button>
  )
}

function NumericKeypad({ onDigit, onClear, onBackspace }: { onDigit: (digit: string) => void; onClear: () => void; onBackspace: () => void }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold">Keypad</p>
      <div className="grid grid-cols-3 gap-2">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <Button key={digit} type="button" variant="outline" className="h-14 text-xl" aria-label={`Keypad ${digit}`} onClick={() => onDigit(digit)}>{digit}</Button>
        ))}
        <Button type="button" variant="outline" className="h-14 text-base" aria-label="Clear amount" onClick={onClear}>C</Button>
        <Button type="button" variant="outline" className="h-14 text-xl" aria-label="Keypad 0" onClick={() => onDigit('0')}>0</Button>
        <Button type="button" variant="outline" className="h-14 text-xl" aria-label="Backspace amount" onClick={onBackspace}>⌫</Button>
      </div>
    </div>
  )
}

function PaymentSummary({ total, receivedBaseAmount, remaining, changeDue, baseCashbox, baseCurrencyCode }: {
  total: number
  receivedBaseAmount: number
  remaining: number
  changeDue: number
  baseCashbox: SessionCashbox | undefined
  baseCurrencyCode: string
}) {
  return (
    <div className="space-y-3 rounded-xl bg-muted p-4">
      <Summary label="Total" value={`${amount(total)} ${baseCurrencyCode}`} />
      <Summary label="Received equivalent" value={`${amount(receivedBaseAmount)} ${baseCurrencyCode}`} />
      <Summary label="Remaining" value={`${amount(remaining)} ${baseCurrencyCode}`} accent={remaining > 0} />
      {changeDue > 0 && (
        <div className="rounded-lg bg-primary p-3 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide">Change</p>
          <p className="mt-1 font-mono text-2xl font-bold">{amount(changeDue)} {baseCurrencyCode}</p>
          {baseCashbox && <p className="mt-1 text-xs opacity-90">From {baseCashbox.moneyAccountCode}</p>}
        </div>
      )}
      {!baseCashbox && <p className="text-xs font-medium text-destructive">This session has no {baseCurrencyCode} Cashbox. Paid completion is blocked.</p>}
    </div>
  )
}

function UnpaidSummary({ customer, professional, total, baseCurrencyCode }: { customer: PosCustomer | null; professional: PosProfessional | null; total: number; baseCurrencyCode: string }) {
  if (!customer) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
        <h3 className="font-semibold">Customer required</h3>
        <p className="mt-1 text-sm">This sale cannot be saved as unpaid while the customer is Walk-in. Select a customer before saving this sale.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-muted/30 p-5">
      <h3 className="text-lg font-semibold">Unpaid sale</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Summary label="Customer" value={customer.name} />
        <Summary label="Master" value={professional?.name ?? '—'} />
        <Summary label="Total" value={`${amount(total)} ${baseCurrencyCode}`} />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">This amount will remain outstanding on the customer’s account.</p>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label>
}

function Summary({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className={`mt-1 font-mono text-lg font-bold ${accent ? 'text-destructive' : ''}`}>{value}</p></div>
}

function readinessMessage({ paid, customer, cashboxes, positiveCashboxes, missingRate, baseCashbox, remaining, setup }: {
  paid: boolean
  customer: PosCustomer | null
  cashboxes: SessionCashbox[]
  positiveCashboxes: SessionCashbox[]
  missingRate: SessionCashbox | undefined
  baseCashbox: SessionCashbox | undefined
  remaining: number
  setup: PosSetup
}) {
  if (!paid) return customer ? 'Unpaid sales do not receive payment now.' : 'A customer is required for an unpaid sale.'
  if (cashboxes.length === 0) return 'This POS Session has no configured Cashboxes.'
  if (!baseCashbox) return `This POS Session requires its configured ${setup.baseCurrencyCode} Cashbox before Paid checkout.`
  if (positiveCashboxes.length === 0) return 'Enter an amount received.'
  if (missingRate) return `The current ${missingRate.currencyCode} exchange rate is unavailable.`
  if (remaining > 0) return `Remaining to collect: ${amount(remaining)} ${setup.baseCurrencyCode}.`
  return 'Review the payment details before saving this sale.'
}

function numberOrZero(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function decimalPlaces(value: string) {
  return value.split('.')[1]?.length ?? 0
}

function quantum(decimalPlaceCount: number) {
  return 10 ** -Math.max(0, Math.min(decimalPlaceCount, 4))
}

function normalizeDisplayAmount(value: number, decimalPlaceCount: number) {
  const factor = 10 ** Math.max(0, Math.min(decimalPlaceCount, 4))
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function ceilToDisplayPrecision(value: number, decimalPlaceCount: number) {
  const factor = 10 ** Math.max(0, Math.min(decimalPlaceCount, 4))
  return Math.ceil((value - Number.EPSILON) * factor) / factor
}

function formatNative(value: number, decimalPlaceCount: number) {
  return value.toLocaleString(undefined, { minimumFractionDigits: decimalPlaceCount, maximumFractionDigits: decimalPlaceCount })
}

function compactBill(value: number) {
  return value >= 1_000 ? `${value / 1_000}K` : String(value)
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
