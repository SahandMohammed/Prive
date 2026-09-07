import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
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
import { useCurrentBusiness } from '@/features/business'
import { SupplierPaymentInvoiceDialog } from '../components/SupplierPaymentInvoiceDialog'
import {
  useFinanceSuppliers,
  useMoneyAccounts,
  useOutstandingInvoices,
  useSupplierPayment,
  useSupplierPaymentActions,
} from '../hooks/useFinance'
import { supplierPaymentSchema } from '../schemas/finance.schema'
import { FinanceDocumentStatus, MoneyAccountAccessLevel } from '../types/finance.types'
import type {
  OutstandingPurchaseInvoice,
  SupplierPayment,
  SupplierPaymentInput,
} from '../types/finance.types'

type FormValue = Omit<SupplierPaymentInput, 'notes'> & { notes: string }

export function SupplierPaymentPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false)

  const paymentQuery = useSupplierPayment(id)
  const actions = useSupplierPaymentActions()
  const suppliers = useFinanceSuppliers().data ?? []
  const accounts =
    useMoneyAccounts({ page: 1, pageSize: 100, isActive: true }).data?.data.filter(
      (account) => account.currentUserAccess === MoneyAccountAccessLevel.Operate
    ) ?? []
  const business = useCurrentBusiness().data
  const payment = paymentQuery.data
  const posted = payment?.status === FinanceDocumentStatus.Posted

  const form = useForm<FormValue>({
    resolver: zodResolver(supplierPaymentSchema),
    defaultValues: {
      supplierId: '',
      paymentDate: today(),
      moneyAccountId: '',
      exchangeRate: null,
      totalAmount: 0,
      notes: '',
      allocations: [],
    },
  })

  const values = useWatch({ control: form.control })
  const selectedAccount = accounts.find((account) => account.id === values.moneyAccountId)
  const selectedSupplier = suppliers.find((supplier) => supplier.id === values.supplierId)
  const currencyId = selectedAccount?.currencyId ?? payment?.currencyId
  const currencyCode = selectedAccount?.currencyCode ?? payment?.currencyCode ?? 'IQD'
  const isForeign = Boolean(currencyId && business && currencyId !== business.baseCurrencyId)

  const outstandingQuery = useOutstandingInvoices(
    posted ? undefined : values.supplierId,
    posted ? undefined : currencyId
  )
  const outstanding = outstandingQuery.data ?? []

  useEffect(() => {
    if (!payment) return
    form.reset({
      supplierId: payment.supplierId,
      paymentDate: payment.paymentDate,
      moneyAccountId: payment.moneyAccountId,
      exchangeRate: payment.exchangeRate,
      totalAmount: payment.totalAmount,
      notes: payment.notes ?? '',
      allocations: payment.allocations.map((allocation) => ({
        purchaseInvoiceId: allocation.purchaseInvoiceId,
        amount: allocation.amount,
      })),
    })
  }, [form, payment])

  const activeAllocations = useMemo(() => {
    return (values.allocations ?? []).filter(
      (item): item is { purchaseInvoiceId: string; amount: number } =>
        Boolean(item && item.purchaseInvoiceId && (Number(item.amount) || 0) > 0)
    )
  }, [values.allocations])

  const allocated = activeAllocations.reduce(
    (sum, allocation) => sum + (Number(allocation.amount) || 0),
    0
  )
  const draftRows = mergeOutstanding(outstanding, payment)
  const totalAmountNum = Number(values.totalAmount) || 0
  const unallocatedAmount = round4(totalAmountNum - allocated)
  const isBalanced = totalAmountNum > 0 && Math.abs(unallocatedAmount) < 0.0001

  const handleApplyAllocationsFromDialog = (
    newAllocations: { purchaseInvoiceId: string; amount: number }[],
    newTotal: number
  ) => {
    form.setValue('allocations', newAllocations, { shouldDirty: true, shouldValidate: true })
    form.setValue('totalAmount', newTotal, { shouldDirty: true, shouldValidate: true })
  }

  const handleRemoveAllocation = (invoiceId: string) => {
    const current = [...(form.getValues('allocations') ?? [])]
    const updated = current.filter((item) => item?.purchaseInvoiceId !== invoiceId)
    form.setValue('allocations', updated, { shouldDirty: true, shouldValidate: true })
  }

  const handleUpdateLineAmount = (invoiceId: string, val: number, max: number) => {
    const clamped = Math.min(Math.max(val, 0), max)
    const current = [...(form.getValues('allocations') ?? [])]
    const idx = current.findIndex((item) => item?.purchaseInvoiceId === invoiceId)
    if (idx >= 0) {
      if (clamped > 0) {
        current[idx] = { purchaseInvoiceId: invoiceId, amount: clamped }
      } else {
        current.splice(idx, 1)
      }
    } else if (clamped > 0) {
      current.push({ purchaseInvoiceId: invoiceId, amount: clamped })
    }
    form.setValue('allocations', current, { shouldDirty: true, shouldValidate: true })
  }

  const submit = form.handleSubmit((value) => {
    if (round4(allocated) !== round4(value.totalAmount)) {
      form.setError('root', { message: 'Payment total must equal the allocated total' })
      return
    }
    const body: SupplierPaymentInput = {
      ...value,
      exchangeRate: isForeign ? value.exchangeRate : null,
      notes: value.notes.trim() || null,
    }
    if (id) actions.update.mutate({ id, body })
    else
      actions.create.mutate(body, {
        onSuccess: (created) => navigate(`/finance/supplier-payments/${created.id}`),
      })
  })

  if (id && paymentQuery.isPending)
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  if (paymentQuery.isError) return <p className="text-destructive">{paymentQuery.error.message}</p>

  const selectableSupplier =
    payment && !suppliers.some((supplier) => supplier.id === payment.supplierId)
  const selectableAccount =
    payment && !accounts.some((account) => account.id === payment.moneyAccountId)
  const actionError =
    actions.create.error ?? actions.update.error ?? actions.post.error ?? actions.remove.error

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* TOP HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to="/finance/supplier-payments">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Supplier Payment{' '}
              <span className="font-mono text-primary">{payment?.documentNumber ?? 'New draft'}</span>
            </h1>
            <p className="text-xs text-slate-500">
              {posted
                ? 'Posted · immutable Money Account and Accounts Payable settlement history'
                : 'Draft · allocate funds against open purchase invoices/bills'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {payment && (
            <span
              className={`inline-flex rounded px-2.5 py-1 text-xs font-semibold ${
                posted
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
              }`}
            >
              {posted ? 'Posted' : 'Draft'}
            </span>
          )}
          {posted && payment && (
            <>
              <Link
                to={`/finance/money-ledger?documentNumber=${encodeURIComponent(
                  payment.documentNumber
                )}`}
              >
                <Button variant="outline" size="sm">
                  <Landmark className="size-4" />
                  Money Ledger
                </Button>
              </Link>
              {payment.journalEntryId && (
                <Link
                  to={`/accounting/journal?search=${encodeURIComponent(payment.documentNumber)}`}
                >
                  <Button variant="outline" size="sm">
                    <BookOpen className="size-4" />
                    Accounting journal
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <fieldset disabled={posted} className="space-y-5 disabled:opacity-80">
          {/* PAYMENT DETAILS CARD */}
          <Card className="border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Field label="Supplier" error={form.formState.errors.supplierId?.message}>
                <Select
                  {...form.register('supplierId', {
                    onChange: () => form.setValue('allocations', [], { shouldDirty: true }),
                  })}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                  {selectableSupplier && (
                    <option value={payment.supplierId}>
                      {payment.supplierName} (historical)
                    </option>
                  )}
                </Select>
              </Field>

              <Field label="Payment Date" error={form.formState.errors.paymentDate?.message}>
                <Input type="date" className="h-9 text-xs" {...form.register('paymentDate')} />
              </Field>

              <Field label="Funding Money Account" error={form.formState.errors.moneyAccountId?.message}>
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
                  <option value="">Select funding account</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} — {account.name} · {formatAmount(account.balance)}{' '}
                      {account.currencyCode}
                    </option>
                  ))}
                  {selectableAccount && (
                    <option value={payment.moneyAccountId}>
                      {payment.moneyAccountCode} — {payment.moneyAccountName} (historical)
                    </option>
                  )}
                </Select>
              </Field>

              <Field label="Payment Currency">
                <div className="flex h-9 items-center justify-between rounded-md border border-slate-100 bg-slate-50 px-3 font-mono text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-800/40">
                  <span>{currencyCode}</span>
                  {!isForeign && <span className="text-[10px] text-slate-400">1.0 (Base)</span>}
                </div>
              </Field>

              {isForeign && (
                <Field
                  label={`Rate: 1 ${currencyCode} in ${business?.baseCurrencyCode ?? 'base currency'}`}
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

              <Field label="Payment Total" error={form.formState.errors.totalAmount?.message}>
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
                <Field label="Notes / Memo" error={form.formState.errors.notes?.message}>
                  <Textarea rows={2} placeholder="Optional memo" {...form.register('notes')} />
                </Field>
              </div>
            </CardContent>
          </Card>

          {/* OUTSTANDING / ALLOCATED PURCHASE INVOICES */}
          {!posted && (
            <Card className="border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <CardHeader className="pb-3">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <CardTitle className="text-base font-semibold">
                      Invoices to Settle
                    </CardTitle>
                    <CardDescription>
                      Allocate payment directly to open supplier purchase bills.
                    </CardDescription>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5 bg-primarytext-primary-foregroundhover:bg-primary/90"
                    disabled={!values.supplierId || !currencyId}
                    onClick={() => setIsInvoiceDialogOpen(true)}
                  >
                    <FileText className="size-4" />
                    Choose Invoices to Pay{' '}
                    {draftRows.length > 0 ? `(${draftRows.length} available)` : ''}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-md border border-slate-100 dark:border-slate-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-700 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                        <TableHead className="px-3 font-semibold">Invoice #</TableHead>
                        <TableHead className="px-3 font-semibold">Date</TableHead>
                        <TableHead className="px-3 text-right font-semibold">Original Total</TableHead>
                        <TableHead className="px-3 text-right font-semibold">Paid So Far</TableHead>
                        <TableHead className="px-3 text-right font-semibold">Remaining Outstanding</TableHead>
                        <TableHead className="w-44 px-3 text-right font-semibold text-primary">
                          Paid Amount ({currencyCode})
                        </TableHead>
                        <TableHead className="w-12 px-2 text-center" />
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {!values.supplierId || !currencyId ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-400">
                            Select a supplier and Money Account to view open purchase bills.
                          </TableCell>
                        </TableRow>
                      ) : outstandingQuery.isPending ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-24 text-center text-xs text-slate-400">
                            <Loader2 className="mx-auto mb-1 size-5 animate-spin text-primary" />
                            Loading outstanding invoices…
                          </TableCell>
                        </TableRow>
                      ) : activeAllocations.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="h-28 text-center text-xs text-slate-400">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <p>No invoices chosen yet.</p>
                              <Button
                                type="button"
                                variant="outline"
                                size="xs"
                                className="gap-1 text-primary"
                                onClick={() => setIsInvoiceDialogOpen(true)}
                              >
                                <Plus className="size-3.5" /> Select Invoices to Pay
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        activeAllocations.map((alloc) => {
                          const invoice = draftRows.find(
                            (item) => item.id === alloc.purchaseInvoiceId
                          )
                          const maxOutstanding = invoice?.outstandingAmount ?? alloc.amount

                          return (
                            <TableRow key={alloc.purchaseInvoiceId}>
                              <TableCell className="px-3 py-2">
                                <Link
                                  className="font-mono text-xs font-bold text-primary hover:underline"
                                  to={`/purchases/invoices/${alloc.purchaseInvoiceId}`}
                                >
                                  {invoice?.documentNumber ?? 'Purchase Invoice'}
                                </Link>
                              </TableCell>
                              <TableCell className="px-3 py-2 text-xs text-slate-600 dark:text-slate-400">
                                {invoice?.invoiceDate ?? '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                                {invoice ? formatAmount(invoice.originalTotal) : '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-right font-mono text-xs text-slate-500">
                                {invoice ? formatAmount(invoice.paidAmount) : '—'}
                              </TableCell>
                              <TableCell className="px-3 py-2 text-right font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
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
                                      alloc.purchaseInvoiceId,
                                      Number(e.target.value),
                                      maxOutstanding
                                    )
                                  }
                                  className="ml-auto h-8 max-w-36 text-right font-mono text-xs font-bold text-primary"
                                />
                              </TableCell>
                              <TableCell className="px-2 py-2 text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-xs"
                                  title="Remove allocation"
                                  className="text-slate-400 hover:text-red-600"
                                  onClick={() => handleRemoveAllocation(alloc.purchaseInvoiceId)}
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
                        Payment Fully Allocated
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
                        <AlertCircle className="size-3.5 text-rose-600" />
                        Variance: {formatAmount(unallocatedAmount)} {currencyCode}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-6 text-xs">
                    <div>
                      <span className="text-slate-500">Payment Total: </span>
                      <strong className="font-mono text-slate-900 dark:text-slate-100">
                        {formatAmount(totalAmountNum)} {currencyCode}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Allocated: </span>
                      <strong className="font-mono text-emerald-600 dark:text-emerald-400">
                        {formatAmount(allocated)} {currencyCode}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Unallocated: </span>
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

        {posted && payment && (
          <Card>
            <CardHeader>
              <CardTitle>Applied Purchase Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead className="text-right">Applied Amount</TableHead>
                    <TableHead className="text-right">Base Applied</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payment.allocations.map((allocation) => (
                    <TableRow key={allocation.id}>
                      <TableCell>
                        <Link
                          className="font-mono text-primary"
                          to={`/purchases/invoices/${allocation.purchaseInvoiceId}`}
                        >
                          {allocation.purchaseInvoiceDocumentNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(allocation.amount)} {payment.currencyCode}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatAmount(allocation.baseAmount)} {payment.baseCurrencyCode}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {payment && (
          <Card>
            <CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-3">
              <Audit
                label="Created"
                value={`${payment.createdByUsername} · ${formatTimestamp(payment.createdAtUtc)}`}
              />
              <Audit label="Updated" value={formatTimestamp(payment.updatedAtUtc)} />
              <Audit
                label="Posted"
                value={payment.postedAtUtc ? formatTimestamp(payment.postedAtUtc) : 'Not posted'}
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
                Posting revalidates supplier, account access, invoice outstanding amounts, currency,
                and historical exchange rates.
              </p>
            </div>
            <div className="flex gap-2">
              {id && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={actions.remove.isPending}
                  onClick={() => {
                    if (window.confirm('Delete this Draft Supplier Payment?'))
                      actions.remove.mutate(id, {
                        onSuccess: () => navigate('/finance/supplier-payments'),
                      })
                  }}
                >
                  Delete
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
                Save Draft
              </Button>
              {id && (
                <Button
                  type="button"
                  disabled={form.formState.isDirty || actions.post.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        'Post this Supplier Payment? Money Account and Accounts Payable effects will be permanent.'
                      )
                    )
                      actions.post.mutate(id)
                  }}
                >
                  <Send className="size-4" />
                  Post Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </form>

      {/* SUPPLIER INVOICE SELECTION DIALOG */}
      {selectedSupplier && currencyId && (
        <SupplierPaymentInvoiceDialog
          open={isInvoiceDialogOpen}
          onOpenChange={setIsInvoiceDialogOpen}
          supplierName={selectedSupplier.name}
          currencyCode={currencyCode}
          invoices={draftRows}
          currentAllocations={activeAllocations}
          onApply={handleApplyAllocationsFromDialog}
        />
      )}
    </div>
  )
}

function mergeOutstanding(rows: OutstandingPurchaseInvoice[], payment: SupplierPayment | undefined) {
  if (!payment || payment.status === FinanceDocumentStatus.Posted) return rows
  const merged = [...rows]
  payment.allocations.forEach((allocation) => {
    if (merged.some((invoice) => invoice.id === allocation.purchaseInvoiceId)) return
    merged.push({
      id: allocation.purchaseInvoiceId,
      documentNumber: allocation.purchaseInvoiceDocumentNumber,
      invoiceDate: payment.paymentDate,
      supplierId: payment.supplierId,
      supplierName: payment.supplierName,
      currencyId: payment.currencyId,
      currencyCode: payment.currencyCode,
      exchangeRate: payment.exchangeRate,
      originalTotal: allocation.amount,
      paidAmount: allocation.amount,
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
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatTimestamp = (value: string) => new Date(value).toLocaleString()
