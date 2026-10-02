import type { MoneyAccountType, PaymentMoneyDirection } from '@/features/finance'
import type { ProductUnitConversion } from '@/features/inventory'
import type { SalesInvoicePaymentStatus, SalesLineType } from '@/features/sales'

export const PosCatalogItemType = { Service: 0, Product: 1 } as const
export type PosCatalogItemType = (typeof PosCatalogItemType)[keyof typeof PosCatalogItemType]
export const PosPaymentMode = { Paid: 0, Partial: 1, Credit: 2 } as const
export type PosPaymentMode = (typeof PosPaymentMode)[keyof typeof PosPaymentMode]
export const PosRefundStatus = { Posted: 0 } as const
export type PosRefundStatus = (typeof PosRefundStatus)[keyof typeof PosRefundStatus]
export const PosRefundState = { NotRefunded: 0, PartiallyRefunded: 1, FullyRefunded: 2 } as const
export type PosRefundState = (typeof PosRefundState)[keyof typeof PosRefundState]
export const PosRefundReason = {
  WrongServiceEntered: 0,
  WrongProductEntered: 1,
  CustomerComplaint: 2,
  DuplicateSale: 3,
  ProductReturned: 4,
  ServiceIssue: 5,
  CashierMistake: 6,
  Other: 7,
} as const
export type PosRefundReason = (typeof PosRefundReason)[keyof typeof PosRefundReason]

export interface PosBranch { id: string; code: string; name: string; isMainBranch: boolean }
export interface PosWarehouse { id: string; code: string; name: string; branchId: string }
export interface PosCategory { id: string; name: string; itemType: PosCatalogItemType }
export interface PosProfessional { id: string; name: string }
export interface PosMoneyAccount {
  id: string
  code: string
  name: string
  type: MoneyAccountType
  branchId: string
  currencyId: string
  currencyCode: string
  currencyDecimalPlaces: number
  balance: number
  currentExchangeRate: number | null
}
export interface PosSetup {
  baseCurrencyId: string
  baseCurrencyCode: string
  branches: PosBranch[]
  warehouses: PosWarehouse[]
  categories: PosCategory[]
  professionals: PosProfessional[]
  moneyAccounts: PosMoneyAccount[]
}

export interface PosCatalogItem {
  itemType: PosCatalogItemType
  id: string
  name: string
  categoryId: string
  categoryName: string
  unitPriceBase: number
  sku: string | null
  barcode: string | null
  unitOfMeasureId: string | null
  unitName: string | null
  unitCode: string | null
  availableQuantity: number | null
  imageReference: string | null
  unitConversions: ProductUnitConversion[]
}
export interface PosCustomer { id: string; name: string; primaryPhoneNumber: string | null }

export interface PosCartLine {
  item: PosCatalogItem
  quantity: number
  unitOfMeasureId: string
  unitPriceBase: number
}

export interface PosCatalogFilters {
  page: number
  pageSize: number
  search?: string
  itemType?: PosCatalogItemType
  categoryId?: string
  warehouseId?: string
}
export interface PosCustomerFilters { page: number; pageSize: number; search?: string }
export interface PosSaleFilters {
  page: number
  pageSize: number
  search?: string
  customerId?: string
  branchId?: string
  refundState?: PosRefundState
  fromDate?: string
  toDate?: string
}

export interface PosCollectionInput { moneyAccountId: string; amount: number }
export interface ChangeMoneyLineInput { moneyAccountId: string; amount: number }

export interface CompletePosSaleInput {
  branchId: string
  warehouseId: string | null
  customerId: string | null
  lines: {
    lineType: SalesLineType
    serviceId: string | null
    productId: string | null
    unitOfMeasureId: string | null
    quantity: number
    professionalId: string | null
  }[]
  collections: PosCollectionInput[]
  change: ChangeMoneyLineInput | null
  paymentMode: PosPaymentMode
  clientRequestId?: string
}

export interface CorrectPosSettlementInput {
  paymentMode: PosPaymentMode
  collections: PosCollectionInput[]
  change: ChangeMoneyLineInput | null
  reason: string
  expectedUpdatedAtUtc: string
}

export interface PosSaleLine {
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
  quantity: number
  conversionOperation: 0 | 1 | null
  conversionFactor: number
  baseQuantity: number
  unitPrice: number
  baseUnitPrice: number
  lineTotal: number
}

export interface PosPaymentMoneyLine {
  id: string
  sequence: number
  direction: PaymentMoneyDirection
  moneyAccountId: string
  moneyAccountCode: string
  moneyAccountName: string
  currencyId: string
  currencyCode: string
  amount: number
  exchangeRate: number
  baseAmount: number
  moneyLedgerEntryId: string
}

