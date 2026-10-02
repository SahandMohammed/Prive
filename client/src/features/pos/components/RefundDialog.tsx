import { useEffect, useMemo, type ReactNode, type SelectHTMLAttributes } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
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
import { Textarea } from '@/components/ui/textarea'
import { SalesLineType } from '@/features/sales'
import { formatDateTime, formatNumber } from '@/lib/i18n'
import { usePosRefundability, usePostPosRefund, useVoidPosSale } from '../hooks/usePos'
import { posMoneyLineBaseAmount, roundPosMoney } from '../lib/posMoney'
import { posRefundPreview } from '../lib/posRefund'
import { posRefundSchema, type PosRefundValues } from '../schemas/pos.schema'
import { PosRefundReason, type PosRefund, type PosSetup } from '../types/pos.types'

const reasonEnumList = [
  PosRefundReason.WrongServiceEntered,
  PosRefundReason.WrongProductEntered,
  PosRefundReason.CustomerComplaint,
  PosRefundReason.DuplicateSale,
  PosRefundReason.ProductReturned,
  PosRefundReason.ServiceIssue,
  PosRefundReason.CashierMistake,
  PosRefundReason.Other,
] as const

const getRefundReasonLabel = (reason: PosRefundReason, t: (key: string) => string) => {
  switch (reason) {
    case PosRefundReason.WrongServiceEntered: return t('pos:refund.reasons.wrongService')
    case PosRefundReason.WrongProductEntered: return t('pos:refund.reasons.wrongProduct')
    case PosRefundReason.CustomerComplaint: return t('pos:refund.reasons.complaint')
    case PosRefundReason.DuplicateSale: return t('pos:refund.reasons.duplicate')
    case PosRefundReason.ProductReturned: return t('pos:refund.reasons.returned')
    case PosRefundReason.ServiceIssue: return t('pos:refund.reasons.serviceIssue')
    case PosRefundReason.CashierMistake: return t('pos:refund.reasons.cashierMistake')
    case PosRefundReason.Other:
    default: return t('pos:refund.reasons.other')
  }
}

