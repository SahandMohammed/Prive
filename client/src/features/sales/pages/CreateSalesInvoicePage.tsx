import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, BookOpen, BriefcaseBusiness, Loader2, Package, PackageSearch, Send, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBranches, useCurrencies, useCurrentBusiness } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useProducts, useStockBalances, useWarehouses } from '@/features/inventory'
import { salesInvoiceSchema } from '../schemas/sales.schemas'
import { useDeleteSalesInvoice, usePostSalesInvoice, useSalesInvoice, useSaveSalesInvoice, useServices } from '../hooks/useSales'
import { SalesInvoicePaymentStatus, SalesInvoiceStatus, SalesLineType } from '../types/sales.types'
import type { SalesInvoiceDraftInput, SalesLineType as SalesLineTypeValue } from '../types/sales.types'
import { SalesStatusBadge } from './SalesInvoicesPage'

interface LineForm {
  lineType: SalesLineTypeValue
  serviceId: string
  productId: string
  unitOfMeasureId: string
  description: string
  quantity: number
  unitPrice: number
}

interface InvoiceForm {
  customerId: string
  invoiceDate: string
  branchId: string
  warehouseId: string
  currencyId: string
  exchangeRate: number | null
  notes: string
  lines: LineForm[]
}

const today = () => new Date().toISOString().slice(0, 10)
const newServiceLine = (): LineForm => ({ lineType: SalesLineType.Service, serviceId: '', productId: '', unitOfMeasureId: '', description: '', quantity: 1, unitPrice: 0 })
const newProductLine = (): LineForm => ({ lineType: SalesLineType.Product, serviceId: '', productId: '', unitOfMeasureId: '', description: '', quantity: 1, unitPrice: 0 })

