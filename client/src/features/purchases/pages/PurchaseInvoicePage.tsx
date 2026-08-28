import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, BookOpen, Loader2, PackageSearch, Plus, Send, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useBranches, useCurrencies, useCurrentBusiness } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useProducts, useStockBalances, useWarehouses } from '@/features/inventory'
import { purchaseInvoiceSchema } from '../schemas/purchase.schemas'
import { useDeletePurchaseInvoice, usePostPurchaseInvoice, usePurchaseInvoice, useSavePurchaseInvoice } from '../hooks/usePurchases'
import { PurchaseInvoiceStatus } from '../types/purchase.types'
import type { PurchaseInvoiceDraftInput } from '../types/purchase.types'
import { StatusBadge } from './PurchaseInvoicesPage'

type PurchaseForm = Omit<PurchaseInvoiceDraftInput, 'supplierReference' | 'notes'> & { supplierReference: string; notes: string }
const today = () => new Date().toISOString().slice(0, 10)
const emptyLine = { productId: '', unitOfMeasureId: '', quantity: 1, unitCost: 0 }

export function PurchaseInvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoiceQuery = usePurchaseInvoice(id)
  const save = useSavePurchaseInvoice(id)
  const post = usePostPurchaseInvoice()
  const remove = useDeletePurchaseInvoice()
  const suppliers = useContacts({ page: 1, pageSize: 100, role: 1, isActive: true }).data?.data ?? []
  const branches = useBranches().data?.data ?? []
  const warehouses = useWarehouses().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const business = useCurrentBusiness().data
  const products = useProducts().data?.data ?? []
  const form = useForm<PurchaseForm>({ resolver: zodResolver(purchaseInvoiceSchema), defaultValues: { supplierId: '', invoiceDate: today(), supplierReference: '', branchId: '', warehouseId: '', currencyId: '', exchangeRate: 1, notes: '', lines: [emptyLine] } })
  const lineFields = useFieldArray({ control: form.control, name: 'lines' })
  const values = useWatch({ control: form.control })
  const invoice = invoiceQuery.data
  const posted = invoice?.status === PurchaseInvoiceStatus.Posted
  const selectedCurrencyId = values.currencyId ?? ''
  const isForeign = Boolean(selectedCurrencyId && business && selectedCurrencyId !== business.baseCurrencyId)
  const rate = isForeign ? Number(values.exchangeRate) || 0 : 1
  const balances = useStockBalances({ warehouseId: values.warehouseId || undefined }).data?.data ?? []

  useEffect(() => {
    if (!invoice) return
    form.reset({ supplierId: invoice.supplierId, invoiceDate: invoice.invoiceDate, supplierReference: invoice.supplierReference ?? '', branchId: invoice.branchId, warehouseId: invoice.warehouseId, currencyId: invoice.currencyId, exchangeRate: invoice.exchangeRate, notes: invoice.notes ?? '', lines: invoice.lines.map((line) => ({ productId: line.productId, unitOfMeasureId: line.unitOfMeasureId, quantity: line.quantity, unitCost: line.unitCost })) })
  }, [invoice, form])

  const activeSuppliers = [...suppliers]
  if (invoice && !activeSuppliers.some((item) => item.id === invoice.supplierId)) activeSuppliers.push({ id: invoice.supplierId, name: invoice.supplierName, kind: 1, isCustomer: false, isSupplier: true, primaryPhoneNumber: null, secondaryPhoneNumber: null, email: null, address: null, city: null, region: null, country: null, notes: null, isActive: false })
  const selectableProducts = [...products.filter((item) => item.isActive && item.trackInventory)]
  invoice?.lines.forEach((line) => {
    if (!selectableProducts.some((item) => item.id === line.productId)) selectableProducts.push({ id: line.productId, name: line.productName, sku: line.sku, barcode: null, categoryId: '', categoryName: '', subcategoryId: null, subcategoryName: null, unitOfMeasureId: line.unitOfMeasureId, unitName: line.unitCode, unitCode: line.unitCode, purpose: 0, purchasePriceBase: 0, sellingPriceBase: 0, trackInventory: true, isActive: false, description: null, imageReference: null, totalQuantity: 0, averageCostBase: 0, totalValueBase: 0, unitConversions: [] })
  })
  const availableWarehouses = warehouses.filter((item) => (posted || item.isActive) && item.branchId === values.branchId)
  const subtotal = (values.lines ?? []).reduce((sum, line) => sum + (Number(line?.quantity) || 0) * (Number(line?.unitCost) || 0), 0)
  const baseTotal = (values.lines ?? []).reduce((sum, line) => sum + (Number(line?.quantity) || 0) * round4((Number(line?.unitCost) || 0) * rate), 0)

  const submit = form.handleSubmit((value) => {
    if (isForeign && (!value.exchangeRate || value.exchangeRate <= 0)) {
      form.setError('exchangeRate', { message: 'Exchange rate is required for a foreign-currency purchase' })
      return
    }
    save.mutate({ ...value, supplierReference: value.supplierReference.trim() || null, notes: value.notes.trim() || null, exchangeRate: isForeign ? value.exchangeRate : null }, { onSuccess: (saved) => navigate(`/purchases/invoices/${saved.id}`) })
  })

  if (id && invoiceQuery.isPending) return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (invoiceQuery.isError) return <p className="text-destructive">{invoiceQuery.error.message}</p>

  return <div className="flex h-full flex-col space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><Link to="/purchases/invoices"><Button variant="ghost" size="icon"><ArrowLeft className="size-4" /></Button></Link><div><h1 className="text-2xl font-bold">Purchase Invoice <span className="font-mono text-[#d85430]">{invoice?.documentNumber ?? 'New draft'}</span></h1><p className="text-sm text-muted-foreground">{posted ? 'Posted · immutable inventory and accounting history' : 'Draft · no inventory or accounting effect yet'}</p></div></div><div className="flex items-center gap-2">{invoice && <StatusBadge status={invoice.status} />}{posted && invoice && <><Link to={`/inventory/ledger?documentNumber=${encodeURIComponent(invoice.documentNumber)}`}><Button variant="outline" size="sm"><PackageSearch className="size-4" />Stock ledger</Button></Link>{invoice.journalEntryId && <Link to={`/accounting/journal?search=${encodeURIComponent(invoice.documentNumber)}`}><Button variant="outline" size="sm"><BookOpen className="size-4" />Accounting journal</Button></Link>}</>}</div></div>
    <form onSubmit={submit} className="space-y-5"><fieldset disabled={posted} className="space-y-5 disabled:opacity-80">
      <Card><CardHeader><CardTitle>Supplier invoice</CardTitle></CardHeader><CardContent className="grid gap-4 md:grid-cols-4">
        <Field label="Supplier" error={form.formState.errors.supplierId?.message}><Select {...form.register('supplierId')}><option value="">Select active supplier</option>{activeSuppliers.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}</Select></Field>
        <Field label="Invoice date" error={form.formState.errors.invoiceDate?.message}><Input type="date" {...form.register('invoiceDate')} /></Field>
        <Field label="Supplier reference" error={form.formState.errors.supplierReference?.message}><Input placeholder="Optional" {...form.register('supplierReference')} /></Field>
        <Field label="Branch" error={form.formState.errors.branchId?.message}><Select {...form.register('branchId', { onChange: () => form.setValue('warehouseId', '', { shouldDirty: true }) })}><option value="">Select branch</option>{branches.filter((item) => posted || item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>
        <Field label="Receiving warehouse" error={form.formState.errors.warehouseId?.message}><Select {...form.register('warehouseId')}><option value="">Select warehouse</option>{availableWarehouses.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>
        <Field label="Currency" error={form.formState.errors.currencyId?.message}><Select {...form.register('currencyId', { onChange: (event) => { if (event.target.value === business?.baseCurrencyId) form.setValue('exchangeRate', 1, { shouldDirty: true }) } })}><option value="">Select currency</option>{currencies.filter((item) => posted || item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}</Select></Field>
        {isForeign && <Field label={`Rate: 1 ${currencies.find((item) => item.id === selectedCurrencyId)?.code ?? ''} in ${business?.baseCurrencyCode ?? 'base currency'}`} error={form.formState.errors.exchangeRate?.message}><Input type="number" min="0.000001" step="0.000001" {...form.register('exchangeRate', { setValueAs: (value) => value === '' ? null : Number(value) })} /></Field>}
        <Field label="Notes" error={form.formState.errors.notes?.message}><Textarea rows={2} {...form.register('notes')} /></Field>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Purchased products</CardTitle></CardHeader><CardContent><div className="overflow-x-auto"><table className="w-full min-w-[900px] text-sm"><thead><tr className={head}><th>Product</th><th>Unit</th><th className="text-right">Warehouse stock</th><th className="text-right">Quantity</th><th className="text-right">Unit cost</th><th className="text-right">Line total</th><th /></tr></thead><tbody>{lineFields.fields.map((field, index) => {
        const selected = selectableProducts.find((item) => item.id === values.lines?.[index]?.productId)
        const productRegistration = form.register(`lines.${index}.productId`)
        const lineTotal = (Number(values.lines?.[index]?.quantity) || 0) * (Number(values.lines?.[index]?.unitCost) || 0)
        const stock = balances.find((item) => item.productId === selected?.id)?.quantity ?? 0
        return <tr key={field.id} className="border-b"><td className="p-2"><Select {...productRegistration} onChange={(event) => { productRegistration.onChange(event); const product = selectableProducts.find((item) => item.id === event.target.value); form.setValue(`lines.${index}.unitOfMeasureId`, product?.unitOfMeasureId ?? '', { shouldDirty: true, shouldValidate: true }) }}><option value="">Select by SKU, name, or barcode</option>{selectableProducts.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}{item.barcode ? ` · ${item.barcode}` : ''}</option>)}</Select>{form.formState.errors.lines?.[index]?.productId?.message && <p className="mt-1 text-xs text-destructive">{form.formState.errors.lines[index]?.productId?.message}</p>}<input type="hidden" {...form.register(`lines.${index}.unitOfMeasureId`)} /></td><td className="p-2">{selected?.unitCode ?? '—'}</td><td className="p-2 text-right font-mono">{values.warehouseId ? stock : '—'}</td><td className="p-2"><Input className="text-right" type="number" min="0.0001" step="0.0001" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} /></td><td className="p-2"><Input className="text-right" type="number" min="0" step="0.0001" {...form.register(`lines.${index}.unitCost`, { valueAsNumber: true })} /></td><td className="p-2 text-right font-mono">{formatAmount(lineTotal)}</td><td className="p-2"><Button type="button" variant="ghost" size="icon-sm" disabled={lineFields.fields.length === 1} onClick={() => lineFields.remove(index)}><Trash2 className="size-4" /></Button></td></tr>
      })}</tbody></table></div><div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><Button type="button" variant="outline" onClick={() => lineFields.append(emptyLine)}><Plus className="size-4" />Add product</Button><div className="min-w-72 space-y-1 text-right"><p className="text-sm text-muted-foreground">Subtotal <span className="ml-4 font-mono text-foreground">{formatAmount(subtotal)} {currencies.find((item) => item.id === selectedCurrencyId)?.code ?? ''}</span></p><p className="text-lg font-semibold">Total <span className="ml-4 font-mono">{formatAmount(subtotal)} {currencies.find((item) => item.id === selectedCurrencyId)?.code ?? ''}</span></p>{isForeign && <p className="text-sm font-semibold text-[#d85430]">Base equivalent <span className="ml-4 font-mono">{formatAmount(baseTotal)} {business?.baseCurrencyCode}</span></p>}</div></div>{form.formState.errors.lines?.root?.message && <p className="mt-2 text-sm text-destructive">{form.formState.errors.lines.root.message}</p>}</CardContent></Card>
    </fieldset>
    {invoice && <Card><CardContent className="grid gap-3 pt-6 text-sm sm:grid-cols-3"><Audit label="Created" value={`${invoice.createdByUsername} · ${formatTimestamp(invoice.createdAtUtc)}`} /><Audit label="Updated" value={formatTimestamp(invoice.updatedAtUtc)} /><Audit label="Posted" value={invoice.postedAtUtc ? formatTimestamp(invoice.postedAtUtc) : 'Not posted'} /></CardContent></Card>}
    {!posted && <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-center sm:justify-between"><div>{(save.error ?? post.error ?? remove.error) && <p className="text-sm text-destructive">{(save.error ?? post.error ?? remove.error)?.message}</p>}<p className="text-xs text-muted-foreground">Posting increases stock, updates valuation, creates Accounts Payable, and makes the invoice read-only.</p></div><div className="flex gap-2">{id && <Button type="button" variant="destructive" disabled={remove.isPending} onClick={() => { if (window.confirm('Delete this draft purchase invoice?')) remove.mutate(id, { onSuccess: () => navigate('/purchases/invoices') }) }}>Delete</Button>}<Button type="submit" variant="outline" disabled={save.isPending || post.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}Save draft</Button>{id && <Button type="button" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" disabled={form.formState.isDirty || post.isPending} onClick={() => { if (window.confirm('Post this invoice? Stock and Accounts Payable will increase, and the document will become read-only.')) post.mutate(id) }}><Send className="size-4" />Post invoice</Button>}</div></div>}
    </form>
  </div>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label> }
function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className="h-9 w-full rounded-md border bg-background px-3 text-sm" {...props} /> }
function Audit({ label, value }: { label: string; value: string }) { return <div><p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1">{value}</p></div> }
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatTimestamp = (value: string) => new Date(value).toLocaleString()
const head = 'border-b border-slate-200 bg-[#e9ecef]/60 text-left text-xs uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60 [&>th]:p-2'
