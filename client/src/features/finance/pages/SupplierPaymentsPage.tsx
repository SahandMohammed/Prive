import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { supplierPaymentSchema } from '../schemas/finance.schema'
import { FinanceDocumentStatus } from '../types/finance.types'
import type { SupplierPaymentInput } from '../types/finance.types'
import {
  useFinanceSuppliers,
  useMoneyAccounts,
  useOutstandingInvoices,
  useSupplierPaymentActions,
  useSupplierPayments,
} from '../hooks/useFinance'

type FormValue = Omit<SupplierPaymentInput, 'notes'> & { notes: string }
export function SupplierPaymentsPage() {
  const query = useSupplierPayments({ page: 1, pageSize: 100 })
  const suppliers = useFinanceSuppliers().data ?? []
  const accounts =
    useMoneyAccounts({ page: 1, pageSize: 100, isActive: true }).data?.data.filter(
      (item) => item.currentUserAccess === 1
    ) ?? []
  const actions = useSupplierPaymentActions()
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
  const account = accounts.find((item) => item.id === values.moneyAccountId)
  const invoices = useOutstandingInvoices(values.supplierId, account?.currencyId).data ?? []
  const allocated = (values.allocations ?? []).reduce(
    (sum, item) => sum + (Number(item?.amount) || 0),
    0
  )
  const setAllocation = (invoiceId: string, value: number) => {
    const current = [...(form.getValues('allocations') ?? [])]
    const index = current.findIndex((item) => item.purchaseInvoiceId === invoiceId)
    if (index >= 0) {
      if (value > 0) current[index] = { purchaseInvoiceId: invoiceId, amount: value }
      else current.splice(index, 1)
    } else if (value > 0) current.push({ purchaseInvoiceId: invoiceId, amount: value })
    form.setValue('allocations', current, { shouldDirty: true, shouldValidate: true })
  }
  const submit = form.handleSubmit((value) => {
    if (round(allocated) !== round(value.totalAmount)) {
      form.setError('root', { message: 'Payment total must equal the allocated total' })
      return
    }
    actions.create.mutate(
      { ...value, notes: value.notes.trim() || null },
      {
        onSuccess: () =>
          form.reset({
            supplierId: '',
            paymentDate: today(),
            moneyAccountId: '',
            exchangeRate: null,
            totalAmount: 0,
            notes: '',
            allocations: [],
          }),
      }
    )
  })
  const rows = query.data?.data ?? []
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Supplier Payments</h1>
        <p className="text-sm text-muted-foreground">
          Fully allocated payments settle posted Purchase Invoices. Posting atomically updates AP,
          the Money Ledger, and invoice outstanding amounts.
        </p>
      </header>
      <Card>
        <CardHeader>
          <CardTitle>Payment documents</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document / date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Money Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <Message />
              ) : (
                rows.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <p className="font-mono font-semibold">{payment.documentNumber}</p>
                      <p className="text-xs text-muted-foreground">{payment.paymentDate}</p>
                    </TableCell>
                    <TableCell>{payment.supplierName}</TableCell>
                    <TableCell>{payment.moneyAccountCode}</TableCell>
                    <TableCell className="text-right font-mono">
                      {money(payment.totalAmount)} {payment.currencyCode}
                    </TableCell>
                    <TableCell>{payment.status === 1 ? 'Posted' : 'Draft'}</TableCell>
                    <TableCell>{payment.createdByUsername}</TableCell>
                    <TableCell>
                      {payment.status === FinanceDocumentStatus.Draft && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              if (window.confirm(`Post ${payment.documentNumber}?`))
                                actions.post.mutate(payment.id)
                            }}
                          >
                            Post
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => actions.remove.mutate(payment.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          {(actions.post.error ?? actions.remove.error) && (
            <p className="mt-3 text-sm text-destructive">
              {(actions.post.error ?? actions.remove.error)?.message}
            </p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>New Supplier Payment draft</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-5" onSubmit={submit}>
            <div className="grid gap-3 md:grid-cols-5">
              <Field label="Supplier">
                <Select
                  {...form.register('supplierId', {
                    onChange: () => form.setValue('allocations', []),
                  })}
                >
                  <option value="">Select supplier</option>
                  {suppliers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Date">
                <Input type="date" {...form.register('paymentDate')} />
              </Field>
              <Field label="Money Account">
                <Select
                  {...form.register('moneyAccountId', {
                    onChange: () => form.setValue('allocations', []),
                  })}
                >
                  <option value="">Select account</option>
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {money(item.balance)} {item.currencyCode}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Exchange rate (foreign currency only)">
                <Input
                  type="number"
                  min="0.000001"
                  step="0.000001"
                  {...form.register('exchangeRate', {
                    setValueAs: (value) => (value === '' ? null : Number(value)),
                  })}
                />
              </Field>
              <Field label="Payment total">
                <Input
                  type="number"
                  min="0.0001"
                  step="0.0001"
                  {...form.register('totalAmount', { valueAsNumber: true })}
                />
              </Field>
            </div>
            <Field label="Notes">
              <Input {...form.register('notes')} />
            </Field>
            <div className="overflow-x-auto rounded border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Original</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Allocate</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!values.supplierId || !account ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        Select a supplier and Money Account.
                      </TableCell>
                    </TableRow>
                  ) : invoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No outstanding invoices in {account.currencyCode}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">{invoice.documentNumber}</TableCell>
                        <TableCell>{invoice.invoiceDate}</TableCell>
                        <TableCell className="text-right">{money(invoice.originalTotal)}</TableCell>
                        <TableCell className="text-right">{money(invoice.paidAmount)}</TableCell>
                        <TableCell className="text-right font-semibold">
                          {money(invoice.outstandingAmount)}
                        </TableCell>
                        <TableCell>
                          <Input
                            className="ml-auto max-w-36 text-right"
                            type="number"
                            min="0"
                            max={invoice.outstandingAmount}
                            step="0.0001"
                            value={
                              values.allocations?.find(
                                (item) => item?.purchaseInvoiceId === invoice.id
                              )?.amount ?? ''
                            }
                            onChange={(event) =>
                              setAllocation(invoice.id, Number(event.target.value))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-end gap-6 rounded bg-muted p-3 text-sm">
              <span>
                Payment: <b className="font-mono">{money(Number(values.totalAmount) || 0)}</b>
              </span>
              <span>
                Allocated: <b className="font-mono">{money(allocated)}</b>
              </span>
              <span>
                Unallocated:{' '}
                <b className="font-mono">{money((Number(values.totalAmount) || 0) - allocated)}</b>
              </span>
            </div>
            {form.formState.errors.root?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}
            {actions.create.error && (
              <p className="text-sm text-destructive">{actions.create.error.message}</p>
            )}
            <Button disabled={actions.create.isPending}>Save payment draft</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-medium">
      {label}
      {children}
    </label>
  )
}
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="h-9 rounded-md border bg-background px-3 text-sm" {...props} />
}
function Message() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
        No Supplier Payments found.
      </TableCell>
    </TableRow>
  )
}
const today = () => new Date().toISOString().slice(0, 10)
const money = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const round = (value: number) => Math.round(value * 10000) / 10000
