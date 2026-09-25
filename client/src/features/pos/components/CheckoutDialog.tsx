import { useEffect, useMemo, useRef, type ReactNode } from 'react'
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
import { MoneyAccountType } from '@/features/finance'
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
  PosMoneyAccount,
  PosProfessional,
  PosSale,
  PosSetup,
} from '../types/pos.types'

const IQD_BILLS = [250, 500, 1_000, 5_000, 10_000, 25_000, 50_000]
const USD_BILLS = [1, 5, 10, 20, 50, 100]

export function CheckoutDialog({
  open,
  setup,
  branchId,
  sessionId,
  warehouseId,
  customer,
  professional,
  cart,
  rememberedReceivingCashboxId,
  onReceivingCashboxChange,
  onOpenChange,
  onBack,
  onCompleted,
}: {
  open: boolean
  setup: PosSetup
  branchId: string
  sessionId: string
  warehouseId: string
  customer: PosCustomer | null
  professional: PosProfessional | null
  cart: PosCartLine[]
  rememberedReceivingCashboxId: string | null
  onReceivingCashboxChange: (cashboxId: string) => void
  onOpenChange: (open: boolean) => void
  onBack: () => void
  onCompleted: (sale: PosSale) => void
}) {
  const total = posCartTotal(cart)
  const complete = useCompletePosSale()
  const resetComplete = complete.reset
  const initializedForOpen = useRef(false)
  const cashboxes = useMemo(
    () => setup.moneyAccounts.filter((account) =>
      account.branchId === branchId && account.type === MoneyAccountType.Cashbox),
    [branchId, setup.moneyAccounts]
  )
  const validCashboxes = useMemo(
    () => cashboxes.filter((account) => account.currentExchangeRate !== null),
    [cashboxes]
  )
  const baseCashboxes = useMemo(
    () => validCashboxes.filter((account) => account.currencyId === setup.baseCurrencyId),
    [setup.baseCurrencyId, validCashboxes]
  )
  const rememberedCashbox = validCashboxes.find((account) => account.id === rememberedReceivingCashboxId)
  const defaultCashbox = rememberedCashbox ?? (validCashboxes.length === 1 ? validCashboxes[0] : undefined)
  const form = useForm<PosCheckoutValues>({
    resolver: zodResolver(posCheckoutSchema),
    defaultValues: {
      paymentMode: PosPaymentMode.Paid,
      moneyAccountId: '',
      receivedAmount: 0,
      changeMoneyAccountId: '',
    },
  })
  const values = useWatch({ control: form.control })
  const paymentMode = values.paymentMode ?? PosPaymentMode.Paid
  const paid = paymentMode === PosPaymentMode.Paid
  const receivingCashbox = cashboxes.find((account) => account.id === values.moneyAccountId)
  const validReceivingCashbox = validCashboxes.find((account) => account.id === values.moneyAccountId)
  const receivedAmount = numberOrZero(values.receivedAmount)
  const receivedBaseAmount = posTenderBaseAmount(receivedAmount, validReceivingCashbox?.currentExchangeRate ?? 0)
  const remaining = roundPosMoney(Math.max(total - receivedBaseAmount, 0))
  const changeDue = paid ? roundPosMoney(Math.max(receivedBaseAmount - total, 0)) : 0
  const foreignReceipt = Boolean(validReceivingCashbox && validReceivingCashbox.currencyId !== setup.baseCurrencyId)
  const selectedBaseChangeCashbox = baseCashboxes.find((account) => account.id === values.changeMoneyAccountId)
  const changeCashbox = changeDue === 0
    ? null
    : foreignReceipt
      ? selectedBaseChangeCashbox ?? null
      : validReceivingCashbox ?? null
  const changeAmount = changeCashbox
    ? roundPosMoney(changeDue / (changeCashbox.currentExchangeRate ?? 1))
    : 0
  const changeBaseAmount = changeCashbox
    ? posTenderBaseAmount(changeAmount, changeCashbox.currentExchangeRate ?? 0)
    : 0
  const hasCustomer = Boolean(customer)
  const ready = paid
    ? Boolean(validReceivingCashbox)
      && receivedBaseAmount >= total
      && (changeDue === 0 || (Boolean(changeCashbox) && changeBaseAmount === changeDue))
    : hasCustomer
  const bills = validReceivingCashbox?.currencyCode === 'IQD'
    ? IQD_BILLS
    : validReceivingCashbox?.currencyCode === 'USD'
      ? USD_BILLS
      : []

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false
      return
    }
    if (initializedForOpen.current) return

    form.reset({
      paymentMode: PosPaymentMode.Paid,
      moneyAccountId: defaultCashbox?.id ?? '',
      receivedAmount: 0,
      changeMoneyAccountId: '',
    })
    resetComplete()
    initializedForOpen.current = true
  }, [defaultCashbox?.id, form, open, resetComplete])

  useEffect(() => {
    if (!foreignReceipt || changeDue === 0) {
      if (values.changeMoneyAccountId !== '') form.setValue('changeMoneyAccountId', '')
      return
    }
    if (selectedBaseChangeCashbox) return
    form.setValue('changeMoneyAccountId', baseCashboxes.length === 1 ? baseCashboxes[0].id : '', {
      shouldValidate: true,
    })
  }, [baseCashboxes, changeDue, foreignReceipt, form, selectedBaseChangeCashbox, values.changeMoneyAccountId])

  const selectPaymentMode = (mode: typeof PosPaymentMode.Paid | typeof PosPaymentMode.Credit) => {
    form.setValue('paymentMode', mode, { shouldValidate: true })
    form.clearErrors('root')
  }

  const selectCashbox = (cashboxId: string) => {
    form.setValue('moneyAccountId', cashboxId, { shouldValidate: true })
    form.setValue('receivedAmount', 0, { shouldValidate: true })
    form.setValue('changeMoneyAccountId', '')
    form.clearErrors('root')
    if (validCashboxes.some((account) => account.id === cashboxId)) {
      onReceivingCashboxChange(cashboxId)
    }
  }

  const setReceivedAmount = (next: number) => {
    form.setValue('receivedAmount', roundPosMoney(Math.max(next, 0)), { shouldValidate: true })
    form.clearErrors('root')
  }

  const appendDigit = (digit: string) => {
    const current = String(receivedAmount)
    const nextText = current === '0' ? digit : `${current}${digit}`
    const next = Number(nextText)
    if (!Number.isFinite(next) || decimalPlaces(nextText) > 4) return
    setReceivedAmount(next)
  }

  const backspace = () => {
    const nextText = String(receivedAmount).slice(0, -1)
    setReceivedAmount(nextText === '' || nextText === '-' ? 0 : Number(nextText))
  }

  const submit = form.handleSubmit((value) => {
    if (!ready) {
      form.setError('root', { message: readinessMessage({
        paid,
        customer,
        validReceivingCashbox,
        receivingCashbox,
        remaining,
        foreignReceipt,
        baseCashboxes,
        changeCashbox,
        setup,
      }) })
      return
    }

    form.clearErrors('root')
    complete.mutate(
      {
        branchId,
        posSessionId: sessionId,
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
            professionalUserId: service ? professional?.id ?? null : null,
          }
        }),
        tenders: paid
          ? [{ moneyAccountId: value.moneyAccountId, amount: value.receivedAmount }]
          : [],
        change: paid && changeDue > 0 && changeCashbox
          ? { moneyAccountId: changeCashbox.id, amount: changeAmount }
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
      <DialogContent className="max-h-[96vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Payment</DialogTitle>
          <DialogDescription>
            Complete this sale now or keep the total outstanding on the selected customer account.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
            <Summary label="Customer" value={customer?.name ?? 'Walk-in'} />
            <Summary label="Master" value={professional?.username ?? '—'} />
            <Summary label="Sale total" value={`${amount(total)} ${setup.baseCurrencyCode}`} />
          </div>

          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1.5">
            <PaymentModeButton active={paid} title="Paid" description="Settle now" onClick={() => selectPaymentMode(PosPaymentMode.Paid)} />
            <PaymentModeButton active={!paid} title="Unpaid" description="Collect later" onClick={() => selectPaymentMode(PosPaymentMode.Credit)} />
          </div>

          {paid ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div className="space-y-4">
                <Field label="Cashbox" error={form.formState.errors.moneyAccountId?.message}>
                  <select
                    aria-label="Cashbox"
                    value={values.moneyAccountId ?? ''}
                    onChange={(event) => selectCashbox(event.target.value)}
                    className="h-14 w-full rounded-xl border bg-background px-4 text-base font-medium outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Select Cashbox</option>
                    {cashboxes.map((cashbox) => (
                      <option key={cashbox.id} value={cashbox.id} disabled={cashbox.currentExchangeRate === null}>
                        {cashbox.code} — {cashbox.name} · {cashbox.currencyCode}{cashbox.currentExchangeRate === null ? ' · Rate missing' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                {cashboxes.length === 0 && (
                  <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                    No operable Cashbox is available for this branch.
                  </p>
                )}

                <Field label={`Amount received${validReceivingCashbox ? ` · ${validReceivingCashbox.currencyCode}` : ''}`} error={form.formState.errors.receivedAmount?.message}>
                  <div className="relative">
                    <Input
                      aria-label="Amount received"
                      type="number"
                      min="0"
                      step="0.0001"
                      inputMode="decimal"
                      className="h-16 pr-20 text-right font-mono text-2xl font-bold"
                      {...form.register('receivedAmount', {
                        setValueAs: (value) => value === '' ? 0 : Number(value),
                      })}
                    />
                    {validReceivingCashbox && (
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        {validReceivingCashbox.currencyCode}
                      </span>
                    )}
                  </div>
                </Field>

                {validReceivingCashbox && validReceivingCashbox.currencyId !== setup.baseCurrencyId && (
                  <p className="rounded-xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                    1 {validReceivingCashbox.currencyCode} = {amount(validReceivingCashbox.currentExchangeRate ?? 0)} {setup.baseCurrencyCode}
                    <span className="ml-2 font-medium text-foreground">Equivalent: {amount(receivedBaseAmount)} {setup.baseCurrencyCode}</span>
                  </p>
                )}

                {bills.length > 0 && (
                  <div>
                    <p className="mb-2 text-sm font-semibold">Common bills</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {bills.map((bill) => (
                        <Button key={bill} type="button" variant="outline" className="h-12 font-mono" onClick={() => setReceivedAmount(receivedAmount + bill)}>
                          {validReceivingCashbox?.currencyCode === 'USD' ? `$${amount(bill)}` : amount(bill)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="secondary"
                  className="h-14 w-full text-base"
                  disabled={!validReceivingCashbox}
                  onClick={() => setReceivedAmount(roundPosMoney(total / (validReceivingCashbox?.currentExchangeRate ?? 1)))}
                >
                  <RotateCcw className="size-4" />
                  Exact · {amount(total)} {setup.baseCurrencyCode}
                </Button>

                {changeDue > 0 && foreignReceipt && (
                  <Field label={`${setup.baseCurrencyCode} Cashbox for change`} error={form.formState.errors.changeMoneyAccountId?.message}>
                    <select
                      aria-label={`${setup.baseCurrencyCode} Cashbox for change`}
                      value={values.changeMoneyAccountId ?? ''}
                      onChange={(event) => form.setValue('changeMoneyAccountId', event.target.value, { shouldValidate: true })}
                      className="h-14 w-full rounded-xl border bg-background px-4 text-base font-medium outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">Select {setup.baseCurrencyCode} Cashbox</option>
                      {baseCashboxes.map((cashbox) => (
                        <option key={cashbox.id} value={cashbox.id}>{cashbox.code} — {cashbox.name} · {cashbox.currencyCode}</option>
                      ))}
                    </select>
                    {baseCashboxes.length === 0 && (
                      <span className="text-xs font-normal text-destructive">An {setup.baseCurrencyCode} Cashbox is required to return change for a foreign-currency payment.</span>
                    )}
                  </Field>
                )}
              </div>

              <div className="space-y-4">
                <NumericKeypad onDigit={appendDigit} onClear={() => setReceivedAmount(0)} onBackspace={backspace} />
                <PaymentSummary
                  total={total}
                  receivedBaseAmount={receivedBaseAmount}
                  remaining={remaining}
                  changeDue={changeDue}
                  changeCashbox={changeCashbox}
                  changeAmount={changeAmount}
                  baseCurrencyCode={setup.baseCurrencyCode}
                />
              </div>
            </div>
          ) : (
            <UnpaidSummary customer={customer} professional={professional} total={total} baseCurrencyCode={setup.baseCurrencyCode} />
          )}

          {(form.formState.errors.root?.message || complete.error) && (
            <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {form.formState.errors.root?.message ?? complete.error?.message}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" className="h-12" onClick={onBack}>Back to sale</Button>
            <Button type="submit" className="h-12 min-w-56" disabled={!ready || complete.isPending}>
              <Banknote className="size-4" />
              {complete.isPending
                ? 'Saving…'
                : paid
                  ? `Save Paid Sale · ${amount(total)} ${setup.baseCurrencyCode}`
                  : 'Save Unpaid Sale'}
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

function PaymentSummary({
  total,
  receivedBaseAmount,
  remaining,
  changeDue,
  changeCashbox,
  changeAmount,
  baseCurrencyCode,
}: {
  total: number
  receivedBaseAmount: number
  remaining: number
  changeDue: number
  changeCashbox: PosMoneyAccount | null
  changeAmount: number
  baseCurrencyCode: string
}) {
  return (
    <div className="space-y-3 rounded-xl bg-muted p-4">
      <Summary label="Sale total" value={`${amount(total)} ${baseCurrencyCode}`} />
      <Summary label="Received" value={`${amount(receivedBaseAmount)} ${baseCurrencyCode}`} />
      {changeDue > 0 ? (
        <div className="rounded-lg bg-primary p-3 text-primary-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide">Change to customer</p>
          <p className="mt-1 font-mono text-2xl font-bold">{amount(changeDue)} {baseCurrencyCode}</p>
          {changeCashbox && <p className="mt-1 text-xs opacity-90">From {changeCashbox.name} · {amount(changeAmount)} {changeCashbox.currencyCode}</p>}
        </div>
      ) : (
        <Summary label="Remaining to collect" value={`${amount(remaining)} ${baseCurrencyCode}`} accent={remaining > 0} />
      )}
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
        <Summary label="Master" value={professional?.username ?? '—'} />
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

function readinessMessage({ paid, customer, validReceivingCashbox, receivingCashbox, remaining, foreignReceipt, baseCashboxes, changeCashbox, setup }: {
  paid: boolean
  customer: PosCustomer | null
  validReceivingCashbox: PosMoneyAccount | undefined
  receivingCashbox: PosMoneyAccount | undefined
  remaining: number
  foreignReceipt: boolean
  baseCashboxes: PosMoneyAccount[]
  changeCashbox: PosMoneyAccount | null
  setup: PosSetup
}) {
  if (!paid) return customer ? 'Unpaid sales do not receive payment now.' : 'A customer is required for an unpaid sale.'
  if (!receivingCashbox) return 'Select a Cashbox before saving this sale.'
  if (!validReceivingCashbox) return 'The selected Cashbox is unavailable because its exchange rate is missing.'
  if (remaining > 0) return `Remaining to collect: ${amount(remaining)} ${setup.baseCurrencyCode}.`
  if (foreignReceipt && baseCashboxes.length === 0) return `An ${setup.baseCurrencyCode} Cashbox is required to return change for a foreign-currency payment.`
  if (!changeCashbox) return `Select an ${setup.baseCurrencyCode} Cashbox to return change.`
  return 'Review the payment details before saving this sale.'
}

function numberOrZero(value: number | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function decimalPlaces(value: string) {
  return value.split('.')[1]?.length ?? 0
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
