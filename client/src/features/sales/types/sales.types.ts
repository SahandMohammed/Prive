export const SalesInvoiceStatus = { Draft: 0, Posted: 1 } as const
export type SalesInvoiceStatus = typeof SalesInvoiceStatus[keyof typeof SalesInvoiceStatus]
export const SalesLineType = { Service: 0, Product: 1 } as const
export type SalesLineType = typeof SalesLineType[keyof typeof SalesLineType]
export const SalesInvoicePaymentStatus = { Unpaid: 0, PartiallyPaid: 1, Paid: 2, Overpaid: 3 } as const
export type SalesInvoicePaymentStatus = typeof SalesInvoicePaymentStatus[keyof typeof SalesInvoicePaymentStatus]

export interface ServiceCategory {
  id: string
  name: string
  isActive: boolean
}

export interface Service {
  id: string
  name: string
  categoryId: string
  categoryName: string
  sellingPriceBase: number
  durationMinutes: number
  revenueAccountId: string
  revenueAccountCode: string
  revenueAccountName: string
  isActive: boolean
  description: string | null
}

export interface ServiceCategoryInput { name: string; isActive: boolean }
export interface ServiceInput {
  name: string
  categoryId: string
  sellingPriceBase: number
  durationMinutes: number
  revenueAccountId: string
  isActive: boolean
  description: string | null
}

export interface SalesInvoiceFilters {
  page: number
  pageSize: number
  search?: string
  customerId?: string
  fromDate?: string
  toDate?: string
  branchId?: string
  currencyId?: string
  status?: string
  sortBy?: string
  sortDescending?: boolean
}

export interface DeletedSalesInvoiceFilters {
  page: number
  pageSize: number
  search?: string
  fromDate?: string
  toDate?: string
}

export interface SalesInvoiceSummary {
  id: string
  documentNumber: string
  customerId: string
  customerName: string
  invoiceDate: string
  branchId: string
  branchName: string
  warehouseId: string | null
  warehouseName: string | null
  currencyId: string
  currencyCode: string
  total: number
  baseTotal: number
  status: SalesInvoiceStatus
  createdByUserId: string
  createdByUsername: string
  createdAtUtc: string
  updatedAtUtc: string
  postedAtUtc: string | null
}

export interface SalesInvoiceLine {
  id: string
  lineType: SalesLineType
  serviceId: string | null
  serviceName: string | null
  productId: string | null
  productName: string | null
  sku: string | null
  unitOfMeasureId: string | null
  unitCode: string | null
  professionalId: string | null
  professionalName: string | null
  description: string | null
  quantity: number
  conversionOperation: 0 | 1 | null
  conversionFactor: number
  baseQuantity: number
  unitPrice: number
  baseUnitPrice: number
  isPriceOverridden: boolean
  lineSubtotal: number
  lineAmount: number
  baseLineAmount: number
}

export interface SalesInvoicePayment {
  paymentId: string
  paymentDocumentNumber: string
  paymentDate: string
  amount: number
  baseAmount: number
  origin: number
  journalEntryId: string
}

export const PosPaymentMode = { Paid: 0, Partial: 1, Credit: 2 } as const
export type PosPaymentMode = typeof PosPaymentMode[keyof typeof PosPaymentMode]

export interface SalesInvoicePosCashbox {
  moneyAccountId: string
  moneyAccountCode: string
  moneyAccountName: string
  currencyId: string
  currencyCode: string
  currencyDecimalPlaces: number
  amount: number
  exchangeRate: number
  baseAmount: number
}

export interface SalesInvoicePosTender {
  id: string
  sequence: number
  moneyAccountId: string
  moneyAccountCode: string
  moneyAccountName: string
  currencyId: string
  currencyCode: string
  tenderedAmount: number
  exchangeRate: number
  baseAmount: number
  paymentMoneyLineId: string
  moneyLedgerEntryId: string
}

export interface SalesInvoicePosChange extends Omit<SalesInvoicePosTender, 'sequence' | 'tenderedAmount'> {
  amount: number
}

