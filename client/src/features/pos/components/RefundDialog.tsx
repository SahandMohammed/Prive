import { useEffect, useMemo, type ReactNode, type SelectHTMLAttributes } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Plus, Trash2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { SalesLineType } from '@/features/sales'
import { usePosRefundability, usePostPosRefund, useVoidPosSale } from '../hooks/usePos'
import { posTenderBaseAmount, roundPosMoney } from '../lib/posMoney'
import { posRefundPreview } from '../lib/posRefund'
import { posRefundSchema, type PosRefundValues } from '../schemas/pos.schema'
import { PosRefundReason, type PosRefund, type PosSession, type PosSetup } from '../types/pos.types'

const reasons = [
  [PosRefundReason.WrongServiceEntered, 'Wrong service entered'],
  [PosRefundReason.WrongProductEntered, 'Wrong product entered'],
  [PosRefundReason.CustomerComplaint, 'Customer complaint'],
  [PosRefundReason.DuplicateSale, 'Duplicate sale'],
  [PosRefundReason.ProductReturned, 'Product returned'],
  [PosRefundReason.ServiceIssue, 'Service issue'],
  [PosRefundReason.CashierMistake, 'Cashier mistake'],
  [PosRefundReason.Other, 'Other'],
] as const

export function RefundDialog({
  saleId,
  session,
  setup,
  mode,
  open,
  onOpenChange,
  onCompleted,
}: {
  saleId: string
  session: PosSession
  setup: PosSetup
  mode: 'refund' | 'void'
  open: boolean
  onOpenChange: (open: boolean) => void
  onCompleted: (refund: PosRefund) => void
}) {
  const refundability = usePosRefundability(saleId, open)
  const postRefund = usePostPosRefund()
  const voidSale = useVoidPosSale()
  const resetPostRefund = postRefund.reset
  const resetVoidSale = voidSale.reset
  const mutation = mode === 'void' ? voidSale : postRefund
  const accounts = useMemo(
    () => setup.moneyAccounts.filter((account) => account.branchId === session.branchId),
    [session.branchId, setup.moneyAccounts]
  )
  const availableAccounts = accounts.filter((account) => account.currentExchangeRate !== null)
  const baseAccount = availableAccounts.find(
    (account) => account.currencyId === setup.baseCurrencyId && account.currentExchangeRate === 1
  )
  const form = useForm<PosRefundValues>({
    resolver: zodResolver(posRefundSchema),
    defaultValues: { reason: PosRefundReason.CustomerComplaint, notes: '', lines: [], refundTenders: [] },
  })
  const tenderFields = useFieldArray({ control: form.control, name: 'refundTenders' })
  const values = useWatch({ control: form.control })
  const data = refundability.data

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
      refundTenders: physical > 0 && baseAccount ? [{ moneyAccountId: baseAccount.id, amount: physical }] : [],
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
  const tenderBase = roundPosMoney((values.refundTenders ?? []).reduce((sum, tender) => {
    const account = accounts.find((item) => item.id === tender?.moneyAccountId)
    return sum + posTenderBaseAmount(Number(tender?.amount) || 0, account?.currentExchangeRate ?? 0)
  }, 0))
  const tendersValid = (values.refundTenders ?? []).every((tender) => {
    const account = accounts.find((item) => item.id === tender?.moneyAccountId)
    return Boolean(account?.currentExchangeRate) && Number(tender?.amount) > 0
      && Number(tender?.amount) <= (account?.balance ?? 0)
  })
  const linesValid = preview.quantitiesValid
  const selectedProductWithoutRestock = (values.lines ?? []).some((value, index) =>
    value?.selected && data?.lines[index]?.lineType === SalesLineType.Product && !value.restockProduct
  )
  const notesRequired = values.reason === PosRefundReason.Other || selectedProductWithoutRestock
  const ready = selectedTotal > 0 && linesValid && tendersValid && tenderBase === physicalDue
    && (!notesRequired || Boolean(values.notes?.trim()))

  const submit = form.handleSubmit((value) => {
    if (!ready || !data) {
      form.setError('root', { message: 'Resolve the highlighted refund quantities, notes, and physical refund total.' })
      return
    }
    const tenders = value.refundTenders.map(({ moneyAccountId, amount }) => ({ moneyAccountId, amount }))
    const options = { onSuccess: (refund: PosRefund) => { onOpenChange(false); onCompleted(refund) } }
    if (mode === 'void') {
      voidSale.mutate({ saleId, body: {
        posSessionId: session.id,
        reason: value.reason,
        notes: value.notes || null,
        restockSalesInvoiceLineIds: value.lines
          .filter((line, index) => line.selected && data.lines[index].lineType === SalesLineType.Product && line.restockProduct)
          .map((line) => line.salesInvoiceLineId),
        refundTenders: tenders,
      } }, options)
      return
    }
    postRefund.mutate({ saleId, body: {
      posSessionId: session.id,
      reason: value.reason,
      notes: value.notes || null,
      lines: value.lines.filter((line) => line.selected).map((line) => ({
        salesInvoiceLineId: line.salesInvoiceLineId,
        quantity: line.quantity,
        restockProduct: line.restockProduct,
      })),
      refundTenders: tenders,
    } }, options)
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[96vh] overflow-y-auto sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{mode === 'void' ? 'Void remaining sale' : 'Refund sale'}</DialogTitle>
          <DialogDescription>
            {mode === 'void' ? 'Reverse every still-refundable line.' : 'Choose the exact lines and quantities to reverse.'} The original sale remains immutable.
          </DialogDescription>
        </DialogHeader>
        {refundability.isPending && <p className="py-10 text-center text-sm text-muted-foreground">Loading refund position…</p>}
        {refundability.isError && <ErrorText>{refundability.error.message}</ErrorText>}
        {data && (
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-3 rounded-xl bg-muted/50 p-4 sm:grid-cols-4 lg:grid-cols-8">
              <Summary label="Sale" value={data.posSaleDocumentNumber} />
              <Summary label="Invoice" value={data.salesInvoiceDocumentNumber} />
              <Summary label="Customer" value={data.customerName ?? 'Walk-in'} />
              <Summary label="Original date" value={new Date(data.completedAtUtc).toLocaleString()} />
              <Summary label="Cashier" value={data.cashierUsername} />
              <Summary label="Original" value={`${money(data.originalTotalBase)} ${data.baseCurrencyCode}`} />
              <Summary label="Already refunded" value={`${money(data.refundedBaseAmount)} ${data.baseCurrencyCode}`} />
              <Summary label="Remaining" value={`${money(data.remainingRefundableBaseAmount)} ${data.baseCurrencyCode}`} />
            </div>

            <section>
              <h3 className="mb-2 font-semibold">Refund lines</h3>
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
                        {line.lineType === SalesLineType.Service ? `Service · ${line.professionalName ?? 'No professional'}` : `Product · ${line.sku ?? 'No SKU'} · ${line.unitCode ?? ''}`}
                        {' · '}sold {money(line.originalQuantity)} · refunded {money(line.refundedQuantity)} · remaining {money(line.refundableQuantity)}
                        {' · '}refundable {money(line.refundableAmountBase)} {data.baseCurrencyCode}
                      </p>
                    </div>
                    <Field label="Quantity">
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
                        <input type="checkbox" {...form.register(`lines.${index}.restockProduct`)} /> Restock product
                      </label>
                    ) : <span className="text-xs text-muted-foreground">No stock movement</span>}
                  </div>
                ))}
              </div>
              {form.formState.errors.lines?.message && <ErrorText>{form.formState.errors.lines.message}</ErrorText>}
            </section>

            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div><h3 className="font-semibold">Return physical money</h3><p className="text-xs text-muted-foreground">The open receivable is reduced first; only the remainder leaves Money Accounts.</p></div>
                <Button type="button" variant="outline" size="sm" disabled={physicalDue === 0 || availableAccounts.length === 0} onClick={() => tenderFields.append({ moneyAccountId: baseAccount?.id ?? availableAccounts[0]?.id ?? '', amount: 0 })}><Plus className="size-4" /> Add account</Button>
              </div>
              {physicalDue === 0 && <p className="rounded-lg bg-muted p-3 text-sm">No physical payout is required. This refund only reduces Accounts Receivable.</p>}
              {tenderFields.fields.map((field, index) => {
                const account = accounts.find((item) => item.id === values.refundTenders?.[index]?.moneyAccountId)
                return (
                  <div key={field.id} className="grid gap-3 rounded-xl border p-3 sm:grid-cols-[1fr_180px_auto]">
                    <Field label="Money Account">
                      <Select {...form.register(`refundTenders.${index}.moneyAccountId`)}><option value="">Select account</option>{accounts.map((item) => <option key={item.id} value={item.id} disabled={item.currentExchangeRate === null}>{item.code} — {item.name} · {item.currencyCode} · balance {money(item.balance)}{item.currentExchangeRate === null ? ' · rate missing' : ''}</option>)}</Select>
                    </Field>
                    <Field label={`Refund ${account?.currencyCode ?? ''}`}>
                      <Input type="number" min="0.0001" step="0.0001" {...form.register(`refundTenders.${index}.amount`, { valueAsNumber: true })} />
                    </Field>
                    <Button type="button" variant="ghost" size="icon-sm" className="self-end" onClick={() => tenderFields.remove(index)}><Trash2 className="size-4" /></Button>
                    <p className="text-xs text-muted-foreground sm:col-span-3">Current rate snapshot: {account?.currentExchangeRate ?? '—'} · base equivalent {money(posTenderBaseAmount(Number(values.refundTenders?.[index]?.amount) || 0, account?.currentExchangeRate ?? 0))} {data.baseCurrencyCode}</p>
                  </div>
                )
              })}
              {physicalDue > 0 && baseAccount && <Button type="button" variant="secondary" size="sm" onClick={() => tenderFields.replace([{ moneyAccountId: baseAccount.id, amount: physicalDue }])}>Exact base payout · {money(physicalDue)} {data.baseCurrencyCode}</Button>}
            </section>

            <div className="grid gap-3 rounded-xl bg-muted p-4 sm:grid-cols-3">
              <Summary label="Selected refund" value={`${money(selectedTotal)} ${data.baseCurrencyCode}`} />
              <Summary label="AR reduction first" value={`${money(receivableReduction)} ${data.baseCurrencyCode}`} />
              <Summary label="Physical payout" value={`${money(tenderBase)} / ${money(physicalDue)} ${data.baseCurrencyCode}`} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Reason"><Select {...form.register('reason', { valueAsNumber: true })}>{reasons.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
              <Field label={notesRequired ? 'Notes (required)' : 'Notes'} error={form.formState.errors.notes?.message}><Textarea rows={3} placeholder="Operational context for the audit trail" {...form.register('notes')} /></Field>
            </div>
            {(form.formState.errors.root?.message || mutation.error) && <ErrorText>{form.formState.errors.root?.message ?? mutation.error?.message}</ErrorText>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" variant={mode === 'void' ? 'destructive' : 'default'} disabled={!ready || mutation.isPending}>
                {mutation.isPending && <Loader2 className="size-4 animate-spin" />}
                {mutation.isPending ? 'Posting…' : mode === 'void' ? 'Post void reversal' : 'Post refund'}
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
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