export function CreateSalesInvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoiceQuery = useSalesInvoice(id)
  const save = useSaveSalesInvoice(id)
  const post = usePostSalesInvoice()
  const remove = useDeleteSalesInvoice()
  const customers = useContacts({ page: 1, pageSize: 100, role: 0, isActive: true }).data?.data ?? []
  const branches = useBranches().data?.data ?? []
  const warehouses = useWarehouses().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const business = useCurrentBusiness().data
  const services = useServices({ page: 1, pageSize: 100, isActive: true }).data?.data ?? []
  const products = useProducts().data?.data ?? []
  const form = useForm<InvoiceForm>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: { customerId: '', invoiceDate: today(), branchId: '', warehouseId: '', currencyId: '', exchangeRate: 1, notes: '', lines: [newServiceLine()] },
  })
  const lineFields = useFieldArray({ control: form.control, name: 'lines' })
  const values = useWatch({ control: form.control })
  const invoice = invoiceQuery.data
  const posted = invoice?.status === SalesInvoiceStatus.Posted
  const selectedCurrencyId = values.currencyId ?? ''
  const isForeign = Boolean(selectedCurrencyId && business && selectedCurrencyId !== business.baseCurrencyId)
  const rate = isForeign ? Number(values.exchangeRate) || 0 : 1
  const hasProductLines = (values.lines ?? []).some((line) => line?.lineType === SalesLineType.Product)
  const balances = useStockBalances({ warehouseId: values.warehouseId || undefined }).data?.data ?? []

  useEffect(() => {
    if (!invoice) return
    form.reset({
      customerId: invoice.customerId ?? '',
      invoiceDate: invoice.invoiceDate,
      branchId: invoice.branchId,
      warehouseId: invoice.warehouseId ?? '',
      currencyId: invoice.currencyId,
      exchangeRate: invoice.exchangeRate,
      notes: invoice.notes ?? '',
      lines: invoice.lines.map((line) => ({
        lineType: line.lineType,
        serviceId: line.serviceId ?? '',
        productId: line.productId ?? '',
        unitOfMeasureId: line.unitOfMeasureId ?? '',
        description: line.description ?? '',
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    })
  }, [invoice, form])

  useEffect(() => {
    if (id || !business || form.getValues('currencyId')) return
    form.setValue('currencyId', business.baseCurrencyId)
  }, [business, form, id])

  const selectableCustomers = [...customers]
  if (invoice?.customerId && !selectableCustomers.some((item) => item.id === invoice.customerId))
    selectableCustomers.push({ id: invoice.customerId, name: invoice.customerName ?? 'Historical customer', kind: 0, isCustomer: true, isSupplier: false, primaryPhoneNumber: null, secondaryPhoneNumber: null, email: null, address: null, city: null, region: null, country: null, notes: null, isActive: false })

  const selectableServices = [...services]
  invoice?.lines.filter((line) => line.lineType === SalesLineType.Service).forEach((line) => {
    if (line.serviceId && !selectableServices.some((item) => item.id === line.serviceId)) selectableServices.push({ id: line.serviceId, name: line.serviceName ?? 'Historical Service', categoryId: '', categoryName: 'Historical', sellingPriceBase: round4(line.unitPrice * invoice.exchangeRate), durationMinutes: 1, revenueAccountId: '', revenueAccountCode: '', revenueAccountName: '', isActive: false, description: null })
  })

  const selectableProducts = [...products.filter((item) => item.isActive && item.trackInventory && (item.purpose === 0 || item.purpose === 2))]
  invoice?.lines.filter((line) => line.lineType === SalesLineType.Product).forEach((line) => {
    if (line.productId && !selectableProducts.some((item) => item.id === line.productId)) selectableProducts.push({ id: line.productId, name: line.productName ?? 'Historical Product', sku: line.sku ?? '', barcode: null, categoryId: '', categoryName: '', unitOfMeasureId: line.unitOfMeasureId ?? '', unitCode: line.unitCode ?? '', purpose: 0, sellingPriceBase: round4(line.unitPrice * invoice.exchangeRate), trackInventory: true, isActive: false, description: null, totalQuantity: 0, averageCostBase: 0, totalValueBase: 0 })
  })

  const availableWarehouses = warehouses.filter((item) => (posted || item.isActive) && item.branchId === values.branchId)
  const subtotal = (values.lines ?? []).reduce((sum, line) => sum + (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0), 0)
  const baseTotal = (values.lines ?? []).reduce((sum, line) => sum + (Number(line?.quantity) || 0) * round4((Number(line?.unitPrice) || 0) * rate), 0)

  const submit = form.handleSubmit((value) => {
    if (isForeign && (!value.exchangeRate || value.exchangeRate <= 0)) {
      form.setError('exchangeRate', { message: 'Exchange rate is required for a foreign-currency sale' })
      return
    }
    const body: SalesInvoiceDraftInput = {
      customerId: value.customerId || null,
      invoiceDate: value.invoiceDate,
      branchId: value.branchId,
      warehouseId: value.warehouseId || null,
      currencyId: value.currencyId,
      exchangeRate: isForeign ? value.exchangeRate : null,
      notes: value.notes.trim() || null,
      lines: value.lines.map((line) => ({
        lineType: line.lineType,
        serviceId: line.lineType === SalesLineType.Service ? line.serviceId : null,
        productId: line.lineType === SalesLineType.Product ? line.productId : null,
        unitOfMeasureId: line.lineType === SalesLineType.Product ? line.unitOfMeasureId : null,
        description: line.description.trim() || null,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      })),
    }
    save.mutate(body, { onSuccess: (saved) => navigate(`/sales/invoices/${saved.id}`) })
  })

  if (id && invoiceQuery.isPending) return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (invoiceQuery.isError) return <p className="text-destructive">{invoiceQuery.error.message}</p>

  return <div className="flex h-full flex-col space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><Link to="/sales/invoices"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link><div><h1 className="text-2xl font-bold">Sales Invoice <span className="font-mono text-[#d85430]">{invoice?.documentNumber ?? 'New draft'}</span></h1><p className="text-sm text-muted-foreground">{posted ? 'Posted · immutable Revenue, Receivable, and Inventory history' : 'Draft · no Accounting or Inventory effect yet'}</p></div></div><div className="flex flex-wrap items-center gap-2">{invoice && <SalesStatusBadge status={invoice.status} />}{posted && invoice && <><Link to={`/inventory/ledger?documentNumber=${encodeURIComponent(invoice.documentNumber)}`}><Button variant="outline" size="sm"><PackageSearch className="size-4" />Stock ledger</Button></Link>{invoice.journalEntryId && <Link to={`/accounting/journal?search=${encodeURIComponent(invoice.documentNumber)}`}><Button variant="outline" size="sm"><BookOpen className="size-4" />Accounting journal</Button></Link>}</>}</div></div>

    <form onSubmit={submit} className="space-y-5"><fieldset disabled={posted} className="space-y-5 disabled:opacity-80">
      <Card><CardHeader><CardTitle>Customer and fulfilment</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-4">
        <Field label="Customer" error={form.formState.errors.customerId?.message}><Select {...form.register('customerId')}><option value="">Walk-in draft (customer required to post)</option>{selectableCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}</Select></Field>
        <Field label="Invoice date" error={form.formState.errors.invoiceDate?.message}><Input type="date" {...form.register('invoiceDate')} /></Field>
        <Field label="Branch" error={form.formState.errors.branchId?.message}><Select {...form.register('branchId', { onChange: () => form.setValue('warehouseId', '', { shouldDirty: true }) })}><option value="">Select branch</option>{branches.filter((item) => posted || item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>
        <Field label={hasProductLines ? 'Product warehouse' : 'Warehouse (optional)'} error={form.formState.errors.warehouseId?.message}><Select {...form.register('warehouseId')}><option value="">{hasProductLines ? 'Select warehouse' : 'No Product fulfilment'}</option>{availableWarehouses.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>
        <Field label="Currency" error={form.formState.errors.currencyId?.message}><Select {...form.register('currencyId', { onChange: (event) => { if (event.target.value === business?.baseCurrencyId) form.setValue('exchangeRate', 1, { shouldDirty: true }) } })}><option value="">Select currency</option>{currencies.filter((item) => posted || item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>
        {isForeign && <Field label={`Rate: 1 ${currencies.find((item) => item.id === selectedCurrencyId)?.code ?? ''} in ${business?.baseCurrencyCode ?? 'base currency'}`} error={form.formState.errors.exchangeRate?.message}><Input type="number" min="0.000001" step="0.000001" {...form.register('exchangeRate', { setValueAs: (value) => value === '' ? null : Number(value) })} /></Field>}
        <Field label="Notes" error={form.formState.errors.notes?.message}><Textarea rows={2} {...form.register('notes')} /></Field>
      </CardContent></Card>

      <Card><CardHeader><CardTitle>Services and Products</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-sm"><thead><tr className={head}><th>Type</th><th>Service or Product</th><th>Description</th><th>Unit / stock</th><th className="text-right">Quantity</th><th className="text-right">Unit price</th><th className="text-right">Total</th><th /></tr></thead><tbody>{lineFields.fields.map((field, index) => {
        const line = values.lines?.[index]
        const isService = line?.lineType === SalesLineType.Service
        const selectedProduct = selectableProducts.find((item) => item.id === line?.productId)
        const stock = balances.find((item) => item.productId === selectedProduct?.id)?.quantity ?? 0
        const lineTotal = (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0)
        const sourceRegistration = isService ? form.register(`lines.${index}.serviceId`) : form.register(`lines.${index}.productId`)
        return <tr key={field.id} className="border-b align-top"><td className="p-2"><LineTypeBadge lineType={line?.lineType ?? SalesLineType.Service} /><input type="hidden" {...form.register(`lines.${index}.lineType`, { valueAsNumber: true })} /></td><td className="p-2"><Select {...sourceRegistration} onChange={(event) => {
          sourceRegistration.onChange(event)
          if (isService) {
            const selected = selectableServices.find((item) => item.id === event.target.value)
            form.setValue(`lines.${index}.unitPrice`, rate > 0 ? round4((selected?.sellingPriceBase ?? 0) / rate) : 0, { shouldDirty: true, shouldValidate: true })
          } else {
            const selected = selectableProducts.find((item) => item.id === event.target.value)
            form.setValue(`lines.${index}.unitOfMeasureId`, selected?.unitOfMeasureId ?? '', { shouldDirty: true, shouldValidate: true })
            form.setValue(`lines.${index}.unitPrice`, rate > 0 ? round4((selected?.sellingPriceBase ?? 0) / rate) : 0, { shouldDirty: true, shouldValidate: true })
          }
        }}><option value="">Select {isService ? 'Service' : 'Product'}</option>{isService ? selectableServices.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>) : selectableProducts.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}</Select>{isService ? form.formState.errors.lines?.[index]?.serviceId?.message && <ErrorText value={form.formState.errors.lines[index]?.serviceId?.message} /> : form.formState.errors.lines?.[index]?.productId?.message && <ErrorText value={form.formState.errors.lines[index]?.productId?.message} />}<input type="hidden" {...form.register(`lines.${index}.unitOfMeasureId`)} /></td><td className="p-2"><Input placeholder="Optional line note" {...form.register(`lines.${index}.description`)} /></td><td className="p-2">{isService ? <span className="text-muted-foreground">No stock movement</span> : <><p>{selectedProduct?.unitCode ?? '—'}</p><p className="text-xs text-muted-foreground">Available: <span className="font-mono">{values.warehouseId ? stock : '—'}</span></p></>}</td><td className="p-2"><Input className="text-right" type="number" min="0.0001" step="0.0001" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} />{form.formState.errors.lines?.[index]?.quantity?.message && <ErrorText value={form.formState.errors.lines[index]?.quantity?.message} />}</td><td className="p-2"><Input className="text-right" type="number" min="0" step="0.0001" {...form.register(`lines.${index}.unitPrice`, { valueAsNumber: true })} />{form.formState.errors.lines?.[index]?.unitPrice?.message && <ErrorText value={form.formState.errors.lines[index]?.unitPrice?.message} />}</td><td className="p-2 text-right font-mono">{formatAmount(lineTotal)}</td><td className="p-2"><Button type="button" variant="ghost" size="icon-sm" disabled={lineFields.fields.length === 1} onClick={() => lineFields.remove(index)}><Trash2 className="size-4" /></Button></td></tr>
      })}</tbody></table></div><div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => lineFields.append(newServiceLine())}><BriefcaseBusiness className="size-4" />Add Service</Button><Button type="button" variant="outline" onClick={() => lineFields.append(newProductLine())}><Package className="size-4" />Add Product</Button></div><div className="min-w-72 space-y-1 text-right"><p className="text-sm text-muted-foreground">Subtotal <span className="ml-4 font-mono text-foreground">{formatAmount(subtotal)} {currencies.find((item) => item.id === selectedCurrencyId)?.code ?? ''}</span></p><p className="text-lg font-semibold">Total <span className="ml-4 font-mono">{formatAmount(subtotal)} {currencies.find((item) => item.id === selectedCurrencyId)?.code ?? ''}</span></p>{isForeign && <p className="text-sm font-semibold text-[#d85430]">Base equivalent <span className="ml-4 font-mono">{formatAmount(baseTotal)} {business?.baseCurrencyCode}</span></p>}</div></div>{form.formState.errors.lines?.root?.message && <p className="mt-2 text-sm text-destructive">{form.formState.errors.lines.root.message}</p>}</CardContent></Card>
    </fieldset>

    {posted && invoice && <Card><CardHeader><CardTitle>Customer receipts</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid gap-3 rounded bg-muted p-4 text-sm sm:grid-cols-3"><Audit label="Payment state" value={paymentStatusLabel[invoice.paymentStatus]} /><Audit label="Received" value={`${formatAmount(invoice.receivedAmount)} ${invoice.currencyCode}`} /><Audit label="Outstanding" value={`${formatAmount(invoice.outstandingAmount)} ${invoice.currencyCode}`} /></div>{invoice.receipts.length === 0 ? <p className="text-sm text-muted-foreground">No posted Customer Receipts have been allocated to this invoice.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className={head}><th>Receipt</th><th>Date</th><th className="text-right">Applied</th><th className="text-right">Base applied</th></tr></thead><tbody>{invoice.receipts.map((receipt) => <tr key={receipt.customerReceiptId} className="border-b"><td className="p-2"><Link className="font-mono text-[#d85430]" to={`/finance/customer-receipts/${receipt.customerReceiptId}`}>{receipt.customerReceiptDocumentNumber}</Link></td><td className="p-2">{receipt.receiptDate}</td><td className="p-2 text-right font-mono">{formatAmount(receipt.amount)} {invoice.currencyCode}</td><td className="p-2 text-right font-mono">{formatAmount(receipt.baseAmount)} {invoice.baseCurrencyCode}</td></tr>)}</tbody></table></div>}</CardContent></Card>}
    {invoice && <Card><CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-3"><Audit label="Created" value={`${invoice.createdByUsername} · ${formatTimestamp(invoice.createdAtUtc)}`} /><Audit label="Updated" value={formatTimestamp(invoice.updatedAtUtc)} /><Audit label="Posted" value={invoice.postedAtUtc ? formatTimestamp(invoice.postedAtUtc) : 'Not posted'} /></CardContent></Card>}
    {!posted && <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div>{(save.error ?? post.error ?? remove.error) && <p className="text-sm text-destructive">{(save.error ?? post.error ?? remove.error)?.message}</p>}<p className="text-xs text-muted-foreground">Posting requires an active Customer. It creates Accounts Receivable and Revenue, plus stock-out and COGS for Product lines.</p></div><div className="flex gap-2">{id && <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => { if (window.confirm('Delete this Draft Sales Invoice?')) remove.mutate(id, { onSuccess: () => navigate('/sales/invoices') }) }}>Delete</Button>}<Button type="submit" variant="outline" disabled={save.isPending || post.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save Draft</Button>{id && <Button type="button" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" disabled={form.formState.isDirty || post.isPending} onClick={() => { if (window.confirm('Post this Sales Invoice? Receivable, Revenue, and Product Inventory effects will be permanent.')) post.mutate(id) }}><Send className="size-4" />Post Invoice</Button>}</div></div>}
    </form>
  </div>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label> }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...props} /> }
function Audit({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div> }
function ErrorText({ value }: { value?: string }) { return value ? <p className="mt-1 text-xs text-destructive">{value}</p> : null }
function LineTypeBadge({ lineType }: { lineType: SalesLineTypeValue }) { const service = lineType === SalesLineType.Service; return <span className={service ? 'inline-flex items-center gap-1 rounded bg-violet-50 px-2 py-1 text-xs font-semibold text-violet-700' : 'inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-1 text-xs font-semibold text-sky-700'}>{service ? <BriefcaseBusiness className="size-3" /> : <Package className="size-3" />}{service ? 'Service' : 'Product'}</span> }
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatTimestamp = (value: string) => new Date(value).toLocaleString()
const paymentStatusLabel = { [SalesInvoicePaymentStatus.Unpaid]: 'Unpaid', [SalesInvoicePaymentStatus.PartiallyPaid]: 'Partially Paid', [SalesInvoicePaymentStatus.Paid]: 'Paid' }
const head = 'border-b border-slate-200 bg-[#e9ecef]/60 text-left text-xs uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60 [&>th]:p-2'
