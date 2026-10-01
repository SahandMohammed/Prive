import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowLeft,
  Banknote,
  BookOpen,
  History,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Trash2,
} from 'lucide-react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { hasCapability, useCurrentUser } from '@/features/auth'
import { getSelectedBranchId, useBranches, useCurrencies, useCurrentBusiness } from '@/features/business'
import { useContacts } from '@/features/contacts'
import {
  MoneyAccountAccessLevel,
  PaymentOrigin,
  useEffectiveExchangeRate,
  useMoneyAccounts,
} from '@/features/finance'
import {
  useProducts,
  useStockBalances,
  useWarehouses,
} from '@/features/inventory'
import { cn } from '@/lib/utils'
import {
  InvoicePaymentDialog,
  PosSettlementDialog,
  SalesInvoiceItemsTable,
  type SalesItemOption,
} from '../components'
import {
  useCreateActiveSalesInvoice,
  useDeleteActiveSalesInvoice,
  useSalesInvoice,
  useSalesInvoiceHistory,
  useSalesItems,
  useServices,
  useUpdateActiveSalesInvoice,
} from '../hooks/useSales'
import { salesInvoiceSchema } from '../schemas/sales.schemas'
import { PosPaymentMode, SalesInvoicePaymentStatus, SalesLineType } from '../types/sales.types'
import type {
  SalesInvoice,
  SalesInvoiceDraftInput,
  SalesInvoiceFormValues,
  SalesInvoiceLineForm,
  SalesInvoicePayment,
  SalesLineType as SalesLineTypeValue,
} from '../types/sales.types'

type LineForm = SalesInvoiceLineForm
type InvoiceForm = SalesInvoiceFormValues

const today = () => new Date().toLocaleDateString('en-CA')
const newEmptyLine = (): LineForm => ({
  lineType: SalesLineType.Service,
  itemId: '',
  serviceId: '',
  productId: '',
  unitOfMeasureId: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  unitPriceBase: 0,
  useMasterPrice: true,
})
const newServiceLine = (): LineForm => ({
  ...newEmptyLine(),
  lineType: SalesLineType.Service,
})
const newProductLine = (): LineForm => ({
  ...newEmptyLine(),
  lineType: SalesLineType.Product,
})

const invoiceToForm = (invoice: SalesInvoice): InvoiceForm => ({
  customerId: invoice.customerId,
  invoiceDate: invoice.invoiceDate,
  branchId: invoice.branchId,
  warehouseId: invoice.warehouseId ?? '',
  currencyId: invoice.currencyId,
  exchangeRate: invoice.exchangeRate,
  notes: invoice.notes ?? '',
  lines: invoice.lines.map((line) => ({
    lineType: line.lineType,
    itemId: (line.lineType === SalesLineType.Service ? line.serviceId : line.productId) ?? '',
    serviceId: line.serviceId ?? '',
    productId: line.productId ?? '',
    unitOfMeasureId: line.unitOfMeasureId ?? '',
    description: line.description ?? '',
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    unitPriceBase: convertSnapshotBasePriceToUnitPrice(
      line.baseUnitPrice,
      line.conversionOperation,
      line.conversionFactor
    ),
    useMasterPrice: !line.isPriceOverridden,
  })),
  payments: [],
})

