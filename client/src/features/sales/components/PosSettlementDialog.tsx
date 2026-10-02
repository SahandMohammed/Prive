import { useEffect, useMemo } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
import { MoneyAccountType, PaymentMoneyDirection, PaymentOrigin, usePayment } from '@/features/finance'
import { PosPaymentMode, useCorrectPosSettlement, usePosSetup } from '@/features/pos'
import { SalesInvoicePaymentStatus, type SalesInvoice } from '../types/sales.types'

const schema = z.object({
  paymentMode: z.union([
    z.literal(PosPaymentMode.Paid),
    z.literal(PosPaymentMode.Partial),
    z.literal(PosPaymentMode.Credit),
  ]),
  collections: z.array(z.object({
    moneyAccountId: z.string().uuid(),
    amount: z.number().min(0, 'Amount cannot be negative'),
  })),
  changeMoneyAccountId: z.string(),
  changeAmount: z.number().min(0, 'Change cannot be negative'),
  reason: z.string().trim().min(1, 'A correction reason is required').max(1000),
}).superRefine((value, context) => {
  const collectionTotal = value.collections.reduce((sum, collection) => sum + collection.amount, 0)
  if (value.paymentMode !== PosPaymentMode.Credit && collectionTotal <= 0) {
    context.addIssue({ code: 'custom', path: ['collections'], message: 'Add at least one collection amount' })
  }
  if (value.paymentMode === PosPaymentMode.Credit && collectionTotal > 0) {
    context.addIssue({ code: 'custom', path: ['collections'], message: 'Credit sales cannot contain collection money lines' })
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
  const { t } = useTranslation(['sales', 'common'])
  const correction = useCorrectPosSettlement(invoice.id)
  const setup = usePosSetup().data
  const paymentReference = invoice.payments.find((payment) => payment.origin === PaymentOrigin.Pos)
  const payment = usePayment(paymentReference?.paymentId).data
  const accounts = useMemo(
    () => setup?.moneyAccounts.filter((account) => account.branchId === invoice.branchId) ?? [],
    [invoice.branchId, setup?.moneyAccounts]
  )
  const changeAccounts = accounts.filter((account) =>
    account.type === MoneyAccountType.Cashbox && account.currencyId === invoice.baseCurrencyId)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: valuesFromInvoice(invoice, accounts, payment),
  })
  const collections = useFieldArray({ control: form.control, name: 'collections' })
  const mode = useWatch({ control: form.control, name: 'paymentMode' })

  useEffect(() => {
    if (open) form.reset(valuesFromInvoice(invoice, accounts, payment))
  }, [accounts, form, invoice, open, payment])

  const submit = form.handleSubmit(async (value) => {
    try {
      await correction.mutateAsync({
        paymentMode: value.paymentMode,
        collections: value.paymentMode === PosPaymentMode.Credit
          ? []
          : value.collections.filter((collection) => collection.amount > 0),
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
      form.setError('root', { message: error instanceof Error ? error.message : t('sales:posSettlementDialog.unableToCorrect') })
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('sales:posSettlementDialog.title')}</DialogTitle>
          <DialogDescription>{t('sales:posSettlementDialog.desc', { docNumber: invoice.documentNumber })}</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <Field label={t('sales:posSettlementDialog.paymentMode')} error={form.formState.errors.paymentMode?.message}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={mode}
              onChange={(event) => form.setValue('paymentMode', Number(event.target.value) as FormValues['paymentMode'], { shouldValidate: true })}
            >
              <option value={PosPaymentMode.Paid}>{t('sales:posSettlementDialog.paid')}</option>
              <option value={PosPaymentMode.Partial}>{t('sales:posSettlementDialog.partial')}</option>
              <option value={PosPaymentMode.Credit}>{t('sales:posSettlementDialog.credit')}</option>
            </select>
          </Field>

          {mode !== PosPaymentMode.Credit && (
            <div className="grid gap-3 sm:grid-cols-2">
              {collections.fields.map((field, index) => {
                const account = accounts.find((item) => item.id === field.moneyAccountId)
                return (
                  <Field
                    key={field.id}
                    label={`${account?.code ?? 'Account'} · ${account?.currencyCode ?? ''}`}
                    error={form.formState.errors.collections?.[index]?.amount?.message}
                  >
                    <Input type="number" min="0" step="0.0001" {...form.register(`collections.${index}.amount`, { valueAsNumber: true })} />
                  </Field>
                )
              })}
            </div>
          )}
          {typeof form.formState.errors.collections?.message === 'string' && (
            <p className="text-xs text-destructive">{form.formState.errors.collections.message}</p>
          )}

          {mode === PosPaymentMode.Paid && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('sales:posSettlementDialog.changeCashbox')} error={form.formState.errors.changeMoneyAccountId?.message}>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" {...form.register('changeMoneyAccountId')}>
                  <option value="">{t('sales:posSettlementDialog.noChange')}</option>
                  {changeAccounts.map((account) => (
                    <option key={account.id} value={account.id}>{account.code} — {account.currencyCode}</option>
                  ))}
                </select>
              </Field>
              <Field label={t('sales:posSettlementDialog.changeAmount')} error={form.formState.errors.changeAmount?.message}>
                <Input type="number" min="0" step="0.0001" {...form.register('changeAmount', { valueAsNumber: true })} />
              </Field>
            </div>
          )}

          <Field label={t('sales:posSettlementDialog.correctionReason')} error={form.formState.errors.reason?.message}>
            <Textarea {...form.register('reason')} />
          </Field>
          {form.formState.errors.root?.message && <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>}
          <DialogFooter>
            <Button type="submit" disabled={correction.isPending}>{t('sales:posSettlementDialog.saveCorrection')}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function valuesFromInvoice(
  invoice: SalesInvoice,
  accounts: Array<{ id: string; currencyId: string }>,
  payment: ReturnType<typeof usePayment>['data']
): FormValues {
  const collectionLines = payment?.moneyLines.filter((line) => line.direction === PaymentMoneyDirection.Collection) ?? []
  const changeLine = payment?.moneyLines.find((line) => line.direction === PaymentMoneyDirection.Change)
  const paymentMode = invoice.paymentStatus === SalesInvoicePaymentStatus.Unpaid
    ? PosPaymentMode.Credit
    : invoice.paymentStatus === SalesInvoicePaymentStatus.PartiallyPaid
      ? PosPaymentMode.Partial
      : PosPaymentMode.Paid
  return {
    paymentMode,
    collections: accounts.map((account) => ({
      moneyAccountId: account.id,
      amount: collectionLines.find((line) => line.moneyAccountId === account.id)?.amount ?? 0,
    })),
    changeMoneyAccountId: changeLine?.moneyAccountId ?? '',
    changeAmount: changeLine?.amount ?? 0,
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