export interface PosSale {
  id: string
  documentNumber: string
  customerId: string
  customerName: string
  branchId: string
  branchCode: string
  branchName: string
  warehouseId: string | null
  warehouseCode: string | null
  warehouseName: string | null
  baseCurrencyId: string
  baseCurrencyCode: string
  subtotal: number
  total: number
  grossCollectionBaseAmount: number
  changeBaseAmount: number
  collectedBaseAmount: number
  outstandingBaseAmount: number
  overpaidBaseAmount: number
  refundedBaseAmount: number
  remainingRefundableBaseAmount: number
  netSaleBaseAmount: number
  refundStatus: PosRefundState
  paymentStatus: SalesInvoicePaymentStatus
  paymentId: string | null
  paymentDocumentNumber: string | null
  operatorUserId: string
  operatorUsername: string
  completedAtUtc: string
  updatedAtUtc: string
  journalEntryId: string
  stockMovementIds: string[]
  lines: PosSaleLine[]
  collections: PosPaymentMoneyLine[]
  change: PosPaymentMoneyLine | null
  refunds: PosRefundSummary[]
}

export interface PosSaleSummary {
  id: string
  documentNumber: string
  completedAtUtc: string
  branchId: string
  branchName: string
  customerId: string
  customerName: string
  total: number
  collectedBaseAmount: number
  outstandingBaseAmount: number
  overpaidBaseAmount: number
  refundedBaseAmount: number
  netSaleBaseAmount: number
  refundStatus: PosRefundState
  paymentStatus: SalesInvoicePaymentStatus
  baseCurrencyCode: string
  operatorUsername: string
}

export interface PosRefundSummary {
  id: string
  documentNumber: string
  isVoid: boolean
  reason: PosRefundReason
  totalRefundBase: number
  receivableReversalBase: number
  cashRefundBase: number
  postedAtUtc: string
  approvedByUsername: string
}

export interface PosRefundabilityLine {
  salesInvoiceLineId: string
  lineType: SalesLineType
  description: string
  sku: string | null
  unitCode: string | null
  professionalName: string | null
  originalQuantity: number
  refundedQuantity: number
  refundableQuantity: number
  originalLineAmountBase: number
  refundedAmountBase: number
  refundableAmountBase: number
  canRestock: boolean
}

export interface PosRefundability {
  salesInvoiceId: string
  salesInvoiceDocumentNumber: string
  branchId: string
  customerId: string
  customerName: string
  warehouseId: string | null
  completedAtUtc: string
  operatorUsername: string
  originalTotalBase: number
  refundedBaseAmount: number
  remainingRefundableBaseAmount: number
  currentOutstandingBaseAmount: number
  refundStatus: PosRefundState
  baseCurrencyId: string
  baseCurrencyCode: string
  lines: PosRefundabilityLine[]
  refunds: PosRefundSummary[]
}

export interface PosRefundLine {
  id: string
  originalSalesInvoiceLineId: string
  lineType: SalesLineType
  description: string
  unitCode: string | null
  professionalName: string | null
  quantity: number
  baseQuantity: number
  refundAmountBase: number
  restockProduct: boolean
  originalUnitCostBase: number | null
  stockMovementIds: string[]
}

export interface PosRefundPayout {
  id: string
  sequence: number
  moneyAccountId: string
  moneyAccountCode: string
  moneyAccountName: string
  currencyId: string
  currencyCode: string
  amount: number
  exchangeRate: number
  baseAmount: number
  moneyLedgerEntryId: string
}

export interface PosRefund {
  id: string
  documentNumber: string
  salesInvoiceId: string
  salesInvoiceDocumentNumber: string
  branchId: string
  branchCode: string
  branchName: string
  customerId: string
  customerName: string
  reason: PosRefundReason
  notes: string | null
  isVoid: boolean
  status: PosRefundStatus
  totalRefundBase: number
  receivableReversalBase: number
  cashRefundBase: number
  baseCurrencyId: string
  baseCurrencyCode: string
  createdByUserId: string
  createdByUsername: string
  approvedByUserId: string
  approvedByUsername: string
  createdAtUtc: string
  postedAtUtc: string
  journalEntryId: string
  lines: PosRefundLine[]
  refundPayouts: PosRefundPayout[]
}

export interface CreatePosRefundInput {
  reason: PosRefundReason
  notes: string | null
  lines: { salesInvoiceLineId: string; quantity: number; restockProduct: boolean }[]
  refundPayouts: { moneyAccountId: string; amount: number }[]
  clientRequestId?: string
}

export interface VoidPosSaleInput {
  reason: PosRefundReason
  notes: string | null
  restockSalesInvoiceLineIds: string[]
  refundPayouts: { moneyAccountId: string; amount: number }[]
  clientRequestId?: string
}