export function CreateSalesInvoicePage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const shouldEdit = searchParams.get('edit') === 'true'
  const navigate = useNavigate()

  const invoiceQuery = useSalesInvoice(id)
  const create = useCreateActiveSalesInvoice()
  const update = useUpdateActiveSalesInvoice(id)
  const remove = useDeleteActiveSalesInvoice(id)

  const currentUser = useCurrentUser().data
  const canEditPosted = hasCapability(currentUser?.role, 'editPostedInvoice')
  const canDeletePosted = hasCapability(currentUser?.role, 'deletePostedInvoice')
  const canCorrectPosSettlement = hasCapability(currentUser?.role, 'correctPosSettlement')

  const [editingInvoiceOverride, setEditingInvoice] = useState<boolean | null>(null)
  const editingInvoice = editingInvoiceOverride ?? (shouldEdit && canEditPosted)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteReason, setDeleteReason] = useState('')
  const [deleteReasonError, setDeleteReasonError] = useState('')
  const [historyOpen, setHistoryOpen] = useState(false)

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<SalesInvoicePayment | null>(null)
  const [posSettlementOpen, setPosSettlementOpen] = useState(false)

  const customers = useContacts({ page: 1, pageSize: 100, role: 0, isActive: true }).data?.data ?? []
  const branches = useBranches().data?.data ?? []
  const warehouses = useWarehouses().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const business = useCurrentBusiness().data
  const services = useServices({ page: 1, pageSize: 100, isActive: true }).data?.data ?? []
  const products = useProducts().data?.data ?? []
  const catalogItemsQuery = useSalesItems({ isActive: true })

  const form = useForm<InvoiceForm>({
    resolver: zodResolver(salesInvoiceSchema),
    defaultValues: {
      customerId: '',
      invoiceDate: today(),
      branchId: getSelectedBranchId(),
      warehouseId: '',
      currencyId: '',
      exchangeRate: 1,
      notes: '',
      lines: [newEmptyLine()],
      payments: [],
    },
  })

  const lineFields = useFieldArray({ control: form.control, name: 'lines' })
  const paymentFields = useFieldArray({ control: form.control, name: 'payments' })
  const values = useWatch({ control: form.control })
  const invoice = invoiceQuery.data
  const isExistingInvoice = Boolean(invoice)
  const history = useSalesInvoiceHistory(id, Boolean(isExistingInvoice && (canEditPosted || canDeletePosted)))

  const selectedCurrencyId = values.currencyId ?? ''
  const selectedCurrency = currencies.find((item) => item.id === selectedCurrencyId)
  const isForeign = Boolean(selectedCurrencyId && business && selectedCurrencyId !== business.baseCurrencyId)
  const rate = isForeign ? Number(values.exchangeRate) || 0 : 1
  const embeddedMoneyAccountsQuery = useMoneyAccounts(
    {
      page: 1,
      pageSize: 100,
      branchId: values.branchId || undefined,
      currencyId: selectedCurrencyId || undefined,
      isActive: true,
    },
    false,
    !isExistingInvoice && Boolean(values.branchId && selectedCurrencyId)
  )
  const embeddedMoneyAccounts = embeddedMoneyAccountsQuery.data?.data.filter((account) =>
    account.isActive
    && account.branchId === values.branchId
    && account.currencyId === selectedCurrencyId
    && account.currentUserAccess === MoneyAccountAccessLevel.Operate
  ) ?? []
  const effectiveRateQuery = useEffectiveExchangeRate(
    selectedCurrencyId,
    values.invoiceDate,
    isForeign && !isExistingInvoice
  )
  const resolvedRateKey = useRef('')
  const pricingContext = useRef({ currencyId: '', rate: 1 })
  const hasProductLines = (values.lines ?? []).some(
    (line) => line?.lineType === SalesLineType.Product && (line?.productId || line?.itemId)
  )
  const balances = useStockBalances({ warehouseId: values.warehouseId || undefined }).data?.data ?? []

  useEffect(() => {
    if (isExistingInvoice
      || !values.branchId
      || !selectedCurrencyId
      || !embeddedMoneyAccountsQuery.isSuccess
      || embeddedMoneyAccountsQuery.isFetching) return

    const validAccountIds = new Set((embeddedMoneyAccountsQuery.data?.data ?? [])
      .filter((account) => account.isActive
        && account.branchId === values.branchId
        && account.currencyId === selectedCurrencyId
        && account.currentUserAccess === MoneyAccountAccessLevel.Operate)
      .map((account) => account.id))
    form.getValues('payments').forEach((payment, index) => {
      if (payment.moneyAccountId && !validAccountIds.has(payment.moneyAccountId)) {
        form.setValue(`payments.${index}.moneyAccountId`, '', {
          shouldDirty: true,
          shouldValidate: true,
        })
      }
    })
  }, [
    embeddedMoneyAccountsQuery.data,
    embeddedMoneyAccountsQuery.isFetching,
    embeddedMoneyAccountsQuery.isSuccess,
    form,
    isExistingInvoice,
    selectedCurrencyId,
    values.branchId,
  ])

  // Initialize form on invoice load or URL edit flag
  useEffect(() => {
    if (!invoice) return
    resolvedRateKey.current = `${invoice.currencyId}:${invoice.invoiceDate}`
    pricingContext.current = { currencyId: invoice.currencyId, rate: invoice.exchangeRate }
    const formValues = invoiceToForm(invoice)
    if (formValues.lines.length === 0) {
      formValues.lines = [newEmptyLine()]
    }
    form.reset(formValues)
  }, [invoice, form])

  // Default currency for new invoice
  useEffect(() => {
    if (id || !business || form.getValues('currencyId')) return
    form.setValue('currencyId', business.baseCurrencyId)
  }, [business, form, id])

  // Exchange rate lookup
  useEffect(() => {
    if (isExistingInvoice || !selectedCurrencyId || !values.invoiceDate) return
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
  }, [effectiveRateQuery.data, form, isExistingInvoice, isForeign, selectedCurrencyId, values.invoiceDate])

  // Multi-currency price recalculation on line items
  useEffect(() => {
    if (!selectedCurrencyId || rate <= 0) return
    if (pricingContext.current.currencyId === selectedCurrencyId && pricingContext.current.rate === rate) return
    form.getValues('lines').forEach((line, index) => {
      form.setValue(`lines.${index}.unitPrice`, round6((line.unitPriceBase ?? 0) / rate), {
        shouldDirty: true,
        shouldValidate: true,
      })
    })
    pricingContext.current = { currencyId: selectedCurrencyId, rate }
  }, [form, rate, selectedCurrencyId])

  // Fallback options for historical or inactive masters
  const selectableCustomers = [...customers]
  if (invoice?.customerId && !selectableCustomers.some((item) => item.id === invoice.customerId)) {
    selectableCustomers.push({
      id: invoice.customerId,
      name: invoice.customerName,
      kind: 0,
      isCustomer: true,
      isSupplier: false,
      primaryPhoneNumber: null,
      secondaryPhoneNumber: null,
      email: null,
      address: null,
      city: null,
      region: null,
      country: null,
      notes: null,
      isActive: false,
    })
  }

  const selectableServices = [...services]
  invoice?.lines
    .filter((line) => line.lineType === SalesLineType.Service)
    .forEach((line) => {
      if (line.serviceId && !selectableServices.some((item) => item.id === line.serviceId)) {
        selectableServices.push({
          id: line.serviceId,
          name: line.serviceName ?? 'Historical Service',
          categoryId: '',
          categoryName: 'Historical',
          sellingPriceBase: round4(line.unitPrice * invoice.exchangeRate),
          durationMinutes: 1,
          revenueAccountId: '',
          revenueAccountCode: '',
          revenueAccountName: '',
          isActive: false,
          description: null,
        })
      }
    })

  const selectableProducts = [
    ...products.filter((item) => item.isActive && item.trackInventory && (item.purpose === 0 || item.purpose === 2)),
  ]
  invoice?.lines
    .filter((line) => line.lineType === SalesLineType.Product)
    .forEach((line) => {
      if (line.productId && !selectableProducts.some((item) => item.id === line.productId)) {
        selectableProducts.push({
          id: line.productId,
          name: line.productName ?? 'Historical Product',
          sku: line.sku ?? '',
          barcode: null,
          categoryId: '',
          categoryName: '',
          subcategoryId: null,
          subcategoryName: null,
          unitOfMeasureId: line.unitOfMeasureId ?? '',
          unitName: line.unitCode ?? '',
          unitCode: line.unitCode ?? '',
          purpose: 0,
          purchasePriceBase: 0,
          sellingPriceBase: round4(line.unitPrice * invoice.exchangeRate),
          trackInventory: true,
          isActive: false,
          description: null,
          imageReference: null,
          totalQuantity: 0,
          averageCostBase: 0,
          totalValueBase: 0,
          unitConversions: [],
        })
      }
    })

  const availableWarehouses = warehouses.filter(
    (item) => (isExistingInvoice || item.isActive) && item.branchId === values.branchId
  )
  const subtotal = (values.lines ?? []).reduce(
    (sum, line) => sum + (Number(line?.quantity) || 0) * (Number(line?.unitPrice) || 0),
    0
  )
  const baseTotal = (values.lines ?? []).reduce(
    (sum, line) => sum + (Number(line?.quantity) || 0) * (Number(line?.unitPriceBase) || 0),
    0
  )

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

  const handleAddLine = () => {
    lineFields.append(newEmptyLine())
  }

  const handleRemoveLine = (index: number) => {
    if (lineFields.fields.length <= 1) {
      lineFields.update(0, newEmptyLine())
    } else {
      lineFields.remove(index)
    }
  }

  const handleAddMultipleItems = (selectedItems: SalesItemOption[]) => {
    if (selectedItems.length === 0) return

    const currentLines = form.getValues('lines')
    const isFirstLineEmpty =
      currentLines.length === 1 &&
      !currentLines[0].itemId &&
      !currentLines[0].serviceId &&
      !currentLines[0].productId

    selectedItems.forEach((item, idx) => {
      const isService = item.type === SalesLineType.Service
      const calculatedUnitPrice = rate > 0 ? round6(item.basePrice / rate) : 0
      const newLineData: LineForm = {
        lineType: item.type,
        itemId: item.id,
        serviceId: isService ? item.id : '',
        productId: isService ? '' : item.id,
        unitOfMeasureId: isService ? '' : item.unitOfMeasureId ?? '',
        description: '',
        quantity: 1,
        unitPriceBase: item.basePrice,
        unitPrice: calculatedUnitPrice,
        useMasterPrice: true,
      }

      if (idx === 0 && isFirstLineEmpty) {
        lineFields.update(0, newLineData)
      } else {
        lineFields.append(newLineData)
      }
    })
  }

  const submit = form.handleSubmit((value) => {
    if (isForeign && (!value.exchangeRate || value.exchangeRate <= 0)) {
      form.setError('exchangeRate', { message: 'Exchange rate must be greater than zero.' })
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
      lines: value.lines.map((line: SalesInvoiceLineForm) => {
        const targetItemId = line.itemId || (line.lineType === SalesLineType.Product ? line.productId : line.serviceId)
        return {
          lineType: line.lineType ?? null,
          itemId: targetItemId || null,
          serviceId: line.lineType === SalesLineType.Service ? line.serviceId || targetItemId || null : null,
          productId: line.lineType === SalesLineType.Product ? line.productId || targetItemId || null : null,
          unitOfMeasureId: line.lineType === SalesLineType.Product ? line.unitOfMeasureId || null : null,
          description: line.description?.trim() || null,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          useMasterPrice: line.useMasterPrice ?? true,
        }
      }),
      payments: value.payments.map((payment) => ({
        paymentDate: payment.paymentDate,
        moneyAccountId: payment.moneyAccountId,
        amount: payment.amount,
        exchangeRate: isForeign ? value.exchangeRate : null,
        notes: payment.notes.trim() || null,
      })),
    }

    if (invoice) {
      const commercialCorrection: Omit<SalesInvoiceDraftInput, 'payments'> = {
        customerId: body.customerId,
        invoiceDate: body.invoiceDate,
        branchId: body.branchId,
        warehouseId: body.warehouseId,
        currencyId: body.currencyId,
        exchangeRate: body.exchangeRate,
        notes: body.notes,
        lines: body.lines,
      }

      update.mutate(
        { ...commercialCorrection, expectedUpdatedAtUtc: invoice.updatedAtUtc },
        {
          onSuccess: () => {
            setEditingInvoice(false)
            if (shouldEdit) navigate(`/sales/invoices/${id}`, { replace: true })
          },
        }
      )
      return
    }

    create.mutate(body, { onSuccess: (saved) => navigate(`/sales/invoices/${saved.id}`) })
  })

  const cancelInvoiceEdit = () => {
    if (invoice) form.reset(invoiceToForm(invoice))
    update.reset()
    setEditingInvoice(false)
    if (shouldEdit) navigate(`/sales/invoices/${id}`, { replace: true })
  }

  const startInvoiceEdit = () => {
    if (!invoice) return
    update.reset()
    form.reset(invoiceToForm(invoice))
    setEditingInvoice(true)
  }

  const confirmInvoiceDelete = () => {
    if (!invoice) return
    const reason = deleteReason.trim()
    if (!reason) {
      setDeleteReasonError('A deletion reason is required')
      return
    }
    setDeleteReasonError('')
    remove.mutate(
      { reason, expectedUpdatedAtUtc: invoice.updatedAtUtc },
      {
        onSuccess: () => navigate('/sales/invoices'),
      }
    )
  }

  if (id && invoiceQuery.isPending) {
    return (
      <div className="grid h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invoiceQuery.isError) {
    return <p className="text-destructive">{invoiceQuery.error.message}</p>
  }

  const requestError = invoice ? (editingInvoice ? update.error : remove.error) : create.error
  const isBusy = create.isPending || remove.isPending || update.isPending
  const isClosedPosSession = invoice?.posContext?.sessionStatus === 1
  const pageTitle = invoice?.documentNumber ?? 'New sales invoice'
  const isReadOnly = Boolean(invoice && !editingInvoice)

  return (
    <div className="flex min-h-full w-full flex-col pb-12">
      {/* HEADER BAR */}
      <header className="sticky -top-5 sm:-top-7 md:-top-8 z-20 -mt-5 sm:-mt-7 md:-mt-8 -mx-5 sm:-mx-7 md:-mx-8 px-5 sm:px-7 md:px-8 py-3.5 sm:py-4 bg-background/95 backdrop-blur-md border-b border-border/80 shadow-2xs flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <Link to="/sales/invoices">
            <Button variant="outline" size="icon-sm" aria-label="Back to Sales Invoices">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
              {invoice && (
                <Badge
                  variant={
                    invoice.paymentStatus === SalesInvoicePaymentStatus.Paid
                      ? 'success'
                      : invoice.paymentStatus === SalesInvoicePaymentStatus.PartiallyPaid
                        ? 'champagne'
                        : 'secondary'
                  }
                >
                  {paymentStatusLabel[invoice.paymentStatus]}
                </Badge>
              )}
              {invoice?.posContext && (
                <Badge variant="outline" className="gap-1 font-mono text-[10px]">
                  <Banknote className="size-3 text-primary" /> POS Sale
                </Badge>
              )}
              {editingInvoice && (
                <Badge variant="champagne" className="gap-1 text-xs">
                  <Pencil className="size-3" /> Editing
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {invoice?.posContext
                ? `POS Sale ${invoice.documentNumber} · Session ${invoice.posContext.posSessionNumber ?? '—'}`
                : invoice
                  ? `Posted sales invoice · ${formatTimestamp(invoice.createdAtUtc)}`
                  : 'Create and post a new sales invoice'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Running grand total pill */}
          <div className="hidden sm:flex items-center gap-2 rounded-lg border border-border/80 bg-muted/40 px-3 py-1.5 shadow-2xs">
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {isReadOnly ? 'Total' : 'Invoice Total'}
            </span>
            <span className="font-mono text-sm font-bold text-primary">
              {formatMoney(isReadOnly ? invoice?.total : subtotal, selectedCurrency?.decimalPlaces)}{' '}
              {selectedCurrency?.code ?? invoice?.currencyCode ?? ''}
            </span>
          </div>
          {editingInvoice ? (
            <>
              {(canEditPosted || canDeletePosted) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <History className="size-3.5" />
                  History
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={cancelInvoiceEdit}
                disabled={isBusy}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="sales-invoice-form"
                size="sm"
                disabled={update.isPending}
                className="gap-1.5 text-xs shadow-xs"
              >
                {update.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save changes
              </Button>
            </>
          ) : invoice ? (
            <>
              <Link to={`/inventory/ledger?documentNumber=${encodeURIComponent(invoice.documentNumber)}`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <PackageSearch className="size-3.5" />
                  Stock
                </Button>
              </Link>
              {invoice.journalEntryId && (
                <Link to={`/accounting/journal?search=${encodeURIComponent(invoice.documentNumber)}`}>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <BookOpen className="size-3.5" />
                    Journal
                  </Button>
                </Link>
              )}
              {(canEditPosted || canDeletePosted) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setHistoryOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <History className="size-3.5" />
                  History
                </Button>
              )}
              {canEditPosted && (
                <Button
                  type="button"
                  size="sm"
                  onClick={startInvoiceEdit}
                  className="gap-1.5 text-xs shadow-xs"
                >
                  <Pencil className="size-3.5" />
                  Edit
                </Button>
              )}
              {canDeletePosted && (
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteOpen(true)}
                  className="gap-1.5 text-xs"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              )}
            </>
          ) : (
            <>
              <Link to="/sales/invoices">
                <Button type="button" variant="outline" size="sm" disabled={isBusy} className="text-xs">
                  Cancel
                </Button>
              </Link>
              <Button
                type="submit"
                form="sales-invoice-form"
                size="sm"
                disabled={create.isPending}
                className="gap-1.5 text-xs shadow-xs"
              >
                {create.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save invoice
              </Button>
            </>
          )}
        </div>
      </header>

      <form id="sales-invoice-form" onSubmit={submit} className="mt-5 sm:mt-7 md:mt-8 flex flex-col gap-5">
        {requestError && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {requestError.message}
          </div>
        )}

        {/* INVOICE DETAILS CARD */}
        {isReadOnly && invoice ? (
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold tracking-tight">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-6 pt-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Customer</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {invoice.customerName}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Invoice Date</p>
                <p className="mt-1 font-mono text-sm font-medium text-foreground">{invoice.invoiceDate}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Branch</p>
                <p className="mt-1 text-sm font-medium text-foreground">{invoice.branchName}</p>
                <p className="text-xs text-muted-foreground">{invoice.branchCode}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Warehouse</p>
                <p className="mt-1 text-sm font-medium text-foreground">
                  {invoice.warehouseName ?? 'No stock warehouse'}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Currency</p>
                <p className="mt-1 font-mono text-sm font-bold text-foreground">{invoice.currencyCode}</p>
              </div>
              {isForeign && (
                <div>
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
                    Exchange Rate
                  </p>
                  <p className="mt-1 font-mono text-sm text-foreground">
                    1 {invoice.currencyCode} = {invoice.exchangeRate} {business?.baseCurrencyCode}
                  </p>
                </div>
              )}
              {invoice.notes && (
                <div className="sm:col-span-2 lg:col-span-4">
                  <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Notes</p>
                  <p className="mt-1 text-xs text-foreground/90 whitespace-pre-wrap rounded-md bg-muted/30 p-2.5 border border-border/40">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-3 border-b border-border/50">
              <CardTitle className="text-sm font-semibold tracking-tight">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4 sm:grid-cols-2 xl:grid-cols-4">
              <Field label="Customer" error={form.formState.errors.customerId?.message}>
                <Select {...form.register('customerId')}>
                  <option value="">{invoice?.posContext ? 'Walk-in customer' : 'Select customer'}</option>
                  {selectableCustomers.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                      {!item.isActive ? ' (inactive)' : ''}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Invoice date" error={form.formState.errors.invoiceDate?.message}>
                <Input type="date" {...form.register('invoiceDate')} className="h-9 text-xs" />
              </Field>
              <Field label="Branch" error={form.formState.errors.branchId?.message}>
                <Select
                  {...form.register('branchId', {
                    onChange: () => form.setValue('warehouseId', '', { shouldDirty: true }),
                  })}
                  disabled={Boolean(invoice?.posContext)}
                >
                  {branches
                    .filter((item) => isExistingInvoice || item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.name}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field
                label={hasProductLines ? 'Warehouse' : 'Warehouse (optional)'}
                error={form.formState.errors.warehouseId?.message}
              >
                <Select {...form.register('warehouseId')}>
                  <option value="">{hasProductLines ? 'Select warehouse' : 'No warehouse'}</option>
                  {availableWarehouses.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Currency" error={form.formState.errors.currencyId?.message}>
                <Select
                  {...form.register('currencyId', { onChange: handleCurrencyChange })}
                  disabled={Boolean(invoice?.posContext)}
                >
                  <option value="">Select currency</option>
                  {currencies
                    .filter((item) => isExistingInvoice || item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.code} — {item.name}
                      </option>
                    ))}
                </Select>
              </Field>
              {isForeign && (
                <Field
                  label={`Exchange rate (${selectedCurrency?.code ?? ''} → ${business?.baseCurrencyCode ?? ''})`}
                  error={form.formState.errors.exchangeRate?.message ?? effectiveRateQuery.error?.message}
                >
                  <Input
                    type="number"
                    min="0.000001"
                    step="0.000001"
                    className="h-9 text-xs font-mono"
                    {...form.register('exchangeRate', {
                      setValueAs: (value) => (value === '' ? null : Number(value)),
                    })}
                  />
                </Field>
              )}
              <div className={isForeign ? 'sm:col-span-2' : 'sm:col-span-2 xl:col-span-3'}>
                <Field label="Notes" error={form.formState.errors.notes?.message}>
                  <Textarea rows={2} placeholder="Optional notes for this invoice" {...form.register('notes')} />
                </Field>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ITEMS TABLE CARD */}
        <SalesInvoiceItemsTable
          isReadOnly={isReadOnly}
          invoice={invoice}
          fields={lineFields.fields}
          lines={values.lines}
          register={form.register}
          setValue={form.setValue}
          errors={form.formState.errors}
          catalogItems={catalogItemsQuery.data?.data}
          onAddLine={handleAddLine}
          onAddService={handleAddLine}
          onAddProduct={handleAddLine}
          onRemoveLine={handleRemoveLine}
          onAddMultipleItems={handleAddMultipleItems}
          onChangeLineType={changeLineType}
          selectableServices={selectableServices}
          selectableProducts={selectableProducts}
          selectedCurrency={selectedCurrency}
          business={business}
          isForeign={isForeign}
          rate={rate}
          balances={balances}
          warehouseId={values.warehouseId}
          subtotal={subtotal}
          baseTotal={baseTotal}
        />

        {/* EMBEDDED PAYMENTS (NEW INVOICE ONLY) */}
        {!invoice && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/50 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ReceiptText className="size-4 text-primary" />
                  Payments
                </CardTitle>
                <CardDescription className="text-xs">
                  Optionally collect one or more Payments while posting this invoice.
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => paymentFields.append({
                  paymentDate: values.invoiceDate || today(),
                  moneyAccountId: '',
                  amount: 0,
                  exchangeRate: isForeign ? rate : 1,
                  notes: '',
                })}
              >
                <Plus className="size-3.5" />
                Add Payment
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              {paymentFields.fields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border p-5 text-center text-xs text-muted-foreground">
                  No Payment will be collected when the invoice is posted.
                </p>
              ) : paymentFields.fields.map((field, index) => (
                <div key={field.id} className="grid gap-3 rounded-lg border border-border/70 p-3 lg:grid-cols-[1fr_1.5fr_1fr_1.5fr_auto] lg:items-end">
                  <Field label="Payment date" error={form.formState.errors.payments?.[index]?.paymentDate?.message}>
                    <Input type="date" {...form.register(`payments.${index}.paymentDate`)} />
                  </Field>
                  <Field label={`Money Account (${selectedCurrency?.code ?? ''})`} error={form.formState.errors.payments?.[index]?.moneyAccountId?.message}>
                    <Select {...form.register(`payments.${index}.moneyAccountId`)}>
                      <option value="">Select account</option>
                      {embeddedMoneyAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.code} — {account.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Amount" error={form.formState.errors.payments?.[index]?.amount?.message}>
                    <Input
                      type="number"
                      min="0.0001"
                      step="0.0001"
                      className="font-mono"
                      {...form.register(`payments.${index}.amount`, { valueAsNumber: true })}
                    />
                  </Field>
                  <Field label="Notes" error={form.formState.errors.payments?.[index]?.notes?.message}>
                    <Input placeholder="Optional" {...form.register(`payments.${index}.notes`)} />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove Payment ${index + 1}`}
                    onClick={() => paymentFields.remove(index)}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {form.formState.errors.payments?.message && (
                <p className="text-xs text-destructive">{form.formState.errors.payments.message}</p>
              )}
              {isForeign && paymentFields.fields.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Embedded Payments use the invoice exchange rate of {formatAmount(rate)}.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* POS DETAILS CARD (IF POS CONTEXT) */}
        {invoice?.posContext && (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4 pb-3 border-b border-border/50">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <Banknote className="size-4 text-primary" />
                  POS Details
                </CardTitle>
                <CardDescription className="text-xs">
                  {invoice.documentNumber} · Session {invoice.posContext.posSessionNumber ?? '—'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isClosedPosSession ? 'secondary' : 'champagne'}>
                  {isClosedPosSession ? 'Closed session' : 'Open session'}
                </Badge>
                {canCorrectPosSettlement && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs"
                    onClick={() => setPosSettlementOpen(true)}
                  >
                    <Pencil className="size-3.5" />
                    Correct POS Payment
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Audit label="Cashier" value={invoice.posContext.cashierUsername} />
                <Audit label="Payment Mode" value={posPaymentModeLabel[invoice.posContext.paymentMode]} />
                <Audit label="Payment" value={invoice.posContext.paymentDocumentNumber ?? 'No payment'} />
                <Audit label="Completed" value={formatTimestamp(invoice.posContext.completedAtUtc)} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {invoice.posContext.tenders.map((tender) => (
                  <div key={tender.id} className="rounded-lg border border-border/70 p-3">
                    <Audit
                      label={`Tender · ${tender.moneyAccountCode}`}
                      value={`${formatAmount(tender.tenderedAmount)} ${tender.currencyCode}`}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">{tender.moneyAccountName}</p>
                  </div>
                ))}
                {invoice.posContext.change && (
                  <div className="rounded-lg border border-border/70 p-3">
                    <Audit
                      label={`Change · ${invoice.posContext.change.moneyAccountCode}`}
                      value={`${formatAmount(invoice.posContext.change.amount)} ${invoice.posContext.change.currencyCode}`}
                    />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {invoice.posContext.change.moneyAccountName}
                    </p>
                  </div>
                )}
                {invoice.posContext.tenders.length === 0 && !invoice.posContext.change && (
                  <p className="text-xs text-muted-foreground">Credit checkout — no drawer movement.</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* PAYMENTS & RECEIPTS CARD (IF EXISTING) */}
        {invoice && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 border-b border-border/50 pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <ReceiptText className="size-4 text-primary" />
                  Payments & Allocations
              </CardTitle>
              {!invoice.posContext && invoice.outstandingAmount > 0 && (
                <Button
                  type="button"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={() => {
                    setSelectedPayment(null)
                    setPaymentDialogOpen(true)
                  }}
                >
                  <Plus className="size-3.5" />
                  Add Payment
                </Button>
              )}
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="grid gap-4 rounded-xl border border-border/60 bg-muted/30 p-4 sm:grid-cols-3">
                <Audit label="Settlement Status" value={paymentStatusLabel[invoice.paymentStatus]} />
                <Audit
                  label="Collected Amount"
                  value={`${formatAmount(invoice.collectedAmount)} ${invoice.currencyCode}`}
                />
                <Audit
                  label="Outstanding Balance"
                  value={`${formatAmount(invoice.outstandingAmount)} ${invoice.currencyCode}`}
                />
              </div>
              {(invoice.payments ?? []).length > 0 && (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40">
                        <TableHead className="px-4 py-2.5">Payment #</TableHead>
                        <TableHead className="px-4 py-2.5">Date</TableHead>
                        <TableHead className="px-4 py-2.5 text-right">Applied</TableHead>
                        <TableHead className="px-4 py-2.5 text-right">Base Applied</TableHead>
                        <TableHead className="px-4 py-2.5 text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-border/60">
                      {(invoice.payments ?? []).map((payment) => (
                        <TableRow key={payment.paymentId} className="hover:bg-muted/20">
                          <TableCell className="px-4 py-2.5">
                            <Link
                              className="font-mono text-xs font-semibold text-primary hover:underline"
                              to={`/finance/payments/${payment.paymentId}`}
                            >
                              {payment.paymentDocumentNumber}
                            </Link>
                          </TableCell>
                          <TableCell className="px-4 py-2.5 font-mono text-xs text-muted-foreground">
                            {payment.paymentDate}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-right font-mono text-xs font-bold text-foreground">
                            {formatAmount(payment.amount)} {invoice.currencyCode}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-right font-mono text-xs text-muted-foreground">
                            {formatAmount(payment.baseAmount)} {invoice.baseCurrencyCode}
                          </TableCell>
                          <TableCell className="px-4 py-2.5 text-right">
                            {payment.origin === PaymentOrigin.SalesInvoice && !invoice.posContext ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => {
                                  setSelectedPayment(payment)
                                  setPaymentDialogOpen(true)
                                }}
                              >
                                <Pencil className="size-3.5" />
                                Edit
                              </Button>
                            ) : (
                              <Link
                                className="text-xs font-medium text-primary hover:underline"
                                to={`/finance/payments/${payment.paymentId}`}
                              >
                                View source
                              </Link>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* AUDIT TIMESTAMPS FOOTER */}
        {invoice && (
          <div className="grid gap-3 border-t border-border pt-4 text-xs text-muted-foreground sm:grid-cols-2">
            <Audit label="Created By" value={`${invoice.createdByUsername} · ${formatTimestamp(invoice.createdAtUtc)}`} />
            <Audit label="Last Updated" value={formatTimestamp(invoice.updatedAtUtc)} />
          </div>
        )}
      </form>

      {invoice && (
        <InvoicePaymentDialog
          invoice={invoice}
          payment={selectedPayment}
          open={paymentDialogOpen}
          onOpenChange={(open) => {
            setPaymentDialogOpen(open)
            if (!open) setSelectedPayment(null)
          }}
        />
      )}

      {invoice?.posContext && (
        <PosSettlementDialog
          invoice={invoice}
          open={posSettlementOpen}
          onOpenChange={setPosSettlementOpen}
        />
      )}

      {/* AUDIT HISTORY MODAL */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              Audit History · {invoice?.documentNumber}
            </DialogTitle>
            <DialogDescription>
              Chronological log of changes, revisions, and corrections made to this invoice.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {history.isPending ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : history.isError ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">
                {history.error.message}
              </div>
            ) : !history.data || history.data.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">No audit events recorded for this invoice.</p>
            ) : (
              <div className="relative space-y-4 pl-6 before:absolute before:bottom-2 before:left-2 before:top-2 before:w-0.5 before:bg-border">
                {history.data.map((entry) => (
                  <div key={entry.id} className="relative rounded-lg border border-border bg-card p-4 shadow-2xs">
                    <div className="absolute -left-[23px] top-4 size-3 rounded-full border-2 border-background bg-primary" />
                    <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold capitalize text-foreground">{entry.action}</span>
                          <Badge variant="outline" className="text-[10px]">{entry.source}</Badge>
                          <span className="rounded bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                            {entry.changedByUsername}
                          </span>
                        </div>
                        {entry.reason && (
                          <p className="mt-1.5 rounded border border-border/40 bg-muted/40 p-2 text-xs text-foreground/90">
                            <strong className="text-muted-foreground">Reason:</strong> {entry.reason}
                          </p>
                        )}
                      </div>
                      <span className="whitespace-nowrap text-xs text-muted-foreground">
                        {formatTimestamp(entry.changedAtUtc)}
                      </span>
                    </div>

                    {(entry.beforeState !== null || entry.afterState !== null) && (
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-border/40 pt-2">
                        {entry.beforeState !== null && (
                          <SnapshotDetails label="Before State" value={entry.beforeState} />
                        )}
                        {entry.afterState !== null && (
                          <SnapshotDetails label="After State" value={entry.afterState} />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose render={<Button variant="outline" size="sm" />}>Close</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open)
          if (!open) {
            setDeleteReason('')
            setDeleteReasonError('')
            remove.reset()
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-4" />
              Delete {invoice?.documentNumber}?
            </DialogTitle>
            <DialogDescription>
              Generated financial entries, accounts receivable, and stock movements will be reversed.
              {isClosedPosSession ? ' The session stays closed and its Z Report is refreshed.' : ''}
            </DialogDescription>
          </DialogHeader>

          <Field label="Reason for deletion *" error={deleteReasonError}>
            <Textarea
              rows={3}
              value={deleteReason}
              onChange={(event) => {
                setDeleteReason(event.target.value)
                setDeleteReasonError('')
              }}
              placeholder="Enter audit trail explanation for deleting this posted invoice"
            />
          </Field>

          {remove.error && <p className="text-xs text-destructive">{remove.error.message}</p>}

          <DialogFooter className="gap-2 sm:gap-0">
            <DialogClose render={<Button variant="outline" size="sm" />}>Cancel</DialogClose>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={remove.isPending}
              onClick={confirmInvoiceDelete}
              className="gap-1.5"
            >
              {remove.isPending && <Loader2 className="size-3.5 animate-spin" />}
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={cn('grid content-start gap-1.5 text-xs font-semibold text-foreground', className)}>
      <span>{label}</span>
      {children}
      {error && <span className="text-[11px] font-normal text-destructive">{error}</span>}
    </label>
  )
}

function Select({ className = '', ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-9 w-full rounded-lg border border-border bg-card px-3 text-xs text-foreground shadow-2xs outline-none transition-colors hover:border-input focus:border-ring focus:ring-1 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  )
}

function Audit({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium text-foreground text-xs">{value}</p>
    </div>
  )
}

function SnapshotDetails({ label, value }: { label: string; value: unknown }) {
  const [open, setOpen] = useState(false)
  if (!value) return null
  return (
    <div className="w-full rounded-md border border-border bg-muted/20 text-xs">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span>{label}</span>
        <span className="text-[10px] text-primary">{open ? 'Hide details' : 'View details'}</span>
      </button>
      {open && (
        <div className="border-t border-border/40 p-3 max-h-60 overflow-y-auto">
          <pre className="font-mono text-[11px] text-foreground/80 whitespace-pre-wrap break-all">
            {JSON.stringify(value, null, 2)}
          </pre>
        </div>
      )}
    </div>
  )
}

const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10000) / 10000
const round6 = (value: number) => Math.round((value + Number.EPSILON) * 1_000_000) / 1_000_000
const formatAmount = (value: number | null | undefined) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatMoney = (value: number | null | undefined, decimals = 4) =>
  (Number(value) || 0).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
const formatTimestamp = (value: string) => new Date(value).toLocaleString()
const paymentStatusLabel = {
  [SalesInvoicePaymentStatus.Unpaid]: 'Unpaid',
  [SalesInvoicePaymentStatus.PartiallyPaid]: 'Partially Paid',
  [SalesInvoicePaymentStatus.Paid]: 'Paid',
  [SalesInvoicePaymentStatus.Overpaid]: 'Overpaid',
}
const posPaymentModeLabel = {
  [PosPaymentMode.Paid]: 'Paid',
  [PosPaymentMode.Partial]: 'Partial',
  [PosPaymentMode.Credit]: 'Credit',
}

function convertSnapshotBasePriceToUnitPrice(basePrice: number, operation: 0 | 1 | null, factor: number) {
  if (operation === null) return basePrice
  return operation === 0 ? basePrice * factor : basePrice / factor
}
