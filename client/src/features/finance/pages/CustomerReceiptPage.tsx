import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, BookOpen, Landmark, Loader2, Send } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useCurrentBusiness } from '@/features/business'
import { customerReceiptSchema } from '../schemas/finance.schema'
import { FinanceDocumentStatus, MoneyAccountAccessLevel } from '../types/finance.types'
import type { CustomerReceipt, CustomerReceiptInput, OutstandingSalesInvoice } from '../types/finance.types'
import { useCustomerReceipt, useCustomerReceiptActions, useFinanceCustomers, useMoneyAccounts, useOutstandingSalesInvoices } from '../hooks/useFinance'
import { ReceiptStatus } from './CustomerReceiptsPage'

type FormValue = Omit<CustomerReceiptInput, 'notes'> & { notes: string }

export function CustomerReceiptPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const receiptQuery = useCustomerReceipt(id)
  const actions = useCustomerReceiptActions()
  const customers = useFinanceCustomers().data ?? []
  const accounts = useMoneyAccounts({ page: 1, pageSize: 100, isActive: true }).data?.data
    .filter((account) => account.currentUserAccess === MoneyAccountAccessLevel.Operate) ?? []
  const business = useCurrentBusiness().data
  const receipt = receiptQuery.data
  const posted = receipt?.status === FinanceDocumentStatus.Posted
  const form = useForm<FormValue>({
    resolver: zodResolver(customerReceiptSchema),
    defaultValues: { customerId: '', receiptDate: today(), moneyAccountId: '', exchangeRate: 1, totalAmount: 0, notes: '', allocations: [] },
  })
  const values = useWatch({ control: form.control })
  const selectedAccount = accounts.find((account) => account.id === values.moneyAccountId)
  const currencyId = selectedAccount?.currencyId ?? receipt?.currencyId
  const currencyCode = selectedAccount?.currencyCode ?? receipt?.currencyCode
  const isForeign = Boolean(currencyId && business && currencyId !== business.baseCurrencyId)
  const outstandingQuery = useOutstandingSalesInvoices(posted ? undefined : values.customerId, posted ? undefined : currencyId)
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
      allocations: receipt.allocations.map((allocation) => ({ salesInvoiceId: allocation.salesInvoiceId, amount: allocation.amount })),
    })
  }, [form, receipt])

  const selectedAllocations = values.allocations ?? []
  const allocated = selectedAllocations.reduce((sum, allocation) => sum + (Number(allocation?.amount) || 0), 0)
  const draftRows = mergeOutstanding(outstanding, receipt)
  const setAllocation = (invoiceId: string, amount: number, maximum: number) => {
    const value = Math.min(Math.max(amount, 0), maximum)
    const current = [...form.getValues('allocations')]
    const index = current.findIndex((allocation) => allocation.salesInvoiceId === invoiceId)
    if (index >= 0) {
      if (value > 0) current[index] = { salesInvoiceId: invoiceId, amount: value }
      else current.splice(index, 1)
    } else if (value > 0) {
      current.push({ salesInvoiceId: invoiceId, amount: value })
    }
    form.setValue('allocations', current, { shouldDirty: true, shouldValidate: true })
  }

  const submit = form.handleSubmit((value) => {
    if (round4(allocated) !== round4(value.totalAmount)) {
      form.setError('root', { message: 'Receipt total must equal the allocated total' })
      return
    }
    const body: CustomerReceiptInput = { ...value, exchangeRate: isForeign ? value.exchangeRate : null, notes: value.notes.trim() || null }
    if (id) actions.update.mutate({ id, body })
    else actions.create.mutate(body, { onSuccess: (created) => navigate(`/finance/customer-receipts/${created.id}`) })
  })

  if (id && receiptQuery.isPending) return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (receiptQuery.isError) return <p className="text-destructive">{receiptQuery.error.message}</p>

  const selectableCustomer = receipt && !customers.some((customer) => customer.id === receipt.customerId)
  const selectableAccount = receipt && !accounts.some((account) => account.id === receipt.moneyAccountId)
  const actionError = actions.create.error ?? actions.update.error ?? actions.post.error ?? actions.remove.error

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to="/finance/customer-receipts"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link>
          <div>
            <h1 className="text-2xl font-bold">Customer Receipt <span className="font-mono text-[#d85430]">{receipt?.documentNumber ?? 'New draft'}</span></h1>
            <p className="text-sm text-muted-foreground">{posted ? 'Posted · immutable Money Account and Accounts Receivable history' : 'Draft · no Money Ledger, Accounting, or settlement effect yet'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {receipt && <ReceiptStatus status={receipt.status} />}
          {posted && receipt && <>
            <Link to={`/finance/money-ledger?documentNumber=${encodeURIComponent(receipt.documentNumber)}`}><Button variant="outline" size="sm"><Landmark className="size-4" />Money Ledger</Button></Link>
            {receipt.journalEntryId && <Link to={`/accounting/journal?search=${encodeURIComponent(receipt.documentNumber)}`}><Button variant="outline" size="sm"><BookOpen className="size-4" />Accounting journal</Button></Link>}
          </>}
        </div>
      </div>

      <form className="space-y-5" onSubmit={submit}>
        <fieldset disabled={posted} className="space-y-5 disabled:opacity-80">
          <Card>
            <CardHeader><CardTitle>Customer and receipt</CardTitle></CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <Field label="Customer" error={form.formState.errors.customerId?.message}>
                <Select {...form.register('customerId', { onChange: () => form.setValue('allocations', [], { shouldDirty: true }) })}>
                  <option value="">Select customer</option>
                  {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.name}</option>)}
                  {selectableCustomer && <option value={receipt.customerId}>{receipt.customerName} (historical)</option>}
                </Select>
              </Field>
              <Field label="Receipt date" error={form.formState.errors.receiptDate?.message}><Input type="date" {...form.register('receiptDate')} /></Field>
              <Field label="Money Account" error={form.formState.errors.moneyAccountId?.message}>
                <Select {...form.register('moneyAccountId', { onChange: (event) => {
                  form.setValue('allocations', [], { shouldDirty: true })
                  const account = accounts.find((item) => item.id === event.target.value)
                  form.setValue('exchangeRate', account?.currencyId === business?.baseCurrencyId ? 1 : null, { shouldDirty: true })
                } })}>
                  <option value="">Select account</option>
                  {accounts.map((account) => <option key={account.id} value={account.id}>{account.code} — {account.name} · {formatAmount(account.balance)} {account.currencyCode}</option>)}
                  {selectableAccount && <option value={receipt.moneyAccountId}>{receipt.moneyAccountCode} — {receipt.moneyAccountName} (historical)</option>}
                </Select>
              </Field>
              <Field label="Receipt currency"><Input value={currencyCode ?? ''} readOnly /></Field>
              {isForeign && <Field label={`Rate: 1 ${currencyCode ?? ''} in ${business?.baseCurrencyCode ?? 'base currency'}`} error={form.formState.errors.exchangeRate?.message}><Input type="number" min="0.000001" step="0.000001" {...form.register('exchangeRate', { setValueAs: (value) => value === '' ? null : Number(value), onChange: () => form.setValue('allocations', [], { shouldDirty: true }) })} /></Field>}
              <Field label="Receipt total" error={form.formState.errors.totalAmount?.message}><Input type="number" min="0.0001" step="0.0001" {...form.register('totalAmount', { valueAsNumber: true })} /></Field>
              <Field label="Notes" error={form.formState.errors.notes?.message}><Textarea rows={2} {...form.register('notes')} /></Field>
            </CardContent>
          </Card>

          {!posted && <Card>
            <CardHeader><CardTitle>Outstanding Sales Invoices</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded border">
                <Table>
                  <TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Original</TableHead><TableHead className="text-right">Received</TableHead><TableHead className="text-right">Outstanding</TableHead><TableHead className="text-right">Historical rate</TableHead><TableHead className="text-right">Allocate</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {!values.customerId || !currencyId ? <Message text="Select a customer and Money Account." /> : outstandingQuery.isPending ? <Message text="Loading outstanding invoices…" /> : draftRows.length === 0 ? <Message text={`No outstanding invoices in ${currencyCode ?? 'this currency'}.`} /> : draftRows.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell><Link className="font-mono text-[#d85430]" to={`/sales/invoices/${invoice.id}`}>{invoice.documentNumber}</Link></TableCell>
                        <TableCell>{invoice.invoiceDate}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(invoice.originalTotal)}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(invoice.receivedAmount)}</TableCell>
                        <TableCell className="text-right font-mono font-semibold">{formatAmount(invoice.outstandingAmount)}</TableCell>
                        <TableCell className={isForeign && Number(values.exchangeRate) > 0 && invoice.exchangeRate !== Number(values.exchangeRate) ? 'text-right font-mono text-destructive' : 'text-right font-mono'}>{invoice.exchangeRate}</TableCell>
                        <TableCell><Input className="ml-auto max-w-36 text-right" type="number" min="0" max={invoice.outstandingAmount} step="0.0001" disabled={isForeign && Number(values.exchangeRate) > 0 && invoice.exchangeRate !== Number(values.exchangeRate)} value={selectedAllocations.find((allocation) => allocation?.salesInvoiceId === invoice.id)?.amount ?? ''} onChange={(event) => setAllocation(invoice.id, Number(event.target.value), invoice.outstandingAmount)} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-wrap justify-end gap-6 rounded bg-muted p-3 text-sm">
                <span>Receipt: <b className="font-mono">{formatAmount(Number(values.totalAmount) || 0)} {currencyCode}</b></span>
                <span>Allocated: <b className="font-mono">{formatAmount(allocated)} {currencyCode}</b></span>
                <span>Unallocated: <b className="font-mono">{formatAmount((Number(values.totalAmount) || 0) - allocated)} {currencyCode}</b></span>
                {isForeign && <span>Base equivalent: <b className="font-mono">{formatAmount((Number(values.totalAmount) || 0) * (Number(values.exchangeRate) || 0))} {business?.baseCurrencyCode}</b></span>}
              </div>
            </CardContent>
          </Card>}
        </fieldset>

        {posted && receipt && <Card>
          <CardHeader><CardTitle>Applied Sales Invoices</CardTitle></CardHeader>
          <CardContent><Table><TableHeader><TableRow><TableHead>Invoice</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Invoice total</TableHead><TableHead className="text-right">Applied</TableHead><TableHead className="text-right">Base applied</TableHead></TableRow></TableHeader><TableBody>{receipt.allocations.map((allocation) => <TableRow key={allocation.id}><TableCell><Link className="font-mono text-[#d85430]" to={`/sales/invoices/${allocation.salesInvoiceId}`}>{allocation.salesInvoiceDocumentNumber}</Link></TableCell><TableCell>{allocation.salesInvoiceDate}</TableCell><TableCell className="text-right font-mono">{formatAmount(allocation.salesInvoiceTotal)} {receipt.currencyCode}</TableCell><TableCell className="text-right font-mono">{formatAmount(allocation.amount)} {receipt.currencyCode}</TableCell><TableCell className="text-right font-mono">{formatAmount(allocation.baseAmount)} {receipt.baseCurrencyCode}</TableCell></TableRow>)}</TableBody></Table></CardContent>
        </Card>}

        {receipt && <Card><CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-3"><Audit label="Created" value={`${receipt.createdByUsername} · ${formatTimestamp(receipt.createdAtUtc)}`} /><Audit label="Updated" value={formatTimestamp(receipt.updatedAtUtc)} /><Audit label="Posted" value={receipt.postedAtUtc ? formatTimestamp(receipt.postedAtUtc) : 'Not posted'} /></CardContent></Card>}

        {!posted && <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>{form.formState.errors.root?.message && <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>}{actionError && <p className="text-sm text-destructive">{actionError.message}</p>}<p className="text-xs text-muted-foreground">Posting revalidates customer, account access, invoice outstanding amounts, currency, and historical exchange rates.</p></div>
          <div className="flex gap-2">
            {id && <Button type="button" variant="destructive" disabled={actions.remove.isPending} onClick={() => { if (window.confirm('Delete this Draft Customer Receipt?')) actions.remove.mutate(id, { onSuccess: () => navigate('/finance/customer-receipts') }) }}>Delete</Button>}
            <Button type="submit" variant="outline" disabled={actions.create.isPending || actions.update.isPending || actions.post.isPending}>{(actions.create.isPending || actions.update.isPending) && <Loader2 className="size-4 animate-spin" />}Save Draft</Button>
            {id && <Button type="button" disabled={form.formState.isDirty || actions.post.isPending} onClick={() => { if (window.confirm('Post this Customer Receipt? Money Account and Accounts Receivable effects will be permanent.')) actions.post.mutate(id) }}><Send className="size-4" />Post Receipt</Button>}
          </div>
        </div>}
      </form>
    </div>
  )
}

function mergeOutstanding(rows: OutstandingSalesInvoice[], receipt: CustomerReceipt | undefined) {
  if (!receipt || receipt.status === FinanceDocumentStatus.Posted) return rows
  const merged = [...rows]
  receipt.allocations.forEach((allocation) => {
    if (merged.some((invoice) => invoice.id === allocation.salesInvoiceId)) return
    merged.push({ id: allocation.salesInvoiceId, documentNumber: allocation.salesInvoiceDocumentNumber, invoiceDate: allocation.salesInvoiceDate, customerId: receipt.customerId, customerName: receipt.customerName, currencyId: receipt.currencyId, currencyCode: receipt.currencyCode, exchangeRate: receipt.exchangeRate, originalTotal: allocation.salesInvoiceTotal, receivedAmount: allocation.salesInvoiceTotal, outstandingAmount: 0 })
  })
  return merged
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label> }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...props} /> }
function Message({ text }: { text: string }) { return <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">{text}</TableCell></TableRow> }
function Audit({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div> }
const today = () => new Date().toISOString().slice(0, 10)
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatTimestamp = (value: string) => new Date(value).toLocaleString()
