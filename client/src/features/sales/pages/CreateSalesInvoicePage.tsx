import { getSelectedBranchId } from '@/features/business'
import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, Banknote, BookOpen, BriefcaseBusiness, History, Loader2, Package, PackageSearch, Pencil, ReceiptText, Save, Send, Trash2 } from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { hasCapability, useCurrentUser } from '@/features/auth'
import { useBranches, useCurrencies, useCurrentBusiness } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useEffectiveExchangeRate } from '@/features/finance'
import { convertBasePriceToUnitPrice, convertToBaseQuantity, convertUnitPriceToBasePrice, productUnitOptions, useProducts, useStockBalances, useWarehouses } from '@/features/inventory'
import { salesInvoiceSchema } from '../schemas/sales.schemas'
import { useDeletePostedSalesInvoice, useDeleteSalesInvoice, usePostSalesInvoice, useSalesInvoice, useSalesInvoiceHistory, useSaveSalesInvoice, useServices, useUpdatePostedSalesInvoice } from '../hooks/useSales'
import { PosPaymentMode, SalesInvoicePaymentStatus, SalesInvoiceStatus, SalesLineType } from '../types/sales.types'
import type { PosPaymentMode as PosPaymentModeValue, SalesInvoice, SalesInvoiceDraftInput, SalesLineType as SalesLineTypeValue } from '../types/sales.types'
import { SalesStatusBadge } from './SalesInvoicesPage'

interface LineForm {
  lineType: SalesLineTypeValue
  serviceId: string
  productId: string
  unitOfMeasureId: string
  description: string
  quantity: number
  unitPrice: number
  unitPriceBase: number
  useMasterPrice: boolean
}

interface InvoiceForm {
  customerId: string
  invoiceDate: string
  branchId: string
  warehouseId: string
  currencyId: string
  exchangeRate: number | null
  notes: string
  correctionReason: string
  lines: LineForm[]
}

const today = () => new Date().toISOString().slice(0, 10)
const newServiceLine = (): LineForm => ({ lineType: SalesLineType.Service, serviceId: '', productId: '', unitOfMeasureId: '', description: '', quantity: 1, unitPrice: 0, unitPriceBase: 0, useMasterPrice: true })
const newProductLine = (): LineForm => ({ lineType: SalesLineType.Product, serviceId: '', productId: '', unitOfMeasureId: '', description: '', quantity: 1, unitPrice: 0, unitPriceBase: 0, useMasterPrice: true })

const invoiceToForm = (invoice: SalesInvoice): InvoiceForm => ({
  customerId: invoice.customerId ?? '',
  invoiceDate: invoice.invoiceDate,
  branchId: invoice.branchId,
  warehouseId: invoice.warehouseId ?? '',
  currencyId: invoice.currencyId,
  exchangeRate: invoice.exchangeRate,
  notes: invoice.notes ?? '',
  correctionReason: '',
  lines: invoice.lines.map((line) => ({
    lineType: line.lineType,
    serviceId: line.serviceId ?? '',
    productId: line.productId ?? '',
    unitOfMeasureId: line.unitOfMeasureId ?? '',
    description: line.description ?? '',
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    unitPriceBase: convertSnapshotBasePriceToUnitPrice(line.baseUnitPrice, line.conversionOperation, line.conversionFactor),
    useMasterPrice: !line.isPriceOverridden,
  })),
})

