export const PurchaseInvoiceStatus = { Draft: 0, Posted: 1 } as const
export type PurchaseInvoiceStatus = typeof PurchaseInvoiceStatus[keyof typeof PurchaseInvoiceStatus]

export interface PurchaseInvoiceFilters {
  page: number
  pageSize: number
  search?: string
  supplierId?: string
  fromDate?: string
  toDate?: string
  branchId?: string
  warehouseId?: string
  currencyId?: string
  status?: string
}

export interface PurchaseInvoiceSummary {
  id: string
  documentNumber: string
  supplierId: string
  supplierName: string
  invoiceDate: string
  supplierReference: string | null
  branchId: string
  branchName: string
  warehouseId: string
  warehouseName: string
  currencyId: string
  currencyCode: string
  total: number
  baseTotal: number
  status: PurchaseInvoiceStatus
  createdByUserId: string
  createdByUsername: string
  createdAtUtc: string
  updatedAtUtc: string
  postedAtUtc: string | null
}

export interface PurchaseInvoiceLine {
  id: string
  productId: string
  productName: string
  sku: string
  unitOfMeasureId: string
  unitCode: string
  quantity: number
  unitCost: number
  lineSubtotal: number
  lineAmount: number
  baseLineAmount: number
}

export interface PurchaseInvoice extends PurchaseInvoiceSummary {
  branchCode: string
  warehouseCode: string
  baseCurrencyId: string
  baseCurrencyCode: string
  exchangeRate: number
  subtotal: number
  notes: string | null
  journalEntryId: string | null
  stockMovementIds: string[]
  lines: PurchaseInvoiceLine[]
}

export interface PurchaseInvoiceDraftInput {
  supplierId: string
  invoiceDate: string
  supplierReference: string | null
  branchId: string
  warehouseId: string
  currencyId: string
  exchangeRate: number | null
  notes: string | null
  lines: {
    productId: string
    unitOfMeasureId: string
    quantity: number
    unitCost: number
  }[]
}
