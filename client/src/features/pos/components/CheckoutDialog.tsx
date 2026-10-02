import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Banknote, Check, RotateCcw } from 'lucide-react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
import { formatNumber } from '@/lib/i18n'
import { useCompletePosSale } from '../hooks/usePos'
import { posCartTotal } from '../lib/posCart'
import { posMoneyLineBaseAmount, roundPosMoney } from '../lib/posMoney'
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
const POS_MONEY_QUANTUM = 0.0001

export function CheckoutDialog({
  open,
  setup,
  branchId,
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
  branchId: string
  warehouseId: string
  customer: PosCustomer | null
  professional: PosProfessional | null
  cart: PosCartLine[]
  onOpenChange: (open: boolean) => void
  onBack: () => void
  onCompleted: (sale: PosSale) => void
}) {
  const { t } = useTranslation(['pos', 'common'])
  const total = posCartTotal(cart)
  const complete = useCompletePosSale()
  const resetComplete = complete.reset
  const initializedForOpen = useRef(false)
  const accounts = useMemo(() => setup.moneyAccounts
    .filter((account) => account.branchId === branchId)
    .sort((left, right) => {
      const leftBase = left.currencyId === setup.baseCurrencyId ? 0 : 1
      const rightBase = right.currencyId === setup.baseCurrencyId ? 0 : 1
      return leftBase - rightBase || left.currencyCode.localeCompare(right.currencyCode)
    }), [branchId, setup.baseCurrencyId, setup.moneyAccounts])
  const baseCashbox = accounts.find((account) =>
    account.type === MoneyAccountType.Cashbox && account.currencyId === setup.baseCurrencyId)
  const initialAccountId = accounts[0]?.id ?? ''
  const [activeAccountId, setActiveAccountId] = useState(initialAccountId)
  const form = useForm<PosCheckoutValues>({
    resolver: zodResolver(posCheckoutSchema),
    defaultValues: {
      paymentMode: PosPaymentMode.Paid,
      collectionAmounts: Object.fromEntries(accounts.map((account) => [account.id, 0])),
    },
  })
  const values = useWatch({ control: form.control })
  const paymentMode = values.paymentMode ?? PosPaymentMode.Paid
  const paid = paymentMode === PosPaymentMode.Paid
  const partial = paymentMode === PosPaymentMode.Partial
  const credit = paymentMode === PosPaymentMode.Credit
  const collectionAmounts = values.collectionAmounts ?? {}
  const positiveAccounts = accounts.filter((account) => numberOrZero(collectionAmounts[account.id]) > 0)
  const missingRate = positiveAccounts.find((account) => account.currentExchangeRate === null)
  const receivedBaseAmount = roundPosMoney(accounts.reduce((sum, account) => sum + posMoneyLineBaseAmount(
    numberOrZero(collectionAmounts[account.id]), account.currentExchangeRate ?? 0,
  ), 0))
  const remaining = roundPosMoney(Math.max(total - receivedBaseAmount, 0))
  const changeDue = paid ? roundPosMoney(Math.max(receivedBaseAmount - total, 0)) : 0
  const hasCustomer = Boolean(customer)
  const ready = paid
    ? positiveAccounts.length > 0 && !missingRate && (receivedBaseAmount === total || Boolean(baseCashbox)) && receivedBaseAmount >= total
    : partial
      ? hasCustomer && positiveAccounts.length > 0 && !missingRate && receivedBaseAmount > 0 && receivedBaseAmount < total
      : hasCustomer && positiveAccounts.length === 0
  const activeAccount = accounts.find((account) => account.id === activeAccountId)

  useEffect(() => {
    if (!open) {
      initializedForOpen.current = false
      return
    }
    if (initializedForOpen.current) return
    form.reset({
      paymentMode: PosPaymentMode.Paid,
      collectionAmounts: Object.fromEntries(accounts.map((account) => [account.id, 0])),
    })
    setActiveAccountId(initialAccountId)
    resetComplete()
    initializedForOpen.current = true
  }, [accounts, form, initialAccountId, open, resetComplete])

  const selectPaymentMode = (mode: PosPaymentMode) => {
    form.setValue('paymentMode', mode, { shouldValidate: true })
    form.clearErrors('root')
    complete.reset()
  }

  const setAccountAmount = (account: PosMoneyAccount, next: number) => {
    const normalized = normalizeDisplayAmount(Math.max(next, 0), account.currencyDecimalPlaces)
    form.setValue(`collectionAmounts.${account.id}`, normalized, { shouldValidate: true })
    form.clearErrors('root')
    complete.reset()
  }

  const appendDigit = (digit: string) => {
    if (!activeAccount) return
    const current = numberOrZero(collectionAmounts[activeAccount.id])
    const nextText = current === 0 ? digit : `${current}${digit}`
    if (decimalPlaces(nextText) > activeAccount.currencyDecimalPlaces) return
    const next = Number(nextText)
    if (Number.isFinite(next)) setAccountAmount(activeAccount, next)
  }

  const backspace = () => {
    if (!activeAccount) return
    const current = numberOrZero(collectionAmounts[activeAccount.id])
    const nextText = String(current).slice(0, -1)
    setAccountAmount(activeAccount, nextText === '' ? 0 : Number(nextText))
  }

  const exactRemaining = () => {
    if (!activeAccount || !activeAccount.currentExchangeRate) return
    const otherBase = roundPosMoney(accounts
      .filter((account) => account.id !== activeAccount.id)
      .reduce((sum, account) => sum + posMoneyLineBaseAmount(
        Math.max(numberOrZero(collectionAmounts[account.id]), 0),
        account.currentExchangeRate ?? 0,
      ), 0))
    const remainingBase = roundPosMoney(Math.max(total - otherBase, 0))
    if (remainingBase === 0) {
      setAccountAmount(activeAccount, 0)
      return
    }

    let nativeAmount = roundPosMoney(remainingBase / activeAccount.currentExchangeRate)
    while (posMoneyLineBaseAmount(nativeAmount, activeAccount.currentExchangeRate) < remainingBase) {
      nativeAmount = roundPosMoney(nativeAmount + POS_MONEY_QUANTUM)
    }
    nativeAmount = ceilToDisplayPrecision(nativeAmount, activeAccount.currencyDecimalPlaces)
    const displayQuantum = quantum(activeAccount.currencyDecimalPlaces)
    while (posMoneyLineBaseAmount(nativeAmount, activeAccount.currentExchangeRate) < remainingBase) {
      nativeAmount = normalizeDisplayAmount(nativeAmount + displayQuantum, activeAccount.currencyDecimalPlaces)
    }
    setAccountAmount(activeAccount, nativeAmount)
  }

  const submit = form.handleSubmit((value) => {
    if (!ready) {
      form.setError('root', { message: readinessMessage({
        paymentMode, customer, accounts, positiveAccounts, missingRate, baseCashbox, receivedBaseAmount, total, setup,
      }) })
      return
    }

    form.clearErrors('root')
    complete.mutate(
      {
        branchId,
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
        collections: credit
          ? []
          : accounts.flatMap((account) => {
              const nativeAmount = normalizeDisplayAmount(
                numberOrZero(value.collectionAmounts[account.id]), account.currencyDecimalPlaces,
              )
              return nativeAmount > 0 ? [{ moneyAccountId: account.id, amount: nativeAmount }] : []
            }),
        change: paid && changeDue > 0 && baseCashbox

          ? { moneyAccountId: baseCashbox.id, amount: changeDue }
          : null,
        paymentMode,
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
          <DialogTitle className="text-xl">{t('pos:checkout.title', { defaultValue: 'Payment' })}</DialogTitle>
          <DialogDescription>
            {t('pos:checkout.paymentDescription', { defaultValue: 'Enter native collection amounts. Exchange values shown here are previews; Save validates current rates again.' })}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
            <Summary label={t('pos:checkout.customer', { defaultValue: 'Customer' })} value={customer?.name ?? t('pos:checkout.walkIn', { defaultValue: 'Walk-in' })} />
            <Summary label={t('pos:cart.professional', { defaultValue: 'Staff / Stylist' })} value={professional?.name ?? '—'} />
            <Summary label={t('pos:checkout.saleTotal', { defaultValue: 'Sale total' })} value={`${amount(total)} ${setup.baseCurrencyCode}`} />
          </div>

          <div className="grid grid-cols-3 gap-2 rounded-xl bg-muted p-1.5">
            <PaymentModeButton
              active={paid}
              title={t('pos:checkout.paid', { defaultValue: 'Paid' })}
              description={t('pos:checkout.settleNow', { defaultValue: 'Settle now' })}
              onClick={() => selectPaymentMode(PosPaymentMode.Paid)}
            />
            <PaymentModeButton
              active={partial}
              title={t('pos:checkout.partial', { defaultValue: 'Partial' })}
              description={t('pos:checkout.collectPart', { defaultValue: 'Collect part now' })}
              onClick={() => selectPaymentMode(PosPaymentMode.Partial)}
            />
            <PaymentModeButton
              active={credit}
              title={t('pos:checkout.credit', { defaultValue: 'Credit' })}
              description={t('pos:checkout.collectLater', { defaultValue: 'Collect later' })}
              onClick={() => selectPaymentMode(PosPaymentMode.Credit)}
            />
          </div>

          {!credit ? (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="space-y-4">
                {accounts.length === 0 && (
                  <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
                    No operable Money Account is available for this branch.
                  </p>
                )}
                {accounts.map((account) => {
                  const fieldName = `collectionAmounts.${account.id}` as const
                  const field = form.register(fieldName, { setValueAs: (input) => input === '' ? 0 : Number(input) })
                  const nativeAmount = numberOrZero(collectionAmounts[account.id])
                  const bills = account.currencyCode === 'IQD' ? IQD_BILLS : account.currencyCode === 'USD' ? USD_BILLS : []
                  const error = form.formState.errors.collectionAmounts?.[account.id]?.message
                  return (
                    <section
                      key={account.id}
                      className={`space-y-3 rounded-xl border p-4 ${activeAccountId === account.id ? 'ring-2 ring-ring' : ''}`}
                    >
                      <Field label={`${account.currencyCode} · ${account.code}`} error={error}>
                        <div className="relative">
                          <Input
                            aria-label={`${account.currencyCode} amount`}
                            type="number"
                            min="0"
                            step={quantum(account.currencyDecimalPlaces)}
                            inputMode="decimal"
                            className="h-16 pe-20 text-end font-mono text-2xl font-bold"
                            {...field}
                            onFocus={() => setActiveAccountId(account.id)}
                            onChange={(event) => {
                              if (decimalPlaces(event.target.value) <= account.currencyDecimalPlaces) field.onChange(event)
                              form.clearErrors('root')
                              complete.reset()
                            }}
                            onBlur={(event) => {
                              field.onBlur(event)
                              setAccountAmount(account, Number(event.target.value) || 0)
                            }}
                          />
                          <span className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                            {account.currencyCode}
                          </span>
                        </div>
                      </Field>

                      <p className="text-xs text-muted-foreground">
                        {account.name}
                        {account.currencyId !== setup.baseCurrencyId && account.currentExchangeRate !== null && (
                          <span className="ms-2 font-medium text-foreground">
                            {formatNative(nativeAmount, account.currencyDecimalPlaces)} {account.currencyCode} ≈ {amount(posMoneyLineBaseAmount(nativeAmount, account.currentExchangeRate))} {setup.baseCurrencyCode}
                          </span>
                        )}
                        {account.currentExchangeRate === null && (
                          <span className="ms-2 text-destructive">
                            {t('pos:checkout.rateUnavailable', { defaultValue: 'Current rate unavailable' })}
                          </span>
                        )}
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
                                setActiveAccountId(account.id)
                                setAccountAmount(account, nativeAmount + bill)
                              }}
                            >
                              {account.currencyCode === 'USD' ? `$${bill}` : compactBill(bill)}
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
                  onClear={() => activeAccount && setAccountAmount(activeAccount, 0)}
                  onBackspace={backspace}
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-14 w-full text-base"
                  disabled={!activeAccount?.currentExchangeRate}
                  onClick={exactRemaining}
                >
                  <RotateCcw className="size-4" />
                  {t('pos:checkout.exactRemaining', { defaultValue: 'Exact remaining' })}
                  {activeAccount ? ` · ${activeAccount.currencyCode}` : ''}
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

          {(form.formState.errors.root?.message || form.formState.errors.collectionAmounts?.root?.message || complete.error) && (
            <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {form.formState.errors.root?.message ?? form.formState.errors.collectionAmounts?.root?.message ?? complete.error?.message}
            </p>
          )}

          <DialogFooter className="gap-2 sm:justify-between">
            <Button type="button" variant="outline" className="h-12" onClick={onBack}>
              {t('pos:checkout.backToSale', { defaultValue: 'Back to sale' })}
            </Button>
            <Button type="submit" className="h-12 min-w-56" disabled={!ready || complete.isPending}>
              <Banknote className="size-4" />
              {complete.isPending
                ? t('common:status.loading', { defaultValue: 'Saving…' })
                : paid
                  ? `${t('pos:checkout.savePaidSale', { defaultValue: 'Save Paid Sale' })} · ${amount(total)} ${setup.baseCurrencyCode}`
                  : partial
                    ? t('pos:checkout.savePartialSale', { defaultValue: 'Save Partially Paid Sale' })
                    : t('pos:checkout.saveCreditSale', { defaultValue: 'Save Credit Sale' })}
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
      className={`min-h-14 rounded-lg px-4 text-start transition-colors ${active ? 'bg-background shadow-sm ring-1 ring-border' : 'text-muted-foreground hover:text-foreground'}`}
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
  baseCashbox: PosMoneyAccount | undefined
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
          {baseCashbox && <p className="mt-1 text-xs opacity-90">From {baseCashbox.code}</p>}
        </div>
      )}
      {!baseCashbox && changeDue > 0 && <p className="text-xs font-medium text-destructive">No operable {baseCurrencyCode} Cashbox is available to return change.</p>}
    </div>
  )
}

function UnpaidSummary({ customer, professional, total, baseCurrencyCode }: { customer: PosCustomer | null; professional: PosProfessional | null; total: number; baseCurrencyCode: string }) {
  if (!customer) {
    return (
      <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950 dark:bg-amber-950/20 dark:text-amber-100">
        <h3 className="font-semibold">Customer required</h3>
        <p className="mt-1 text-sm">A Walk-in sale must be fully paid. Select a registered customer to save it on credit.</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border bg-muted/30 p-5">
      <h3 className="text-lg font-semibold">Credit sale</h3>
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

function readinessMessage({ paymentMode, customer, accounts, positiveAccounts, missingRate, baseCashbox, receivedBaseAmount, total, setup }: {
  paymentMode: PosPaymentMode
  customer: PosCustomer | null
  accounts: PosMoneyAccount[]
  positiveAccounts: PosMoneyAccount[]
  missingRate: PosMoneyAccount | undefined
  baseCashbox: PosMoneyAccount | undefined
  receivedBaseAmount: number
  total: number
  setup: PosSetup
}) {
  if (paymentMode === PosPaymentMode.Credit) {
    if (!customer) return 'A registered customer is required for a credit sale.'
    return positiveAccounts.length === 0 ? 'Review the credit sale before saving.' : 'Credit sales cannot include collection money lines.'
  }
  if (accounts.length === 0) return 'No operable Money Account is available for this branch.'
  if (!customer && paymentMode === PosPaymentMode.Partial) return 'A registered customer is required for a partially paid sale.'
  if (positiveAccounts.length === 0) return 'Enter an amount received.'
  if (missingRate) return `The current ${missingRate.currencyCode} exchange rate is unavailable.`
  if (paymentMode === PosPaymentMode.Partial && receivedBaseAmount >= total) return 'Partial collection must be less than the sale total.'
  if (paymentMode === PosPaymentMode.Paid && receivedBaseAmount < total) {
    return `Remaining to collect: ${amount(total - receivedBaseAmount)} ${setup.baseCurrencyCode}.`
  }
  if (paymentMode === PosPaymentMode.Paid && receivedBaseAmount > total && !baseCashbox) {
    return `An operable ${setup.baseCurrencyCode} Cashbox is required to return change.`
  }
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

const amount = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })
