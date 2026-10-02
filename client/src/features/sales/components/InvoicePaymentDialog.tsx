import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import { MoneyAccountAccessLevel, useMoneyAccounts, usePayment } from '@/features/finance'
import { useInvoicePaymentActions } from '../hooks/useSales'
import type { SalesInvoice, SalesInvoicePayment } from '../types/sales.types'

const schema = z.object({
  paymentDate: z.string().min(1, 'Payment date is required'),
  moneyAccountId: z.string().uuid('Select a Money Account'),
  amount: z.number().positive('Amount must be greater than zero'),
  exchangeRate: z.number().positive('Exchange rate must be greater than zero'),
  notes: z.string().max(1000, 'Maximum 1000 characters'),
  reason: z.string().max(1000, 'Maximum 1000 characters'),
}).superRefine((value, context) => {
  if (value.reason.trim().length === 0 && value.reason !== '') {
    context.addIssue({ code: 'custom', path: ['reason'], message: 'Reason cannot be blank' })
  }
})

type FormValues = z.infer<typeof schema>

interface InvoicePaymentDialogProps {
  invoice: SalesInvoice
  payment: SalesInvoicePayment | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InvoicePaymentDialog({ invoice, payment, open, onOpenChange }: InvoicePaymentDialogProps) {
  const { t } = useTranslation(['sales', 'common'])
  const paymentQuery = usePayment(payment?.paymentId)
  const actions = useInvoicePaymentActions(invoice.id)
  const accounts = useMoneyAccounts({
    page: 1,
    pageSize: 100,
    branchId: invoice.branchId,
    currencyId: invoice.currencyId,
  }, false, open).data?.data.filter((account) =>
    account.isActive
    && account.branchId === invoice.branchId
    && account.currencyId === invoice.currencyId
    && account.currentUserAccess === MoneyAccountAccessLevel.Operate
  ) ?? []
  const isEdit = payment !== null
  const loaded = paymentQuery.data
  const maxAmount = invoice.outstandingAmount + (payment?.amount ?? 0)
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentDate: invoice.invoiceDate,
      moneyAccountId: '',
      amount: Math.max(invoice.outstandingAmount, 0),
      exchangeRate: invoice.exchangeRate,
      notes: '',
      reason: '',
    },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      paymentDate: loaded?.paymentDate ?? invoice.invoiceDate,
      moneyAccountId: loaded?.moneyLines[0]?.moneyAccountId ?? '',
      amount: loaded?.amount ?? Math.max(invoice.outstandingAmount, 0),
      exchangeRate: invoice.exchangeRate,
      notes: loaded?.notes ?? '',
      reason: '',
    })
  }, [form, invoice.exchangeRate, invoice.invoiceDate, invoice.outstandingAmount, loaded, open])

  const submit = form.handleSubmit(async (value) => {
    if (value.amount > maxAmount) {
      form.setError('amount', { message: t('sales:paymentDialog.amountExceed', { max: maxAmount }) })
      return
    }
    if (isEdit && !value.reason.trim()) {
      form.setError('reason', { message: t('sales:paymentDialog.reasonRequired') })
      return
    }
    const body = {
      paymentDate: value.paymentDate,
      moneyAccountId: value.moneyAccountId,
      amount: value.amount,
      exchangeRate: invoice.currencyId === invoice.baseCurrencyId ? null : invoice.exchangeRate,
      notes: value.notes.trim() || null,
    }
    try {
      if (isEdit && loaded) {
        await actions.update.mutateAsync({
          paymentId: loaded.id,
          body: {
            ...body,
            reason: value.reason.trim(),
            expectedUpdatedAtUtc: loaded.updatedAtUtc,
          },
        })
      } else {
        await actions.create.mutateAsync(body)
      }
      onOpenChange(false)
    } catch (error) {
      form.setError('root', { message: error instanceof Error ? error.message : t('sales:paymentDialog.unableToSave') })
    }
  })

  const remove = async () => {
    if (!loaded) return
    const reason = form.getValues('reason').trim()
    if (!reason) {
      form.setError('reason', { message: t('sales:paymentDialog.deleteReasonRequired') })
      return
    }
    try {
      await actions.remove.mutateAsync({
        paymentId: loaded.id,
        reason,
        expectedUpdatedAtUtc: loaded.updatedAtUtc,
      })
      onOpenChange(false)
    } catch (error) {
      form.setError('root', { message: error instanceof Error ? error.message : t('sales:paymentDialog.unableToDelete') })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit
              ? t('sales:paymentDialog.editTitle', { docNumber: payment.paymentDocumentNumber })
              : t('sales:paymentDialog.title')}
          </DialogTitle>
          <DialogDescription>
            {t('sales:paymentDialog.desc', { currency: invoice.currencyCode, docNumber: invoice.documentNumber })}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('sales:paymentDialog.paymentDate')} error={form.formState.errors.paymentDate?.message}>
              <Input type="date" {...form.register('paymentDate')} />
            </Field>
            <Field label={t('sales:paymentDialog.amount')} error={form.formState.errors.amount?.message}>
              <Input type="number" min="0.0001" step="0.0001" {...form.register('amount', { valueAsNumber: true })} />
            </Field>
          </div>
          <Field label={t('sales:paymentDialog.moneyAccount', { currency: invoice.currencyCode })} error={form.formState.errors.moneyAccountId?.message}>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              {...form.register('moneyAccountId')}
            >
              <option value="">{t('sales:paymentDialog.selectAccount')}</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>{account.code} — {account.name}</option>
              ))}
            </select>
          </Field>
          {invoice.currencyId !== invoice.baseCurrencyId && (
            <Field label={t('sales:paymentDialog.invoiceExchangeRate')}>
              <Input readOnly value={invoice.exchangeRate} />
            </Field>
          )}
          <Field label={t('sales:paymentDialog.notes')} error={form.formState.errors.notes?.message}>
            <Textarea {...form.register('notes')} />
          </Field>
          {isEdit && (
            <Field label={t('sales:paymentDialog.correctionReason')} error={form.formState.errors.reason?.message}>
              <Textarea {...form.register('reason')} />
            </Field>
          )}
          {form.formState.errors.root?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
          )}
          <DialogFooter className="gap-2 sm:justify-between">
            {isEdit ? (
              <Button type="button" variant="destructive" onClick={remove} disabled={!loaded || actions.remove.isPending}>
                {t('sales:paymentDialog.deletePayment')}
              </Button>
            ) : <span />}
            <Button type="submit" disabled={(isEdit && !loaded) || actions.create.isPending || actions.update.isPending}>
              {isEdit ? t('sales:paymentDialog.saveCorrection') : t('sales:paymentDialog.submit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
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