export function CreateSalesInvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const invoiceQuery = useSalesInvoice(id)
  const save = useSaveSalesInvoice(id)
  const post = usePostSalesInvoice()
  const remove = useDeleteSalesInvoice()
  const updatePosted = useUpdatePostedSalesInvoice(id)
  const deletePosted = useDeletePostedSalesInvoice(id)
  const currentUser = useCurrentUser().data
  const canEditPosted = hasCapability(currentUser?.role, 'editPostedInvoice')
  const canDeletePosted = hasCapability(currentUser?.role, 'deletePostedInvoice')
  const [editingPosted, setEditingPosted] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [posPaymentMode, setPosPaymentMode] = useState<PosPaymentModeValue>(PosPaymentMode.Paid)
  const [tenderAmounts, setTenderAmounts] = useState<Record<string, number>>({})
  const [changeCashboxId, setChangeCashboxId] = useState('')
  const [changeAmount, setChangeAmount] = useState(0)
  const customers = useContacts({ page: 1, pageSize: 100, role: 0, isActive: true }).data?.data ?? []
  const branches = useBranches().data?.data ?? []
  const warehouses = useWarehouses().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const business = useCurrentBusiness().data
  const services = useServices({ page: 1, pageSize: 100, isActive: true }).data?.data ?? []
  const products = useProducts().data?.data ?? []
  const form = useForm<InvoiceForm>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: { customerId: '', invoiceDate: today(), branchId: getSelectedBranchId(), warehouseId: '', currencyId: '', exchangeRate: 1, notes: '', correctionReason: '', lines: [] },
  })
  const lineFields = useFieldArray({ control: form.control, name: 'lines' })
  const values = useWatch({ control: form.control })
  const invoice = invoiceQuery.data
  const posted = invoice?.status === SalesInvoiceStatus.Posted
  const history = useSalesInvoiceHistory(id, Boolean(posted && (canEditPosted || canDeletePosted)))
  const selectedCurrencyId = values.currencyId ?? ''
  const selectedCurrency = currencies.find((item) => item.id === selectedCurrencyId)
  const isForeign = Boolean(selectedCurrencyId && business && selectedCurrencyId !== business.baseCurrencyId)
  const rate = isForeign ? Number(values.exchangeRate) || 0 : 1
  const effectiveRateQuery = useEffectiveExchangeRate(selectedCurrencyId, values.invoiceDate, isForeign && !posted)
  const resolvedRateKey = useRef('')
  const pricingContext = useRef({ currencyId: '', rate: 1 })
  const hasProductLines = (values.lines ?? []).some((line) => line?.lineType === SalesLineType.Product)
  const balances = useStockBalances({ warehouseId: values.warehouseId || undefined }).data?.data ?? []

  useEffect(() => {
    if (!invoice) return
    resolvedRateKey.current = `${invoice.currencyId}:${invoice.invoiceDate}`
    pricingContext.current = { currencyId: invoice.currencyId, rate: invoice.exchangeRate }
    form.reset(invoiceToForm(invoice))
  }, [invoice, form])

  useEffect(() => {
    if (id || !business || form.getValues('currencyId')) return
    form.setValue('currencyId', business.baseCurrencyId)
  }, [business, form, id])

  useEffect(() => {
    if (posted || !selectedCurrencyId || !values.invoiceDate) return
    const key = `${selectedCurrencyId}:${values.invoiceDate}`
    if (!isForeign) {
      resolvedRateKey.current = key
      form.setValue('exchangeRate', 1, { shouldDirty: true })
      return
    }
    if (effectiveRateQuery.data && resolvedRateKey.current !== key) {
      resolvedRateKey.current = key
      form.setValue('exchangeRate', effectiveRateQuery.data.rate, { shouldDirty: true, shouldValidate: true })
    }
  }, [effectiveRateQuery.data, form, isForeign, posted, selectedCurrencyId, values.invoiceDate])

  useEffect(() => {
    if (!selectedCurrencyId || rate <= 0) return
    if (pricingContext.current.currencyId === selectedCurrencyId && pricingContext.current.rate === rate) return
    form.getValues('lines').forEach((line, index) => {
      form.setValue(`lines.${index}.unitPrice`, round6(line.unitPriceBase / rate), { shouldDirty: true, shouldValidate: true })
    })
    pricingContext.current = { currencyId: selectedCurrencyId, rate }
  }, [form, rate, selectedCurrencyId])

  const selectableCustomers = [...customers]
  if (invoice?.customerId && !selectableCustomers.some((item) => item.id === invoice.customerId))
    selectableCustomers.push({ id: invoice.customerId, name: invoice.customerName ?? 'Historical customer', kind: 0, isCustomer: true, isSupplier: false, primaryPhoneNumber: null, secondaryPhoneNumber: null, email: null, address: null, city: null, region: null, country: null, notes: null, isActive: false })

  const selectableServices = [...services]
  invoice?.lines.filter((line) => line.lineType === SalesLineType.Service).forEach((line) => {
    if (line.serviceId && !selectableServices.some((item) => item.id === line.serviceId)) selectableServices.push({ id: line.serviceId, name: line.serviceName ?? 'Historical Service', categoryId: '', categoryName: 'Historical', sellingPriceBase: round4(line.unitPrice * invoice.exchangeRate), durationMinutes: 1, revenueAccountId: '', revenueAccountCode: '', revenueAccountName: '', isActive: false, description: null })
  })

  const selectableProducts = [...products.filter((item) => item.isActive && item.trackInventory && (item.purpose === 0 || item.purpose === 2))]
  invoice?.lines.filter((line) => line.lineType === SalesLineType.Product).forEach((line) => {
    if (line.productId && !selectableProducts.some((item) => item.id === line.productId)) selectableProducts.push({ id: line.productId, name: line.productName ?? 'Historical Product', sku: line.sku ?? '', barcode: null, categoryId: '', categoryName: '', subcategoryId: null, subcategoryName: null, unitOfMeasureId: line.unitOfMeasureId ?? '', unitName: line.unitCode ?? '', unitCode: line.unitCode ?? '', purpose: 0, purchasePriceBase: 0, sellingPriceBase: round4(line.unitPrice * invoice.exchangeRate), trackInventory: true, isActive: false, description: null, imageReference: null, totalQuantity: 0, averageCostBase: 0, totalValueBase: 0, unitConversions: [] })
  })

  const availableWarehouses = warehouses.filter((item) => (posted || item.isActive) && item.branchId === values.branchId)
  const subtotal = (values.lines ?? []).reduce((sum, line) => sum + (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0), 0)
  const baseTotal = (values.lines ?? []).reduce((sum, line) => sum + (Number(line?.quantity) || 0) * (Number(line?.unitPriceBase) || 0), 0)

  const handleCurrencyChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    form.setValue('exchangeRate', event.target.value === business?.baseCurrencyId ? 1 : null, { shouldDirty: true })
  }

  const changeLineType = (index: number, lineType: SalesLineTypeValue) => {
    const current = form.getValues(`lines.${index}`)
    const replacement = lineType === SalesLineType.Service ? newServiceLine() : newProductLine()
    lineFields.update(index, {
      ...replacement,
      description: current.description,
      quantity: current.quantity,
    })
  }

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
        useMasterPrice: line.useMasterPrice,
      })),
    }
    if (posted && invoice) {
      const reason = value.correctionReason.trim()
      if (!reason) {
        form.setError('correctionReason', { message: 'A correction reason is required' })
        return
      }
      const posSettlement = invoice.posContext ? {
        paymentMode: posPaymentMode,
        tenders: posPaymentMode === PosPaymentMode.Credit
          ? []
          : invoice.posContext.sessionCashboxes
            .map((cashbox) => ({ moneyAccountId: cashbox.moneyAccountId, amount: Number(tenderAmounts[cashbox.moneyAccountId]) || 0 }))
            .filter((tender) => tender.amount > 0),
        change: posPaymentMode === PosPaymentMode.Paid && changeAmount > 0 && changeCashboxId
          ? { moneyAccountId: changeCashboxId, amount: changeAmount }
          : null,
      } : null
      updatePosted.mutate({ ...body, reason, expectedUpdatedAtUtc: invoice.updatedAtUtc, posSettlement }, {
        onSuccess: () => setEditingPosted(false),
      })
      return
    }
    save.mutate(body, { onSuccess: (saved) => navigate(`/sales/invoices/${saved.id}`) })
  })

  const cancelPostedEdit = () => {
    if (invoice) form.reset(invoiceToForm(invoice))
    updatePosted.reset()
    setEditingPosted(false)
  }

  const startPostedEdit = () => {
    if (!invoice) return
    updatePosted.reset()
    form.reset(invoiceToForm(invoice))
    if (invoice.posContext) {
      setPosPaymentMode(invoice.posContext.paymentMode)
      setTenderAmounts(Object.fromEntries(invoice.posContext.sessionCashboxes.map((cashbox) => [
        cashbox.moneyAccountId,
        invoice.posContext!.tenders.find((tender) => tender.moneyAccountId === cashbox.moneyAccountId)?.tenderedAmount ?? 0,
      ])))
      setChangeCashboxId(invoice.posContext.change?.moneyAccountId
        ?? invoice.posContext.sessionCashboxes.find((cashbox) => cashbox.currencyId === invoice.baseCurrencyId)?.moneyAccountId
        ?? '')
      setChangeAmount(invoice.posContext.change?.amount ?? 0)
    }
    setEditingPosted(true)
  }

  const confirmPostedDelete = () => {
    if (!invoice) return
    const reason = deleteReason.trim()
    if (!reason) {
      setDeleteReasonError('A deletion reason is required')
      return
    }
    setDeleteReasonError('')
    deletePosted.mutate({ reason, expectedUpdatedAtUtc: invoice.updatedAtUtc }, {
      onSuccess: () => navigate('/sales/invoices'),
    })
  }

  if (id && invoiceQuery.isPending) return <div className="grid h-64 place-items-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>
  if (invoiceQuery.isError) return <p className="text-destructive">{invoiceQuery.error.message}</p>

  const requestError = posted
    ? editingPosted ? updatePosted.error : null
    : save.error ?? post.error ?? remove.error
  const isBusy = save.isPending || post.isPending || remove.isPending || updatePosted.isPending
  const isClosedPosSession = invoice?.posContext?.sessionStatus === 1
  const pageTitle = posted
    ? invoice?.documentNumber ?? 'Sales invoice'
    : id
      ? `Edit ${invoice?.documentNumber ?? 'sales invoice'}`
      : 'New sales invoice'

  return (
    <div className="mx-auto flex h-full w-full max-w-[1600px] flex-col space-y-5">
      <header className="sticky top-0 z-20 -mx-2 flex flex-col justify-between gap-4 border-b bg-background/95 px-2 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/sales/invoices">
            <Button variant="outline" size="icon-sm" aria-label="Back to Sales Invoices">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight">{pageTitle}</h1>
              {invoice && <SalesStatusBadge status={invoice.status} />}
              {invoice?.posContext && <SourceBadge label="POS" />}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {invoice?.posContext
                ? `Sale ${invoice.posContext.documentNumber} · Session ${invoice.posContext.posSessionNumber ?? '—'}`
                : posted
                  ? 'Posted sales invoice'
                  : id
                    ? 'Draft sales invoice'
                    : 'Create a draft sales invoice'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {posted && invoice ? (
            <>
              <Link to={`/inventory/ledger?documentNumber=${encodeURIComponent(invoice.documentNumber)}`}>
                <Button variant="outline" size="sm"><PackageSearch className="size-4" />Stock</Button>
              </Link>
              {invoice.journalEntryId && (
                <Link to={`/accounting/journal?search=${encodeURIComponent(invoice.documentNumber)}`}>
                  <Button variant="outline" size="sm"><BookOpen className="size-4" />Journal</Button>
                </Link>
              )}
              {editingPosted ? (
                <>
                  <Button type="button" variant="outline" size="sm" onClick={cancelPostedEdit} disabled={isBusy}>Cancel</Button>
                  <Button type="submit" form="sales-invoice-form" size="sm" disabled={updatePosted.isPending}>
                    {updatePosted.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                    Save correction
                  </Button>
                </>
              ) : (
                <>
                  {canEditPosted && <Button type="button" size="sm" onClick={startPostedEdit}><Pencil className="size-4" />Edit</Button>}
                  {canDeletePosted && <Button type="button" variant="destructive" size="sm" onClick={() => setDeleteOpen(true)}><Trash2 className="size-4" />Delete</Button>}
                </>
              )}
            </>
          ) : (
            <>
              <Link to="/sales/invoices"><Button type="button" variant="outline" size="sm" disabled={isBusy}>Cancel</Button></Link>
              {id && (
                <Button type="button" variant="outline" size="sm" disabled={remove.isPending} onClick={() => { if (window.confirm('Delete this Draft Sales Invoice?')) remove.mutate(id, { onSuccess: () => navigate('/sales/invoices') }) }}>
                  <Trash2 className="size-4" />Delete draft
                </Button>
              )}
              <Button type="submit" form="sales-invoice-form" variant="outline" size="sm" disabled={save.isPending || post.isPending}>
                {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save draft
              </Button>
              {id && (
                <Button type="button" size="sm" disabled={form.formState.isDirty || post.isPending} onClick={() => { if (window.confirm('Post this Sales Invoice? Receivable, Revenue, and Product Inventory effects will be permanent.')) post.mutate(id) }}>
                  {post.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Post invoice
                </Button>
              )}
            </>
          )}
        </div>
      </header>

      <form id="sales-invoice-form" onSubmit={submit} className="space-y-5">
        {requestError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {requestError.message}
          </div>
        )}

        {posted && editingPosted && (
          <Card className="border-amber-300 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
            <CardContent className="grid gap-4 pt-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)] lg:items-end">
              <div>
                <p className="font-semibold text-amber-950 dark:text-amber-100">Posted invoice correction</p>
                <p className="mt-1 text-sm text-amber-900/70 dark:text-amber-100/70">
                  {isClosedPosSession
                    ? 'The POS session stays closed and its Z Report is refreshed.'
                    : 'The invoice number and posting date stay unchanged.'}
                </p>
              </div>
              <Field label="Correction reason" error={form.formState.errors.correctionReason?.message}>
                <Textarea rows={2} placeholder="Reason for this correction" {...form.register('correctionReason')} />
              </Field>
            </CardContent>
          </Card>
        )}

        <fieldset disabled={Boolean(posted && !editingPosted)} className="space-y-5">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Invoice details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Customer" error={form.formState.errors.customerId?.message}>
                <Select {...form.register('customerId')}>
                  <option value="">Walk-in customer</option>
                  {selectableCustomers.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}
                </Select>
              </Field>
              <Field label="Invoice date" error={form.formState.errors.invoiceDate?.message}>
                <Input type="date" {...form.register('invoiceDate')} />
              </Field>
              <Field label="Branch" error={form.formState.errors.branchId?.message}>
                <Select {...form.register('branchId', { onChange: () => form.setValue('warehouseId', '', { shouldDirty: true }) })} disabled={Boolean(invoice?.posContext)}>
                  {branches.filter((item) => posted || item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                </Select>
              </Field>
              <Field label={hasProductLines ? 'Warehouse' : 'Warehouse (optional)'} error={form.formState.errors.warehouseId?.message}>
                <Select {...form.register('warehouseId')}>
                  <option value="">{hasProductLines ? 'Select warehouse' : 'No warehouse'}</option>
                  {availableWarehouses.map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                </Select>
              </Field>
              <Field label="Currency" error={form.formState.errors.currencyId?.message}>
                <Select {...form.register('currencyId', { onChange: handleCurrencyChange })} disabled={Boolean(invoice?.posContext)}>
                  <option value="">Select currency</option>
                  {currencies.filter((item) => posted || item.isActive).map((item) => <option key={item.id} value={item.id}>{item.code} — {item.name}</option>)}
                </Select>
              </Field>
              {isForeign && (
                <Field label={`Exchange rate (${selectedCurrency?.code ?? ''} → ${business?.baseCurrencyCode ?? ''})`} error={form.formState.errors.exchangeRate?.message ?? effectiveRateQuery.error?.message}>
                  <Input type="number" min="0.000001" step="0.000001" {...form.register('exchangeRate', { setValueAs: (value) => value === '' ? null : Number(value) })} />
                </Field>
              )}
              <div className={isForeign ? 'sm:col-span-2' : 'sm:col-span-2 xl:col-span-3'}>
                <Field label="Notes" error={form.formState.errors.notes?.message}>
                  <Textarea rows={2} placeholder="Optional note" {...form.register('notes')} />
                </Field>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col items-stretch justify-between gap-3 pb-3 sm:flex-row sm:items-center">
              <div>
                <CardTitle className="text-base">Items</CardTitle>
                <CardDescription>{lineFields.fields.length} {lineFields.fields.length === 1 ? 'line' : 'lines'}</CardDescription>
              </div>
              {(!posted || editingPosted) && (
                <div className="grid grid-cols-2 gap-2 sm:w-auto">
                  <Button type="button" variant="outline" size="sm" className="min-w-36 justify-center" onClick={() => lineFields.append(newServiceLine())}><BriefcaseBusiness className="size-4" />Add service</Button>
                  <Button type="button" variant="outline" size="sm" className="min-w-36 justify-center" onClick={() => lineFields.append(newProductLine())}><Package className="size-4" />Add product</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[1120px] table-fixed">
                  <colgroup>
                    <col className="w-[150px]" />
                    <col className="w-[28%]" />
                    <col className="w-[22%]" />
                    <col className="w-[18%]" />
                    <col className="w-[110px]" />
                    <col className="w-[150px]" />
                    <col className="w-[140px]" />
                    <col className="w-[56px]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className={head}>
                      <TableHead>Type</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Unit / stock</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineFields.fields.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="h-32 text-center">
                          <p className="font-medium">No items added</p>
                          <p className="mt-1 text-sm text-muted-foreground">Add a service or product to begin.</p>
                        </TableCell>
                      </TableRow>
                    )}
                    {lineFields.fields.map((field, index) => {
                      const line = values.lines?.[index]
                      const isService = line?.lineType === SalesLineType.Service
                      const selectedProduct = selectableProducts.find((item) => item.id === line?.productId)
                      const unitOptions = productUnitOptions(selectedProduct)
                      const invoiceLine = invoice?.lines[index]
                      if (line?.unitOfMeasureId && !unitOptions.some((unit) => unit.id === line.unitOfMeasureId)) unitOptions.push({ id: line.unitOfMeasureId, name: invoiceLine?.unitCode ?? 'Unavailable unit', code: invoiceLine?.unitCode ?? '—', operation: invoiceLine?.conversionOperation ?? null, factor: invoiceLine?.conversionFactor ?? 1 })
                      const baseQuantity = selectedProduct && line?.unitOfMeasureId ? convertToBaseQuantity(selectedProduct, line.unitOfMeasureId, Number(line.quantity) || 0) ?? invoiceLine?.baseQuantity ?? null : null
                      const selectedUnitPriceBase = Number(line?.unitPriceBase) || 0
                      const stock = balances.find((item) => item.productId === selectedProduct?.id)?.quantity ?? 0
                      const lineTotal = (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0)
                      const sourceRegistration = isService ? form.register(`lines.${index}.serviceId`) : form.register(`lines.${index}.productId`)
                      const unitRegistration = form.register(`lines.${index}.unitOfMeasureId`)
                      const priceRegistration = form.register(`lines.${index}.unitPrice`, { valueAsNumber: true })
                      return (
                        <TableRow key={field.id} className="align-middle">
                          <TableCell>
                            <Select
                              aria-label={`Item type for line ${index + 1}`}
                              className="font-medium"
                              value={line?.lineType ?? SalesLineType.Service}
                              onChange={(event) => changeLineType(index, Number(event.target.value) as SalesLineTypeValue)}
                            >
                              <option value={SalesLineType.Service}>Service</option>
                              <option value={SalesLineType.Product}>Product</option>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select {...sourceRegistration} onChange={(event) => {
                              sourceRegistration.onChange(event)
                              if (isService) {
                                const selected = selectableServices.find((item) => item.id === event.target.value)
                                const basePrice = selected?.sellingPriceBase ?? 0
                                form.setValue(`lines.${index}.unitPriceBase`, basePrice, { shouldDirty: true })
                                form.setValue(`lines.${index}.useMasterPrice`, true, { shouldDirty: true })
                                form.setValue(`lines.${index}.unitPrice`, rate > 0 ? round6(basePrice / rate) : 0, { shouldDirty: true, shouldValidate: true })
                              } else {
                                const selected = selectableProducts.find((item) => item.id === event.target.value)
                                const basePrice = selected?.sellingPriceBase ?? 0
                                form.setValue(`lines.${index}.unitOfMeasureId`, selected?.unitOfMeasureId ?? '', { shouldDirty: true, shouldValidate: true })
                                form.setValue(`lines.${index}.unitPriceBase`, basePrice, { shouldDirty: true })
                                form.setValue(`lines.${index}.useMasterPrice`, true, { shouldDirty: true })
                                form.setValue(`lines.${index}.unitPrice`, rate > 0 ? round6(basePrice / rate) : 0, { shouldDirty: true, shouldValidate: true })
                              }
                            }}>
                              <option value="">Select {isService ? 'service' : 'product'}</option>
                              {isService
                                ? selectableServices.map((item) => <option key={item.id} value={item.id}>{item.name}{!item.isActive ? ' (inactive)' : ''}</option>)
                                : selectableProducts.map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}{!item.isActive ? ' (inactive)' : ''}</option>)}
                            </Select>
                            {isService
                              ? form.formState.errors.lines?.[index]?.serviceId?.message && <ErrorText value={form.formState.errors.lines[index]?.serviceId?.message} />
                              : form.formState.errors.lines?.[index]?.productId?.message && <ErrorText value={form.formState.errors.lines[index]?.productId?.message} />}
                          </TableCell>
                          <TableCell><Input placeholder="Optional" {...form.register(`lines.${index}.description`)} /></TableCell>
                          <TableCell>
                            {isService ? (
                              <div className="flex h-9 items-center rounded-md border border-dashed bg-muted/20 px-3 text-xs text-muted-foreground">Not applicable</div>
                            ) : (
                              <>
                                <Select {...unitRegistration} disabled={!selectedProduct} onChange={(event) => {
                                  const currentBaseUnitPrice = selectedProduct && line?.unitOfMeasureId ? convertUnitPriceToBasePrice(selectedProduct, line.unitOfMeasureId, selectedUnitPriceBase) : null
                                  unitRegistration.onChange(event)
                                  const nextBasePrice = selectedProduct && currentBaseUnitPrice !== null ? convertBasePriceToUnitPrice(selectedProduct, event.target.value, currentBaseUnitPrice) : null
                                  if (nextBasePrice !== null) {
                                    form.setValue(`lines.${index}.unitPriceBase`, round6(nextBasePrice), { shouldDirty: true })
                                    form.setValue(`lines.${index}.unitPrice`, rate > 0 ? round6(nextBasePrice / rate) : 0, { shouldDirty: true, shouldValidate: true })
                                  }
                                }}>
                                  <option value="">Select unit</option>
                                  {unitOptions.map((unit) => <option key={unit.id} value={unit.id}>{unit.code} — {unit.name}</option>)}
                                </Select>
                                <p className="mt-1 min-h-4 text-xs text-muted-foreground">Stock <span className="font-mono text-foreground">{values.warehouseId ? `${formatAmount(stock)} ${selectedProduct?.unitCode ?? ''}` : '—'}</span></p>
                              </>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input className="text-right" type="number" min="0.0001" step="0.0001" {...form.register(`lines.${index}.quantity`, { valueAsNumber: true })} />
                            <p className="mt-1 min-h-4 text-right text-xs text-muted-foreground">{selectedProduct && baseQuantity !== null ? `${formatAmount(baseQuantity)} ${selectedProduct.unitCode}` : '\u00a0'}</p>
                            {form.formState.errors.lines?.[index]?.quantity?.message && <ErrorText value={form.formState.errors.lines[index]?.quantity?.message} />}
                          </TableCell>
                          <TableCell>
                            <Input className="text-right" type="number" min="0" step="0.000001" disabled={isForeign && rate <= 0} {...priceRegistration} onChange={(event) => {
                              priceRegistration.onChange(event)
                              const transactionPrice = Number(event.target.value) || 0
                              form.setValue(`lines.${index}.unitPriceBase`, round6(transactionPrice * rate), { shouldDirty: true })
                              form.setValue(`lines.${index}.useMasterPrice`, false, { shouldDirty: true })
                            }} />
                            <p className="mt-1 min-h-4 text-right text-xs text-muted-foreground">{isService || selectedProduct ? `${formatMoney(selectedUnitPriceBase, business?.baseCurrencyDecimalPlaces)} ${business?.baseCurrencyCode ?? ''}${selectedProduct && line?.unitOfMeasureId ? ` / ${unitOptions.find((unit) => unit.id === line.unitOfMeasureId)?.code ?? selectedProduct.unitCode}` : ''}` : '\u00a0'}</p>
                            {form.formState.errors.lines?.[index]?.unitPrice?.message && <ErrorText value={form.formState.errors.lines[index]?.unitPrice?.message} />}
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">{formatMoney(lineTotal, selectedCurrency?.decimalPlaces)}</TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove line" onClick={() => lineFields.remove(index)}><Trash2 className="size-4" /></Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              {form.formState.errors.lines?.root?.message && <p className="border-t px-6 py-3 text-sm text-destructive">{form.formState.errors.lines.root.message}</p>}
              <div className="flex justify-end border-t bg-muted/25 px-6 py-4">
                <div className="w-full max-w-sm space-y-1">
                  <SummaryRow label="Subtotal" value={`${formatMoney(subtotal, selectedCurrency?.decimalPlaces)} ${selectedCurrency?.code ?? ''}`} />
                  {isForeign && <SummaryRow label="Base total" value={`${formatMoney(baseTotal, business?.baseCurrencyDecimalPlaces)} ${business?.baseCurrencyCode ?? ''}`} />}
                  <div className="mt-1 flex w-full items-baseline justify-between gap-8 border-t pt-2 text-base font-semibold">
                    <span>Total</span>
                    <span className="font-mono text-lg">{formatMoney(subtotal, selectedCurrency?.decimalPlaces)} {selectedCurrency?.code ?? ''}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {invoice?.posContext && (
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 pb-4">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base"><Banknote className="size-4" />POS settlement</CardTitle>
                  <CardDescription>{invoice.posContext.documentNumber} · {invoice.posContext.posSessionNumber ?? 'No session number'}</CardDescription>
                </div>
                <SourceBadge label={isClosedPosSession ? 'Closed session' : 'Open session'} muted={!isClosedPosSession} />
              </CardHeader>
              <CardContent className="space-y-4">
                {editingPosted ? (
                  <>
                    <div className="max-w-sm">
                      <Field label="Payment mode">
                        <Select value={posPaymentMode} onChange={(event) => setPosPaymentMode(Number(event.target.value) as PosPaymentModeValue)}>
                          <option value={PosPaymentMode.Paid}>Paid</option>
                          <option value={PosPaymentMode.Partial}>Partial</option>
                          <option value={PosPaymentMode.Credit}>Credit</option>
                        </Select>
                      </Field>
                    </div>
                    {posPaymentMode !== PosPaymentMode.Credit && (
                      <div className="grid gap-3 md:grid-cols-2">
                        {invoice.posContext.sessionCashboxes.map((cashbox) => (
                          <Field key={cashbox.moneyAccountId} label={`${cashbox.moneyAccountCode} · ${cashbox.currencyCode}`}>
                            <Input type="number" min="0" step="0.0001" value={tenderAmounts[cashbox.moneyAccountId] ?? 0} onChange={(event) => setTenderAmounts((current) => ({ ...current, [cashbox.moneyAccountId]: Number(event.target.value) || 0 }))} />
                          </Field>
                        ))}
                      </div>
                    )}
                    {posPaymentMode === PosPaymentMode.Paid && (
                      <div className="grid gap-3 md:grid-cols-2">
                        <Field label="Change cashbox">
                          <Select value={changeCashboxId} onChange={(event) => setChangeCashboxId(event.target.value)}>
                            <option value="">No change</option>
                            {invoice.posContext.sessionCashboxes.map((cashbox) => <option key={cashbox.moneyAccountId} value={cashbox.moneyAccountId}>{cashbox.moneyAccountCode} — {cashbox.currencyCode}</option>)}
                          </Select>
                        </Field>
                        <Field label="Change amount">
                          <Input type="number" min="0" step="0.0001" value={changeAmount} onChange={(event) => setChangeAmount(Number(event.target.value) || 0)} />
                        </Field>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Audit label="Payment mode" value={posPaymentModeLabel[invoice.posContext.paymentMode]} />
                    {invoice.posContext.tenders.map((tender) => <Audit key={tender.moneyAccountId} label={tender.moneyAccountCode} value={`${formatAmount(tender.tenderedAmount)} ${tender.currencyCode}`} />)}
                    {invoice.posContext.change && <Audit label="Change" value={`${formatAmount(invoice.posContext.change.amount)} ${invoice.posContext.change.currencyCode}`} />}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </fieldset>

        {posted && invoice && (
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base"><ReceiptText className="size-4" />Payments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 rounded-lg bg-muted/40 p-4 sm:grid-cols-3">
                <Audit label="Status" value={paymentStatusLabel[invoice.paymentStatus]} />
                <Audit label="Received" value={`${formatAmount(invoice.receivedAmount)} ${invoice.currencyCode}`} />
                <Audit label="Outstanding" value={`${formatAmount(invoice.outstandingAmount)} ${invoice.currencyCode}`} />
              </div>
              {invoice.receipts.length > 0 && (
                <div className="overflow-x-auto rounded-lg border">
                  <Table>
                    <TableHeader><TableRow><TableHead>Receipt</TableHead><TableHead>Date</TableHead><TableHead className="text-right">Applied</TableHead><TableHead className="text-right">Base applied</TableHead></TableRow></TableHeader>
                    <TableBody>{invoice.receipts.map((receipt) => (
                      <TableRow key={receipt.customerReceiptId}>
                        <TableCell><Link className="font-mono font-medium text-primary" to={`/finance/customer-receipts/${receipt.customerReceiptId}`}>{receipt.customerReceiptDocumentNumber}</Link></TableCell>
                        <TableCell>{receipt.receiptDate}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(receipt.amount)} {invoice.currencyCode}</TableCell>
                        <TableCell className="text-right font-mono">{formatAmount(receipt.baseAmount)} {invoice.baseCurrencyCode}</TableCell>
                      </TableRow>
                    ))}</TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {posted && (canEditPosted || canDeletePosted) && (
          <Card>
            <CardHeader className="pb-4"><CardTitle className="flex items-center gap-2 text-base"><History className="size-4" />History</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {history.isPending ? <p className="text-sm text-muted-foreground">Loading…</p>
                : history.isError ? <p className="text-sm text-destructive">{history.error.message}</p>
                  : history.data?.length ? history.data.map((entry) => (
                    <div key={entry.id} className="rounded-lg border p-4">
                      <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                        <div><p className="font-medium capitalize">{entry.action}</p>{entry.reason && <p className="mt-1 text-sm">{entry.reason}</p>}</div>
                        <p className="text-xs text-muted-foreground">{entry.changedByUsername} · {formatTimestamp(entry.changedAtUtc)}</p>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">{entry.beforeState !== null && <SnapshotDetails label="Before" value={entry.beforeState} />}{entry.afterState !== null && <SnapshotDetails label="After" value={entry.afterState} />}</div>
                    </div>
                  )) : <p className="text-sm text-muted-foreground">No corrections yet.</p>}
            </CardContent>
          </Card>
        )}

        {invoice && (
          <div className="grid gap-3 border-t pt-4 text-sm sm:grid-cols-3">
            <Audit label="Created" value={`${invoice.createdByUsername} · ${formatTimestamp(invoice.createdAtUtc)}`} />
            <Audit label="Updated" value={formatTimestamp(invoice.updatedAtUtc)} />
            <Audit label="Posted" value={invoice.postedAtUtc ? formatTimestamp(invoice.postedAtUtc) : '—'} />
          </div>
        )}
      </form>

      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); if (!open) { setDeleteReason(''); setDeleteReasonError(''); deletePosted.reset() } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {invoice?.documentNumber}?</DialogTitle>
            <DialogDescription>
              Generated financial, stock, and POS effects will be removed.{isClosedPosSession ? ' The session stays closed and its Z Report is refreshed.' : ''}
            </DialogDescription>
          </DialogHeader>
          <Field label="Reason" error={deleteReasonError}>
            <Textarea rows={3} value={deleteReason} onChange={(event) => { setDeleteReason(event.target.value); setDeleteReasonError('') }} placeholder="Reason for deletion" />
          </Field>
          {deletePosted.error && <p className="text-sm text-destructive">{deletePosted.error.message}</p>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
            <Button type="button" variant="destructive" disabled={deletePosted.isPending} onClick={confirmPostedDelete}>
              {deletePosted.isPending && <Loader2 className="size-4 animate-spin" />}
              Delete invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="grid content-start gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label> }
function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) { return <select className={`h-9 w-full rounded-md border border-input bg-background px-3 text-sm disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...props} /> }
function Audit({ label, value }: { label: string; value: string }) { return <div><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 font-medium">{value}</p></div> }
function ErrorText({ value }: { value?: string }) { return value ? <p className="mt-1 text-xs text-destructive">{value}</p> : null }
function SourceBadge({ label, muted = false }: { label: string; muted?: boolean }) { return <span className={muted ? 'rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground' : 'rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary'}>{label}</span> }
function SummaryRow({ label, value }: { label: string; value: string }) { return <div className="flex w-full items-center justify-between gap-8 text-sm"><span className="text-muted-foreground">{label}</span><span className="font-mono">{value}</span></div> }
function SnapshotDetails({ label, value }: { label: string; value: unknown }) { return <details className="rounded-md border bg-muted/30 px-3 py-2 text-xs"><summary className="cursor-pointer font-medium">{label}</summary><pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre></details> }
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000
const round6 = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
const formatAmount = (value: number) => value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatMoney = (value: number, decimals = 4) => value.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
const formatTimestamp = (value: string) => new Date(value).toLocaleString()
const paymentStatusLabel = { [SalesInvoicePaymentStatus.Unpaid]: 'Unpaid', [SalesInvoicePaymentStatus.PartiallyPaid]: 'Partially Paid', [SalesInvoicePaymentStatus.Paid]: 'Paid' }
const posPaymentModeLabel = { [PosPaymentMode.Paid]: 'Paid', [PosPaymentMode.Partial]: 'Partial', [PosPaymentMode.Credit]: 'Credit' }
const head = 'border-b bg-muted/40 text-xs uppercase tracking-wide hover:bg-muted/40'

function convertSnapshotBasePriceToUnitPrice(basePrice: number, operation: 0 | 1 | null, factor: number) {
  if (operation === null) return basePrice
  return operation === 0 ? basePrice * factor : basePrice / factor
}
