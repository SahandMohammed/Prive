import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PosPaymentMode, useCorrectPosSettlement } from '@/features/pos'
import type { SalesInvoice } from '../types/sales.types'

const schema = z.object({
  paymentMode: z.union([
    z.literal(PosPaymentMode.Paid),
    z.literal(PosPaymentMode.Partial),
    z.literal(PosPaymentMode.Credit),
  ]),
  tenders: z.array(z.object({
    moneyAccountId: z.string().uuid(),
    amount: z.number().min(0, 'Amount cannot be negative'),
  })),
  changeMoneyAccountId: z.string(),
  changeAmount: z.number().min(0, 'Change cannot be negative'),
  reason: z.string().trim().min(1, 'A correction reason is required').max(1000),
}).superRefine((value, context) => {
  const tenderTotal = value.tenders.reduce((sum, tender) => sum + tender.amount, 0)
  if (value.paymentMode !== PosPaymentMode.Credit && tenderTotal <= 0) {
    context.addIssue({ code: 'custom', path: ['tenders'], message: 'Add at least one tender amount' })
  }
  if (value.paymentMode === PosPaymentMode.Credit && tenderTotal > 0) {
    context.addIssue({ code: 'custom', path: ['tenders'], message: 'Credit sales cannot contain tenders' })
  }
  if (value.paymentMode !== PosPaymentMode.Paid && value.changeAmount > 0) {
    context.addIssue({ code: 'custom', path: ['changeAmount'], message: 'Only a paid sale can return change' })
  }
  if (value.changeAmount > 0 && !z.string().uuid().safeParse(value.changeMoneyAccountId).success) {
    context.addIssue({ code: 'custom', path: ['changeMoneyAccountId'], message: 'Select the change account' })
  }
})

type FormValues = z.infer<typeof schema>

export function PosSettlementDialog({
  invoice,
  open,
  onOpenChange,
}: {
  invoice: SalesInvoice
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const context = invoice.posContext!
  const correction = useCorrectPosSettlement(invoice.id)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesFromInvoice(invoice),
  })
  const tenders = useFieldArray({ control: form.control, name: 'tenders' })
  const mode = form.watch('paymentMode')

  useEffect(() => {
    if (open) form.reset(valuesFromInvoice(invoice))
  }, [form, invoice, open])

  const submit = form.handleSubmit(async (value) => {
    try {
      await correction.mutateAsync({
        paymentMode: value.paymentMode,
        tenders: value.paymentMode === PosPaymentMode.Credit
          ? []
          : value.tenders.filter((tender) => tender.amount > 0),
        change: value.paymentMode === PosPaymentMode.Paid
          && value.changeAmount > 0
          && value.changeMoneyAccountId
          ? { moneyAccountId: value.changeMoneyAccountId, amount: value.changeAmount }
          : null,
        reason: value.reason.trim(),
        expectedUpdatedAtUtc: invoice.updatedAtUtc,
      })
      onOpenChange(false)
    } catch (error) {
      form.setError('root', { message: error instanceof Error ? error.message : 'Unable to correct POS settlement' })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Correct POS Payment</DialogTitle>
          <DialogDescription>
            Update tender and change for {invoice.documentNumber}. The checkout Payment is corrected in place.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label="Payment mode" error={form.formState.errors.paymentMode?.message}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={mode}
              onChange={(event) => form.setValue('paymentMode', Number(event.target.value) as FormValues['paymentMode'], { shouldValidate: true })}
            >
              <option value={PosPaymentMode.Paid}>Paid</option>
              <option value={PosPaymentMode.Partial}>Partial</option>
              <option value={PosPaymentMode.Credit}>Credit</option>
            </select>
          </Field>

          {mode !== PosPaymentMode.Credit && (
            <div className="grid gap-3 sm:grid-cols-2">
              {tenders.fields.map((field, index) => {
                const cashbox = context.sessionCashboxes.find((item) => item.moneyAccountId === field.moneyAccountId)
                return (
                  <Field
                    key={field.id}
                    label={`${cashbox?.moneyAccountCode ?? 'Cashbox'} · ${cashbox?.currencyCode ?? ''}`}
                    error={form.formState.errors.tenders?.[index]?.amount?.message}
                  >
                    <Input type="number" min="0" step="0.0001" {...form.register(`tenders.${index}.amount`, { valueAsNumber: true })} />
                  </Field>
                )
              })}
            </div>
          )}
          {typeof form.formState.errors.tenders?.message === 'string' && (
            <p className="text-xs text-destructive">{form.formState.errors.tenders.message}</p>
          )}

          {mode === PosPaymentMode.Paid && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Change cashbox" error={form.formState.errors.changeMoneyAccountId?.message}>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register('changeMoneyAccountId')}>
                  <option value="">No change</option>
                  {context.sessionCashboxes.map((cashbox) => (
                    <option key={cashbox.moneyAccountId} value={cashbox.moneyAccountId}>
                      {cashbox.moneyAccountCode} — {cashbox.currencyCode}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Change amount" error={form.formState.errors.changeAmount?.message}>
                <Input type="number" min="0" step="0.0001" {...form.register('changeAmount', { valueAsNumber: true })} />
              </Field>
            </div>
          )}

          <Field label="Correction reason" error={form.formState.errors.reason?.message}>
            <Textarea {...form.register('reason')} />
          </Field>
          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={correction.isPending}>Save POS correction</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function valuesFromInvoice(invoice: SalesInvoice): FormValues {
  const context = invoice.posContext!
  return {
    paymentMode: context.paymentMode,
    tenders: context.sessionCashboxes.map((cashbox) => ({
      moneyAccountId: cashbox.moneyAccountId,
      amount: context.tenders.find((tender) => tender.moneyAccountId === cashbox.moneyAccountId)?.tenderedAmount ?? 0,
    })),
    changeMoneyAccountId: context.change?.moneyAccountId
      ?? context.sessionCashboxes.find((cashbox) => cashbox.currencyId === invoice.baseCurrencyId)?.moneyAccountId
      ?? '',
    changeAmount: context.change?.amount ?? 0,
    reason: '',
  }
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