export interface SalesInvoicePosContext {
  posSessionId: string
  posSessionNumber: string
  sessionStatus: number
  cashierUserId: string
  cashierUsername: string
  paymentId: string | null
  paymentDocumentNumber: string | null
  paymentMode: PosPaymentMode
  completedAtUtc: string
  sessionCashboxes: SalesInvoicePosCashbox[]
  tenders: SalesInvoicePosTender[]
  change: SalesInvoicePosChange | null
}

export interface SalesInvoice extends SalesInvoiceSummary {
  branchCode: string
  warehouseCode: string | null
  baseCurrencyId: string
  baseCurrencyCode: string
  exchangeRate: number
  subtotal: number
  notes: string | null
  journalEntryId: string | null
  collectedAmount: number
  receivableReductionAmount: number
  outstandingAmount: number
  overpaidAmount: number
  paymentStatus: SalesInvoicePaymentStatus
  payments: SalesInvoicePayment[]
  stockMovementIds: string[]
  lines: SalesInvoiceLine[]
  posContext: SalesInvoicePosContext | null
}

export interface SalesCatalogItem {
  id: string
  name: string
  type: SalesLineType
  basePrice: number
  categoryId: string
  categoryName: string
  sku?: string | null
  unitOfMeasureId?: string | null
  unitName?: string | null
  unitCode?: string | null
  durationMinutes?: number | null
  isActive: boolean
  availableQuantity?: number | null
  unitConversions?: {
    id: string
    unitOfMeasureId: string
    name: string
    code: string
    operation: number
    factor: number
  }[]
}

export interface SalesInvoiceDraftInput {
  customerId: string | null
  invoiceDate: string
  branchId: string
  warehouseId: string | null
  currencyId: string
  exchangeRate: number | null
  notes: string | null
  lines: {
    lineType?: SalesLineType | null
    itemId?: string | null
    serviceId?: string | null
    productId?: string | null
    unitOfMeasureId?: string | null
    description: string | null
    quantity: number
    unitPrice: number
    useMasterPrice: boolean
  }[]
  payments?: { paymentDate: string; moneyAccountId: string; amount: number; exchangeRate: number | null; notes: string | null }[]
}

export interface InvoicePaymentInput { paymentDate: string; moneyAccountId: string; amount: number; exchangeRate: number | null; notes: string | null }
export interface UpdateInvoicePaymentInput extends InvoicePaymentInput { reason: string; expectedUpdatedAtUtc: string }

export interface SalesInvoiceLineForm {
  lineType?: SalesLineType
  itemId?: string
  serviceId?: string
  productId?: string
  unitOfMeasureId?: string
  description?: string | null
  quantity: number
  unitPrice: number
  unitPriceBase?: number
  useMasterPrice?: boolean
}

export interface SalesInvoiceFormValues {
  customerId: string
  invoiceDate: string
  branchId: string
  warehouseId: string
  currencyId: string
  exchangeRate: number | null
  notes: string
  lines: SalesInvoiceLineForm[]
  payments: { paymentDate: string; moneyAccountId: string; amount: number; exchangeRate: number | null; notes: string }[]
}

export interface PostedSalesInvoiceInput extends Omit<SalesInvoiceDraftInput, 'payments'> {
  reason?: string | null
  expectedUpdatedAtUtc: string
}

export interface SalesInvoiceHistory {
  id: string
  action: string
  reason: string | null
  changedByUserId: string
  changedByUsername: string
  changedAtUtc: string
  beforeState: unknown | null
  afterState: unknown | null
}

export interface DeletedSalesInvoice {
  id: string
  documentNumber: string
  invoiceDate: string
  branchId: string
  branchName: string
  customerId: string
  customerName: string
  total: number
  baseTotal: number
  postedAtUtc: string | null
  deletedAtUtc: string
  deletedByUserId: string
  deletedByUsername: string
  deleteReason: string
  isPosSale: boolean
}
