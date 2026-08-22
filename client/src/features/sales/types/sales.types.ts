export const SalesInvoiceStatus = { Draft: 0, Posted: 1 } as const
export type SalesInvoiceStatus = typeof SalesInvoiceStatus[keyof typeof SalesInvoiceStatus]
export const SalesLineType = { Service: 0, Product: 1 } as const
export type SalesLineType = typeof SalesLineType[keyof typeof SalesLineType]
export const SalesInvoicePaymentStatus = { Unpaid: 0, PartiallyPaid: 1, Paid: 2 } as const
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
}

export interface SalesInvoiceSummary {
  id: string
  documentNumber: string
  customerId: string | null
  customerName: string | null
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
  professionalUserId: string | null
  professionalUsername: string | null
  description: string | null
  quantity: number
  unitPrice: number
  lineSubtotal: number
  lineAmount: number
  baseLineAmount: number
}

export interface SalesInvoiceReceipt {
  customerReceiptId: string
  customerReceiptDocumentNumber: string
  receiptDate: string
  amount: number
  baseAmount: number
  journalEntryId: string | null
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
  receivedAmount: number
  outstandingAmount: number
  paymentStatus: SalesInvoicePaymentStatus
  receipts: SalesInvoiceReceipt[]
  stockMovementIds: string[]
  lines: SalesInvoiceLine[]
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
    lineType: SalesLineType
    serviceId: string | null
    productId: string | null
    unitOfMeasureId: string | null
    description: string | null
    quantity: number
    unitPrice: number
  }[]
}