export function RefundDialog({
  saleId,
  setup,
  mode,
  open,
  onOpenChange,
  onCompleted,
}: {
  saleId: string
  setup: PosSetup
  mode: 'refund' | 'void'
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted: (refund: PosRefund) => void
}) {
  const { t } = useTranslation(['pos', 'common'])
  const refundability = usePosRefundability(saleId, open)
  const postRefund = usePostPosRefund()
  const voidSale = useVoidPosSale()
  const resetPostRefund = postRefund.reset
  const resetVoidSale = voidSale.reset
  const mutation = mode === 'void' ? voidSale : postRefund
  const data = refundability.data
  const accounts = useMemo(
    () => setup.moneyAccounts.filter((account) => account.branchId === data?.branchId),
    [data?.branchId, setup.moneyAccounts]
  )
  const availableAccounts = accounts.filter((account) => account.currentExchangeRate !== null)
  const baseAccount = availableAccounts.find(
    (account) => account.currencyId === setup.baseCurrencyId && account.currentExchangeRate === 1
  )
  const form = useForm<PosRefundValues>({
    resolver: zodResolver(posRefundSchema),
    defaultValues: { reason: PosRefundReason.CustomerComplaint, notes: '', lines: [], refundPayouts: [] },
  })
  const payoutFields = useFieldArray({ control: form.control, name: 'refundPayouts' })
  const values = useWatch({ control: form.control })

  useEffect(() => {
    if (!open || !data) return
    const total = mode === 'void' ? data.remainingRefundableBaseAmount : 0
    const physical = roundPosMoney(Math.max(total - data.currentOutstandingBaseAmount, 0))
    form.reset({
      reason: mode === 'void' ? PosRefundReason.CashierMistake : PosRefundReason.CustomerComplaint,
      notes: '',
      lines: data.lines.map((line) => ({
        salesInvoiceLineId: line.salesInvoiceLineId,
        selected: mode === 'void',
        quantity: mode === 'void' ? line.refundableQuantity : 0,
        restockProduct: line.canRestock,
      })),
      refundPayouts: physical > 0 && baseAccount ? [{ moneyAccountId: baseAccount.id, amount: physical }] : [],
    })
    resetPostRefund()
    resetVoidSale()
  }, [baseAccount, data, form, mode, open, resetPostRefund, resetVoidSale])

  const preview = posRefundPreview(
    data?.lines ?? [],
    (values.lines ?? []).map((line) => ({
      salesInvoiceLineId: line?.salesInvoiceLineId ?? '',
      selected: Boolean(line?.selected),
      quantity: Number(line?.quantity) || 0,
    })),
    data?.currentOutstandingBaseAmount ?? 0
  )
  const selectedTotal = preview.selectedTotalBase
  const receivableReduction = preview.receivableReductionBase
  const physicalDue = preview.physicalRefundBase
  const payoutBase = roundPosMoney((values.refundPayouts ?? []).reduce((sum, payout) => {
    const account = accounts.find((item) => item.id === payout?.moneyAccountId)
    return sum + posMoneyLineBaseAmount(Number(payout?.amount) || 0, account?.currentExchangeRate ?? 0)
  }, 0))
  const payoutsValid = (values.refundPayouts ?? []).every((payout) => {
    const account = accounts.find((item) => item.id === payout?.moneyAccountId)
    return Boolean(account?.currentExchangeRate) && Number(payout?.amount) > 0
      && Number(payout?.amount) <= (account?.balance ?? 0)
  })
  const linesValid = preview.quantitiesValid
  const selectedProductWithoutRestock = (values.lines ?? []).some((value, index) =>
    value?.selected && data?.lines[index]?.lineType === SalesLineType.Product && !value.restockProduct
  )
  const notesRequired = values.reason === PosRefundReason.Other || selectedProductWithoutRestock
  const ready = selectedTotal > 0 && linesValid && payoutsValid && payoutBase === physicalDue
    && (!notesRequired || Boolean(values.notes?.trim()))

  const submit = form.handleSubmit((value) => {
    if (!ready || !data) {
      form.setError('root', { message: 'Resolve the highlighted refund quantities, notes, and physical refund total.' })
      return
    }
    const refundPayouts = value.refundPayouts.map(({ moneyAccountId, amount }) => ({ moneyAccountId, amount }))
    const options = { onSuccess: (refund: PosRefund) => { onOpenChange(false); onCompleted(refund) } }
    if (mode === 'void') {
      voidSale.mutate({ saleId, body: {
        reason: value.reason,
        notes: value.notes || null,
        restockSalesInvoiceLineIds: value.lines
          .filter((line, index) => line.selected && data.lines[index].lineType === SalesLineType.Product && line.restockProduct)
          .map((line) => line.salesInvoiceLineId),
        refundPayouts,
      } }, options)
      return
    }
    postRefund.mutate({ saleId, body: {
      reason: value.reason,
      notes: value.notes || null,
      lines: value.lines.filter((line) => line.selected).map((line) => ({
        salesInvoiceLineId: line.salesInvoiceLineId,
        quantity: line.quantity,
        restockProduct: line.restockProduct,
      })),
      refundPayouts,
    } }, options)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{mode === 'void' ? t('pos:refund.voidTitle') : t('pos:refund.refundTitle')}</DialogTitle>
          <DialogDescription>
            {mode === 'void' ? t('pos:refund.voidDesc') : t('pos:refund.refundDesc')}
          </DialogDescription>
        </DialogHeader>
        {refundability.isPending && <p className="py-10 text-center text-sm text-muted-foreground">{t('pos:refund.loading')}</p>}
        {refundability.isError && <ErrorText>{refundability.error.message}</ErrorText>}
        {data && (
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-4 lg:grid-cols-8">
              <Summary label={t('pos:refund.sale')} value={data.salesInvoiceDocumentNumber} />
              <Summary label={t('pos:refund.invoice')} value={data.salesInvoiceDocumentNumber} />
              <Summary label={t('pos:refund.customer')} value={data.customerName} />
              <Summary label={t('pos:refund.originalDate')} value={formatDateTime(data.completedAtUtc)} />
              <Summary label={t('pos:refund.operator')} value={data.operatorUsername} />
              <Summary label={t('pos:refund.original')} value={`${money(data.originalTotalBase)} ${data.baseCurrencyCode}`} />
              <Summary label={t('pos:refund.alreadyRefunded')} value={`${money(data.refundedBaseAmount)} ${data.baseCurrencyCode}`} />
              <Summary label={t('pos:refund.remaining')} value={`${money(data.remainingRefundableBaseAmount)} ${data.baseCurrencyCode}`} />
            </div>

            <section>
              <h3 className="mb-2 font-semibold">{t('pos:refund.refundLines')}</h3>
              <div className="space-y-2">
                {data.lines.map((line, index) => (
                  <div key={line.salesInvoiceLineId} className="grid items-center gap-3 rounded-xl border p-3 sm:grid-cols-[auto_1fr_140px_150px]">
                    <input
                      aria-label={`Select ${line.description}`}
                      type="checkbox"
                      disabled={mode === 'void' || line.refundableQuantity <= 0}
                      {...form.register(`lines.${index}.selected`)}
                    />
                    <div>
                      <p className="font-medium">{line.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {line.lineType === SalesLineType.Service ? `${t('pos:service')} · ${line.professionalName ?? '—'}` : `${t('pos:product')} · ${line.sku ?? '—'} · ${line.unitCode ?? ''}`}
                        {' · '}{t('pos:refund.sold')} {money(line.originalQuantity)} · {t('pos:refund.refunded')} {money(line.refundedQuantity)} · {t('pos:refund.remaining')} {money(line.refundableQuantity)}
                        {' · '}{t('pos:refund.refundable')} {money(line.refundableAmountBase)} {data.baseCurrencyCode}
                      </p>
                    </div>
                    <Field label={t('pos:refund.quantity')}>
                      <Input
                        type="number"
                        min="0"
                        max={line.refundableQuantity}
                        step="0.0001"
                        readOnly={mode === 'void'}
                        {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })}
                      />
                    </Field>
                    {line.lineType === SalesLineType.Product ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" {...form.register(`lines.${index}.restockProduct`)} /> {t('pos:refund.restockProduct')}
                      </label>
                    ) : <span className="text-xs text-muted-foreground">{t('pos:refund.noStockMovement')}</span>}
                  </div>
                ))}
              </div>
              {form.formState.errors.lines?.message && <ErrorText>{form.formState.errors.lines.message}</ErrorText>}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="font-semibold">{t('pos:refund.returnPhysicalMoney')}</h3><p className="text-xs text-muted-foreground">{t('pos:refund.returnPhysicalDesc')}</p></div>
                <Button type="button" variant="outline" size="sm" disabled={physicalDue === 0 || availableAccounts.length === 0} onClick={() => payoutFields.append({ moneyAccountId: baseAccount?.id ?? availableAccounts[0]?.id ?? '', amount: 0 })}><Plus className="size-4" /> {t('pos:refund.addAccount')}</Button>
              </div>
              {physicalDue === 0 && <p className="rounded-lg bg-muted p-3 text-sm">{t('pos:refund.noPhysicalPayoutRequired')}</p>}
              {payoutFields.fields.map((field, index) => {
                const account = accounts.find((item) => item.id === values.refundPayouts?.[index]?.moneyAccountId)
                return (
                  <div key={field.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_180px_auto]">
                    <Field label={t('pos:refund.moneyAccount')}>
                      <Select {...form.register(`refundPayouts.${index}.moneyAccountId`)}><option value="">{t('pos:refund.selectAccount')}</option>{accounts.map((item) => <option key={item.id} value={item.id} disabled={item.currentExchangeRate === null}>{item.code} — {item.name} · {item.currencyCode} · {money(item.balance)}{item.currentExchangeRate === null ? ` · ${t('pos:refund.rateMissing')}` : ''}</option>)}</Select>
                    </Field>
                    <Field label={`${t('pos:refund.refundTitle')} ${account?.currencyCode ?? ''}`}>
                      <Input type="number" min="0.0001" step="0.0001" {...form.register(`refundPayouts.${index}.amount`, { valueAsNumber: true })} />
                    </Field>
                    <Button type="button" variant="ghost" size="icon-sm" className="self-end" onClick={() => payoutFields.remove(index)}><Trash2 className="size-4" /></Button>
                    <p className="text-xs text-muted-foreground sm:col-span-3">{account?.currentExchangeRate ?? '—'} · {money(posMoneyLineBaseAmount(Number(values.refundPayouts?.[index]?.amount) || 0, account?.currentExchangeRate ?? 0))} {data.baseCurrencyCode}</p>
                  </div>
                )
              })}
              {physicalDue > 0 && baseAccount && <Button type="button" variant="secondary" size="sm" onClick={() => payoutFields.replace([{ moneyAccountId: baseAccount.id, amount: physicalDue }])}>{t('pos:refund.exactBasePayout', { amount: money(physicalDue), currency: data.baseCurrencyCode })}</Button>}
            </section>

            <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
              <Summary label={t('pos:refund.selectedRefund')} value={`${money(selectedTotal)} ${data.baseCurrencyCode}`} />
              <Summary label={t('pos:refund.arReductionFirst')} value={`${money(receivableReduction)} ${data.baseCurrencyCode}`} />
              <Summary label={t('pos:refund.physicalPayout')} value={`${money(payoutBase)} / ${money(physicalDue)} ${data.baseCurrencyCode}`} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('pos:refund.reason')}><Select {...form.register('reason', { valueAsNumber: true })}>{reasonEnumList.map((value) => <option key={value} value={value}>{getRefundReasonLabel(value, t)}</option>)}</Select></Field>
              <Field label={notesRequired ? t('pos:refund.notesRequired') : t('pos:refund.notes')} error={form.formState.errors.notes?.message}><Textarea rows={3} placeholder={t('pos:refund.notesPlaceholder')} {...form.register('notes')} /></Field>
            </div>
            {(form.formState.errors.root?.message || mutation.error) && <ErrorText>{form.formState.errors.root?.message ?? mutation.error?.message}</ErrorText>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t('common:actions.cancel')}</Button>
              <Button type="submit" variant={mode === 'void' ? 'destructive' : 'default'} disabled={!ready || mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {mutation.isPending ? t('pos:refund.posting') : mode === 'void' ? t('pos:refund.postVoid') : t('pos:refund.postRefund')}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) { return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label> }
function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`h-9 w-full rounded-md border bg-background px-3 text-sm ${className ?? ''}`} {...props} /> }
function Summary({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-mono font-semibold">{value}</p></div> }
function ErrorText({ children }: { children: ReactNode }) { return <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{children}</p> }
const money = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })
