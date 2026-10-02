import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  FileText,
  Landmark,
  Loader2,
  Plus,
  Send,
  Trash2,
} from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { formatDate, formatDateTime, formatNumber } from '@/lib/i18n'
import { useCurrentBusiness } from '@/features/business'
import { CustomerReceiptInvoiceDialog } from '../components/CustomerReceiptInvoiceDialog'
import {
  useCustomerReceipt,
  useCustomerReceiptActions,
  useFinanceCustomers,
  useMoneyAccounts,
  useOutstandingSalesInvoices,
} from '../hooks/useFinance'
import { customerReceiptSchema } from '../schemas/finance.schema'
import { FinanceDocumentStatus, MoneyAccountAccessLevel } from '../types/finance.types'
import type {
  CustomerReceipt,
  CustomerReceiptInput,
  OutstandingSalesInvoice,
} from '../types/finance.types'
import { ReceiptStatus } from './CustomerReceiptsPage'

type FormValue = Omit<CustomerReceiptInput, 'notes'> & { notes: string }

export function CustomerReceiptPage() {
  const { t } = useTranslation(['finance', 'common'])
  const { id } = useParams()
  const navigate = useNavigate()
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)

  const receiptQuery = useCustomerReceipt(id)
  const actions = useCustomerReceiptActions()
  const customers = useFinanceCustomers().data ?? []
  const accounts =
    useMoneyAccounts({ page: 1, pageSize: 100, isActive: true }).data?.data.filter(
      (account) => account.currentUserAccess === MoneyAccountAccessLevel.Operate
    ) ?? []
  const business = useCurrentBusiness().data
  const receipt = receiptQuery.data
  const posted = receipt?.status === FinanceDocumentStatus.Posted

  const form = useForm<FormValue>({
    resolver: zodResolver(customerReceiptSchema),
    defaultValues: {
      customerId: '',
      receiptDate: today(),
      moneyAccountId: '',
      exchangeRate: 1,
      totalAmount: 0,
      notes: '',
      allocations: [],
    },
  })

  const values = useWatch({ control: form.control })
  const selectedAccount = accounts.find((account) => account.id === values.moneyAccountId)
  const selectedCustomer = customers.find((customer) => customer.id === values.customerId)
  const currencyId = selectedAccount?.currencyId ?? receipt?.currencyId
  const currencyCode = selectedAccount?.currencyCode ?? receipt?.currencyCode ?? 'IQD'
  const isForeign = Boolean(currencyId && business && currencyId !== business.baseCurrencyId)

  const outstandingQuery = useOutstandingSalesInvoices(
    posted ? undefined : values.customerId,
    posted ? undefined : currencyId
  )
  const outstanding = outstandingQuery.data ?? []

  useEffect(() => {
    if (!receipt) return
    form.reset({
      customerId: receipt.customerId,
      receiptDate: receipt.receiptDate,
      moneyAccountId: receipt.moneyAccountId,
      exchangeRate: receipt.exchangeRate,
      totalAmount: receipt.totalAmount,
      notes: receipt.notes ?? '',
      allocations: receipt.allocations.map((allocation) => ({
        salesInvoiceId: allocation.salesInvoiceId,
        amount: allocation.amount,
      })),
    })
  }, [form, receipt])

  const activeAllocations = useMemo(() => {
    return (values.allocations ?? []).filter(
      (item): item is { salesInvoiceId: string; amount: number } =>
        Boolean(item && item.salesInvoiceId && (Number(item.amount) || 0) > 0)
    )
  }, [values.allocations])

  const allocated = activeAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.amount) || 0),
    0
  )
  const draftRows = mergeOutstanding(outstanding, receipt)
  const totalAmountNum = Number(values.totalAmount) || 0
  const unallocatedAmount = round4(totalAmountNum - allocated)
  const isBalanced = totalAmountNum > 0 && Math.abs(unallocatedAmount) < 0.0001

  const handleApplyAllocationsFromDialog = (
    newAllocations: { salesInvoiceId: string; amount: number }[],
    newTotal: number
  ) => {
    form.setValue('allocations', newAllocations, { shouldDirty: true, shouldValidate: true })
    form.setValue('totalAmount', newTotal, { shouldDirty: true, shouldValidate: true })
  }

  const handleRemoveAllocation = (invoiceId: string) => {
    const current = [...(form.getValues('allocations') ?? [])]
    const updated = current.filter((item) => item?.salesInvoiceId !== invoiceId)
    form.setValue('allocations', updated, { shouldDirty: true, shouldValidate: true })
  }

  const handleUpdateLineAmount = (invoiceId: string, val: number, max: number) => {
    const clamped = Math.min(Math.max(val, 0), max)
    const current = [...(form.getValues('allocations') ?? [])]
    const idx = current.findIndex((item) => item?.salesInvoiceId === invoiceId)
    if (idx >= 0) {
      if (clamped > 0) {
        current[idx] = { salesInvoiceId: invoiceId, amount: clamped }
      } else {
        current.splice(idx, 1)
      }
    } else if (clamped > 0) {
      current.push({ salesInvoiceId: invoiceId, amount: clamped })
    }
    form.setValue('allocations', current, { shouldDirty: true, shouldValidate: true })
  }

  const submit = form.handleSubmit((value) => {
    if (round4(allocated) !== round4(value.totalAmount)) {
      form.setError('root', { message: t('finance:customerReceiptPage.totalAllocatedMismatch') })
      return
    }
    const body: CustomerReceiptInput = {
      ...value,
      exchangeRate: isForeign ? value.exchangeRate : null,
      notes: value.notes.trim() || null,
    }
    if (id) actions.update.mutate({ id, body })
    else
      actions.create.mutate(body, {
        onSuccess: (created) => navigate(`/finance/customer-receipts/${created.id}`),
      })
  })

  if (id && receiptQuery.isPending)
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  if (receiptQuery.isError) return <p className="text-destructive">{receiptQuery.error.message}</p>

  const selectableCustomer =
    receipt && !customers.some((customer) => customer.id === receipt.customerId)
  const selectableAccount =
    receipt && !accounts.some((account) => account.id === receipt.moneyAccountId)
  const actionError =
    actions.create.error ?? actions.update.error ?? actions.post.error ?? actions.remove.error

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* TOP HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to="/finance/customer-receipts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t('finance:customerReceiptPage.title')}{' '}
              <span className="font-mono text-primary">{receipt?.documentNumber ?? t('finance:customerReceiptPage.newDraft')}</span>
            </h1>
            <p className="text-xs text-slate-500">
              {posted
                ? t('finance:customerReceiptPage.descriptionPosted')
                : t('finance:customerReceiptPage.descriptionDraft')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {receipt && <ReceiptStatus status={receipt.status} />}
          {receipt && (
            <Link to={`/finance/customers/${receipt.customerId}/account`}>
              <Button variant="outline" size="sm">
                <BookOpen className="size-4" />
                {t('finance:customerReceiptPage.customerAccount')}
              </Button>
            </Link>
          )}
          {posted && receipt && (
            <>
              <Link
                to={`/finance/money-ledger?documentNumber=${encodeURIComponent(
                  receipt.paymentDocumentNumber ?? receipt.documentNumber
                )}`}
              >
                <Button variant="outline" size="sm">
                  <Landmark className="size-4" />
                  {t('finance:customerReceiptPage.moneyLedger')}
                </Button>
              </Link>
              {receipt.paymentJournalEntryId && (
                <Link
                  to={`/accounting/journal?search=${encodeURIComponent(receipt.paymentDocumentNumber ?? receipt.documentNumber)}`}
                >
                  <Button variant="outline" size="sm">
                    <BookOpen className="size-4" />
                    {t('finance:customerReceiptPage.accountingJournal')}
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <fieldset disabled={posted} className="space-y-5 disabled:opacity-80">
          {/* CUSTOMER & RECEIPT DETAILS CARD */}
          <Card className="border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">{t('finance:customerReceiptPage.receiptDetails')}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Field label={t('finance:customerReceiptPage.customer')} error={form.formState.errors.customerId?.message}>
                <Select
                  {...form.register('customerId', {
                    onChange: () => form.setValue('allocations', [], { shouldDirty: true }),
                  })}
                >
                  <option value="">{t('finance:customerReceiptPage.selectCustomer')}</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                  {selectableCustomer && (
                    <option value={receipt.customerId}>
                      {receipt.customerName}
                    </option>
                  )}
                </Select>
              </Field>

              <Field label={t('finance:customerReceiptPage.receiptDate')} error={form.formState.errors.receiptDate?.message}>
                <Input type="date" className="h-9 text-xs" {...form.register('receiptDate')} />
              </Field>

              <Field label={t('finance:customerReceiptPage.receivingAccount')} error={form.formState.errors.moneyAccountId?.message}>
                <Select
                  {...form.register('moneyAccountId', {
                    onChange: (event) => {
                      form.setValue('allocations', [], { shouldDirty: true })
                      const account = accounts.find((item) => item.id === event.target.value)
                      form.setValue(
                        'exchangeRate',
                        account?.currencyId === business?.baseCurrencyId ? 1 : null,
                        { shouldDirty: true }
                      )
                    },
                  })}
                >
                  <option value="">{t('finance:customerReceiptPage.selectAccount')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} — {account.name} · {formatAmount(account.balance)}{' '}
                      {account.currencyCode}
                    </option>
                  ))}
                  {selectableAccount && (
                    <option value={receipt.moneyAccountId}>
                      {receipt.moneyAccountCode} — {receipt.moneyAccountName}
                    </option>
                  )}
                </Select>
              </Field>

              <Field label={t('finance:customerReceiptPage.receiptCurrency')}>
                <div className="flex h-9 items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 font-mono text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                  <span>{currencyCode}</span>
                  {!isForeign && <span className="text-[10px] text-slate-400">{t('finance:customerReceiptPage.baseRate')}</span>}
                </div>
              </Field>

              {isForeign && (
                <Field
                  label={t('finance:customerReceiptPage.rateLabel', {
                    currency: currencyCode,
                    baseCurrency: business?.baseCurrencyCode ?? '',
                  })}
                  error={form.formState.errors.exchangeRate?.message}
                >
                  <Input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    className="h-9 font-mono text-xs"
                    {...form.register('exchangeRate', {
                      setValueAs: (value) => (value === '' ? null : Number(value)),
                      onChange: () => form.setValue('allocations', [], { shouldDirty: true }),
                    })}
                  />
                </Field>
              )}

              <Field label={t('finance:customerReceiptPage.receiptTotal')} error={form.formState.errors.totalAmount?.message}>
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  placeholder="0.00"
                  className="h-9 font-mono text-xs font-bold text-slate-900 dark:text-slate-100"
                  {...form.register('totalAmount', { valueAsNumber: true })}
                />
              </Field>

              <div className="md:col-span-3">
                <Field label={t('finance:customerReceiptPage.notes')} error={form.formState.errors.notes?.message}>
                  <Textarea rows={2} placeholder={t('finance:customerReceiptPage.notesPlaceholder')} {...form.register('notes')} />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* OUTSTANDING / ALLOCATED SALES INVOICES */}
          {!posted && (
            <Card className="border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="pb-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      {t('finance:customerReceiptPage.invoicesToSettle')}
                    </CardTitle>
                    <CardDescription>
                      {t('finance:customerReceiptPage.invoicesToSettleDesc')}
                    </CardDescription>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    disabled={!values.customerId || !currencyId}
                    onClick={() => setIsInvoiceDialogOpen(true)}
                  >
                    <FileText className="size-4" />
                    {t('finance:customerReceiptPage.chooseInvoices')}{' '}
                    {draftRows.length > 0 ? t('finance:customerReceiptPage.availableCount', { count: draftRows.length }) : ''}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border border-slate-100 dark:border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                        <TableHead className="px-3 text-start font-semibold">{t('finance:customerReceiptPage.th.invoice')}</TableHead>
                        <TableHead className="px-3 text-start font-semibold">{t('finance:customerReceiptPage.th.date')}</TableHead>
                        <TableHead className="px-3 text-end font-semibold">{t('finance:customerReceiptPage.th.originalTotal')}</TableHead>
                        <TableHead className="px-3 text-end font-semibold">{t('finance:customerReceiptPage.th.receivedSoFar')}</TableHead>
                        <TableHead className="px-3 text-end font-semibold">{t('finance:customerReceiptPage.th.remainingOutstanding')}</TableHead>
                        <TableHead className="w-44 px-3 text-end font-semibold text-primary">
                          {t('finance:customerReceiptPage.th.settledAmount', { currency: currencyCode })}
                        </TableHead>
                        <TableHead className="w-12 px-2 text-center" />
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {!values.customerId || !currencyId ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-400">
                            {t('finance:customerReceiptPage.selectCustomerAndAccount')}
                          </TableCell>
                        </TableRow>
                      ) : outstandingQuery.isPending ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-400">
                            <Loader2 className="mx-auto mb-1 size-5 animate-spin text-primary" />
                            {t('finance:customerReceiptPage.loadingInvoices')}
                          </TableCell>
                        </TableRow>
                      ) : activeAllocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-28 text-center text-xs text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <p>{t('finance:customerReceiptPage.noInvoicesChosen')}</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="gap-1 text-primary"
                                onClick={() => setIsInvoiceDialogOpen(true)}
                              >
                                <Plus className="size-3.5" /> {t('finance:customerReceiptPage.selectInvoicesBtn')}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeAllocations.map((alloc) => {
                          const invoice = draftRows.find(
                            (item) => item.id === alloc.salesInvoiceId
                          )
                          const maxOutstanding = invoice?.outstandingAmount ?? alloc.amount

                          return (
                            <TableRow key={alloc.salesInvoiceId}>
                              <TableCell className="px-3 py-2 text-start">
                                <Link
                                  className="font-mono text-xs font-bold text-primary hover:underline"
                                  to={`/sales/invoices/${alloc.salesInvoiceId}`}
                                >
                                  {invoice?.documentNumber ?? 'Sales Invoice'}
                                </Link>
                              </TableCell>
                              <TableCell className="px-3 py-2 text-start text-xs text-slate-600 dark:text-slate-400">
                                {invoice?.invoiceDate ? formatDate(invoice.invoiceDate) : '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-end font-mono text-xs text-slate-600 dark:text-slate-400">
                                {invoice ? formatAmount(invoice.originalTotal) : '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-end font-mono text-xs text-slate-500">
                                {invoice ? formatAmount(invoice.collectedAmount) : '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-end font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                                {invoice ? formatAmount(invoice.outstandingAmount) : '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max={maxOutstanding}
                                  step="0.0001"
                                  value={alloc.amount > 0 ? alloc.amount : ''}
                                  onChange={(e) =>
                                    handleUpdateLineAmount(
                                      alloc.salesInvoiceId,
                                      Number(e.target.value),
                                      maxOutstanding
                                    )
                                  }
                                  className="ms-auto h-8 max-w-36 text-end font-mono text-xs font-bold text-primary"
                                />
                              </TableCell>
                              <TableCell className="px-2 py-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title={t('finance:customerReceiptPage.removeAllocation')}
                                  className="text-slate-400 hover:text-red-600"
                                  onClick={() => handleRemoveAllocation(alloc.salesInvoiceId)}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* LIVE TOTALS & VARIANCE SUMMARY */}
                <div className="mt-4 flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/40">
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                        <CheckCircle2 className="size-3.5 text-emerald-600" />
                        {t('finance:customerReceiptPage.receiptFullyAllocated')}
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        <AlertCircle className="size-3.5 text-rose-600" />
                        {t('finance:customerReceiptPage.variance', {
                          amount: formatAmount(unallocatedAmount),
                          currency: currencyCode,
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-500">{t('finance:customerReceiptPage.receiptTotal')}: </span>
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {formatAmount(totalAmountNum)} {currencyCode}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('finance:customerReceiptPage.allocated')} </span>
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                        {formatAmount(allocated)} {currencyCode}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">{t('finance:customerReceiptPage.unallocated')} </span>
                      <strong
                        className={`font-mono ${
                          unallocatedAmount === 0 ? 'text-slate-600' : 'text-rose-600'
                        }`}
                      >
                        {formatAmount(unallocatedAmount)} {currencyCode}
                      </strong>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </fieldset>

        {posted && receipt && (
          <Card>
            <CardHeader>
              <CardTitle>{t('finance:customerReceiptPage.appliedInvoices')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-start">{t('finance:customerReceiptPage.th.invoice')}</TableHead>
                    <TableHead className="text-start">{t('finance:customerReceiptPage.th.date')}</TableHead>
                    <TableHead className="text-end">{t('finance:customerReceiptPage.th.originalTotal')}</TableHead>
                    <TableHead className="text-end">{t('finance:customerReceiptPage.th.applied')}</TableHead>
                    <TableHead className="text-end">{t('finance:customerReceiptPage.th.baseApplied')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell className="text-start">
                        <Link
                          className="font-mono text-primary"
                          to={`/sales/invoices/${allocation.salesInvoiceId}`}
                        >
                          {allocation.salesInvoiceDocumentNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-start">{formatDate(allocation.salesInvoiceDate)}</TableCell>
                      <TableCell className="text-end font-mono">
                        {formatAmount(allocation.salesInvoiceTotal)} {receipt.currencyCode}
                      </TableCell>
                      <TableCell className="text-end font-mono">
                        {formatAmount(allocation.amount)} {receipt.currencyCode}
                      </TableCell>
                      <TableCell className="text-end font-mono">
                        {formatAmount(allocation.baseAmount)} {receipt.baseCurrencyCode}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {receipt && (
          <Card>
            <CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-3">
              <Audit
                label={t('finance:customerReceiptPage.created')}
                value={`${receipt.createdByUsername} · ${formatTimestamp(receipt.createdAtUtc)}`}
              />
              <Audit label={t('finance:customerReceiptPage.updated')} value={formatTimestamp(receipt.updatedAtUtc)} />
              <Audit
                label={t('finance:customerReceiptPage.posted')}
                value={receipt.postedAtUtc ? formatTimestamp(receipt.postedAtUtc) : t('finance:customerReceiptPage.notPosted')}
              />
            </CardContent>
          </Card>
        )}

        {!posted && (
          <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              {form.formState.errors.root?.message && (
                <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
              )}
              {actionError && <p className="text-sm text-destructive">{actionError.message}</p>}
              <p className="text-xs text-muted-foreground">
                {t('finance:customerReceiptPage.postingNotice')}
              </p>
            </div>
            <div className="flex gap-2">
              {id && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={actions.remove.isPending}
                  onClick={() => {
                    if (window.confirm(t('finance:customerReceiptPage.deleteConfirm')))
                      actions.remove.mutate(id, {
                        onSuccess: () => navigate('/finance/customer-receipts'),
                      })
                  }}
                >
                  {t('common:actions.delete')}
                </Button>
              )}
              <Button
                type="submit"
                variant="outline"
                disabled={actions.create.isPending || actions.update.isPending || actions.post.isPending}
              >
                {(actions.create.isPending || actions.update.isPending) && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                {t('finance:customerReceiptPage.saveDraft')}
              </Button>
              {id && (
                <Button
                  type="button"
                  disabled={form.formState.isDirty || actions.post.isPending}
                  onClick={() => {
                    if (
                      window.confirm(t('finance:customerReceiptPage.postConfirm'))
                    )
                      actions.post.mutate(id)
                  }}
                >
                  <Send className="size-4" />
                  {t('finance:customerReceiptPage.postReceipt')}
                </Button>
              )}
            </div>
          </div>
        )}
      </form>

      {/* CUSTOMER INVOICE SELECTION DIALOG */}
      {selectedCustomer && currencyId && (
        <CustomerReceiptInvoiceDialog
          open={isInvoiceDialogOpen}
          onOpenChange={setIsInvoiceDialogOpen}
          customerName={selectedCustomer.name}
          currencyCode={currencyCode}
          invoices={draftRows}
          currentAllocations={activeAllocations}
          onApply={handleApplyAllocationsFromDialog}
        />
      )}
    </div>
  )
}

function mergeOutstanding(rows: OutstandingSalesInvoice[], receipt: CustomerReceipt | undefined) {
  if (!receipt || receipt.status === FinanceDocumentStatus.Posted) return rows
  const merged = [...rows]
  receipt.allocations.forEach((allocation) => {
    if (merged.some((invoice) => invoice.id === allocation.salesInvoiceId)) return
    merged.push({
      id: allocation.salesInvoiceId,
      documentNumber: allocation.salesInvoiceDocumentNumber,
      invoiceDate: allocation.salesInvoiceDate,
      customerId: receipt.customerId,
      customerName: receipt.customerName,
      currencyId: receipt.currencyId,
      currencyCode: receipt.currencyCode,
      exchangeRate: receipt.exchangeRate,
      originalTotal: allocation.salesInvoiceTotal,
      collectedAmount: allocation.salesInvoiceTotal,
      outstandingAmount: 0,
    })
  })
  return merged
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="grid content-start gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </label>
  )
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...props} />
}
function Audit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1">{value}</p>
    </div>
  )
}
const today = () => new Date().toISOString().slice(0, 10)
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000
const formatAmount = (value: number) =>
  formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatTimestamp = (value: string) => formatDateTime(value)
