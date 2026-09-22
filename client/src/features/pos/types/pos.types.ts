import type { MoneyAccountType } from '@/features/finance'
import type { ProductUnitConversion } from '@/features/inventory'
import type { SalesLineType } from '@/features/sales'

export const PosCatalogItemType = { Service: 0, Product: 1 } as const
export type PosCatalogItemType = (typeof PosCatalogItemType)[keyof typeof PosCatalogItemType]
export const PosSaleStatus = { Completed: 0 } as const
export type PosSaleStatus = (typeof PosSaleStatus)[keyof typeof PosSaleStatus]
export const PosSessionStatus = { Open: 0, Closed: 1 } as const
export type PosSessionStatus = (typeof PosSessionStatus)[keyof typeof PosSessionStatus]
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
export const PosDrawerMovementType = { CashIn: 0, CashOut: 1, CashDrop: 2, Adjustment: 3 } as const
export type PosDrawerMovementType = (typeof PosDrawerMovementType)[keyof typeof PosDrawerMovementType]
export const PosDrawerAdjustmentDirection = { In: 0, Out: 1 } as const
export type PosDrawerAdjustmentDirection = (typeof PosDrawerAdjustmentDirection)[keyof typeof PosDrawerAdjustmentDirection]

export interface PosBranch { id: string; code: string; name: string; isMainBranch: boolean }
export interface PosWarehouse { id: string; code: string; name: string; branchId: string }
export interface PosCategory { id: string; name: string; itemType: PosCatalogItemType }
export interface PosProfessional { id: string; username: string }
export interface PosMoneyAccount {
  id: string
  code: string
  name: string
  type: MoneyAccountType
  branchId: string
  currencyId: string
  currencyCode: string
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
  professionalUserId: string
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
export interface PosRegisterFilters {
  page?: number
  pageSize?: number
  search?: string
  includeInactive?: boolean
}
export interface PosSessionFilters {
  page: number
  pageSize: number
  status?: PosSessionStatus
  registerId?: string
  cashierUserId?: string
  fromDate?: string
  toDate?: string
}
export interface PosZReportFilters {
  page: number
  pageSize: number
  registerId?: string
  cashierUserId?: string
  fromDate?: string
  toDate?: string
}

export interface CompletePosSaleInput {
  branchId: string
  posSessionId: string
  warehouseId: string | null
  customerId: string | null
  lines: {
    lineType: SalesLineType
    serviceId: string | null
    productId: string | null
    unitOfMeasureId: string | null
    quantity: number
    professionalUserId: string | null
  }[]
  tenders: { moneyAccountId: string; amount: number }[]
  change: { moneyAccountId: string; amount: number } | null
  paymentMode: PosPaymentMode
  clientRequestId?: string
}

export interface PosRegister {
  id: string
  code: string
  name: string
  branchId: string
  isActive: boolean
  hasOpenSession: boolean
}
export interface PosSessionCount {
  currencyId: string
  currencyCode: string
  amount: number
  exchangeRate: number
  baseAmount: number
}
export interface PosSession {
  id: string
  sessionNumber: string
  branchId: string
  branchCode: string
  branchName: string
  registerId: string
  registerCode: string
  registerName: string
  cashierUserId: string
  cashierUsername: string
  status: PosSessionStatus
  openedAtUtc: string
  closedAtUtc: string | null
  closedByUserId: string | null
  closedByUsername: string | null
  openingNotes: string | null
  closingNotes: string | null
  openingCounts: PosSessionCount[]
}
export interface PosSessionSummary {
  id: string
  sessionNumber: string
  registerId: string
  registerCode: string
  registerName: string
  cashierUserId: string
  cashierUsername: string
  status: PosSessionStatus
  openedAtUtc: string
  closedAtUtc: string | null
  saleCount: number
  grossSalesBase: number
  varianceBase: number
  baseCurrencyCode: string
}
export interface OpenPosSessionInput {
  registerId: string
  openingCounts: { currencyId: string; amount: number }[]
  notes: string | null
}
export interface ClosePosSessionInput {
  closingCounts: { currencyId: string; countedAmount: number }[]
  notes: string | null
}
export interface PosPaymentSummary {
  moneyAccountId: string
  moneyAccountCode: string
  moneyAccountName: string
  moneyAccountType: MoneyAccountType
  currencyId: string
  currencyCode: string
  tenderedAmount: number
  changeAmount: number
  refundAmount: number
  netAmount: number
  tenderedBaseAmount: number
  changeBaseAmount: number
  refundBaseAmount: number
  netBaseAmount: number
}
export interface PosDrawerSummary {
  currencyId: string
  currencyCode: string
  openingAmount: number
  tenderedAmount: number
  changeAmount: number
  refundAmount: number
  expectedAmount: number
  countedAmount: number | null
  varianceAmount: number | null
  openingBaseAmount: number
  tenderedBaseAmount: number
  changeBaseAmount: number
  refundBaseAmount: number
  expectedBaseAmount: number
  countedBaseAmount: number | null
  varianceBaseAmount: number | null
  cashInAmount: number
  cashOutAmount: number
  cashDropAmount: number
  adjustmentAmount: number
  cashInBaseAmount: number
  cashOutBaseAmount: number
  cashDropBaseAmount: number
  adjustmentBaseAmount: number
  closingExchangeRate: number | null
}
export interface PosXReport {
  session: PosSession
  generatedAtUtc: string
  saleCount: number
  serviceSalesBase: number
  productSalesBase: number
  grossSalesBase: number
  refundCount: number
  serviceRefundsBase: number
  productRefundsBase: number
  refundTotalBase: number
  netSalesBase: number
  baseCurrencyId: string
  baseCurrencyCode: string
  payments: PosPaymentSummary[]
  drawers: PosDrawerSummary[]
}
export interface PosZReportSummary {
  id: string
  reportNumber: string
  posSessionId: string
  sessionNumber: string
  registerId: string
  registerCode: string
  registerName: string
  cashierUserId: string
  cashierUsername: string
  openedAtUtc: string
  closedAtUtc: string
  saleCount: number
  grossSalesBase: number
  refundCount: number
  refundTotalBase: number
  netSalesBase: number
  varianceBase: number
  baseCurrencyCode: string
}
export interface PosZReport {
  id: string
  reportNumber: string
  posSessionId: string
  sessionNumber: string
  branchId: string
  branchCode: string
  branchName: string
  registerId: string
  registerCode: string
  registerName: string
  cashierUserId: string
  cashierUsername: string
  closedByUserId: string
  closedByUsername: string
  openedAtUtc: string
  closedAtUtc: string
  generatedAtUtc: string
  saleCount: number
  serviceSalesBase: number
  productSalesBase: number
  grossSalesBase: number
  refundCount: number
  serviceRefundsBase: number
  productRefundsBase: number
  refundTotalBase: number
  netSalesBase: number
  baseCurrencyId: string
  baseCurrencyCode: string
  payments: PosPaymentSummary[]
  drawers: PosDrawerSummary[]
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
  professionalUserId: string | null
  professionalUsername: string | null
  quantity: number
  conversionOperation: 0 | 1 | null
  conversionFactor: number
  baseQuantity: number
  unitPrice: number
  baseUnitPrice: number
  lineTotal: number
}
export interface PosTender {
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
  moneyLedgerEntryId: string
}
export interface PosChange {
  id: string
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
  status: PosSaleStatus
  posSessionId: string | null
  salesInvoiceId: string
  customerId: string | null
  customerName: string | null
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
  tenderedBaseAmount: number
  changeBaseAmount: number
  settledBaseAmount: number
  outstandingBaseAmount: number
  refundedBaseAmount: number
  remainingRefundableBaseAmount: number
  netSaleBaseAmount: number
  refundStatus: PosRefundState
  paymentMode: PosPaymentMode
  cashierUserId: string
  cashierUsername: string
  completedAtUtc: string
  journalEntryId: string
  stockMovementIds: string[]
  lines: PosSaleLine[]
  tenders: PosTender[]
  change: PosChange | null
  refunds: PosRefundSummary[]
}

export interface PosSaleSummary {
  id: string
  documentNumber: string
  completedAtUtc: string
  branchId: string
  branchName: string
  customerId: string | null
  customerName: string | null
  posSessionId: string | null
  posSessionNumber: string | null
  total: number
  settledBaseAmount: number
  outstandingBaseAmount: number
  refundedBaseAmount: number
  netSaleBaseAmount: number
  refundStatus: PosRefundState
  paymentMode: PosPaymentMode
  baseCurrencyCode: string
  cashierUsername: string
}

export interface PosSaleFilters {
  page: number
  pageSize: number
  search?: string
  customerId?: string
  branchId?: string
  posSessionId?: string
  paymentMode?: PosPaymentMode
  refundState?: PosRefundState
  fromDate?: string
  toDate?: string
}

export interface PosDrawerMovement {
  id: string
  documentNumber: string
  posSessionId: string
  posSessionNumber: string
  type: PosDrawerMovementType
  adjustmentDirection: PosDrawerAdjustmentDirection | null
  cashboxMoneyAccountId: string
  cashboxMoneyAccountCode: string
  destinationMoneyAccountId: string | null
  destinationMoneyAccountCode: string | null
  offsetAccountId: string | null
  offsetAccountCode: string | null
  currencyId: string
  currencyCode: string
  amount: number
  exchangeRate: number
  baseAmount: number
  reason: string
  notes: string | null
  createdByUserId: string
  createdByUsername: string
  createdAtUtc: string
  journalEntryId: string
  cashboxLedgerEntryId: string
  destinationLedgerEntryId: string | null
}

export interface CreatePosDrawerMovementInput {
  type: PosDrawerMovementType
  adjustmentDirection: PosDrawerAdjustmentDirection | null
  cashboxMoneyAccountId: string
  destinationMoneyAccountId: string | null
  offsetAccountId: string | null
  amount: number
  reason: string
  notes: string | null
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
  professionalUsername: string | null
  originalQuantity: number
  refundedQuantity: number
  refundableQuantity: number
  originalLineAmountBase: number
  refundedAmountBase: number
  refundableAmountBase: number
  canRestock: boolean
}

export interface PosRefundability {
  posSaleId: string
  posSaleDocumentNumber: string
  salesInvoiceId: string
  salesInvoiceDocumentNumber: string
  branchId: string
  customerId: string | null
  customerName: string | null
  warehouseId: string | null
  completedAtUtc: string
  cashierUsername: string
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
  professionalUsername: string | null
  quantity: number
  baseQuantity: number
  refundAmountBase: number
  restockProduct: boolean
  originalUnitCostBase: number | null
  stockMovementIds: string[]
}

export interface PosRefundTender {
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
  posSaleId: string
  posSaleDocumentNumber: string
  salesInvoiceId: string
  salesInvoiceDocumentNumber: string
  branchId: string
  branchCode: string
  branchName: string
  posSessionId: string
  posSessionNumber: string
  customerId: string | null
  customerName: string | null
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
  tenders: PosRefundTender[]
}

export interface CreatePosRefundInput {
  posSessionId: string
  reason: PosRefundReason
  notes: string | null
  lines: { salesInvoiceLineId: string; quantity: number; restockProduct: boolean }[]
  refundTenders: { moneyAccountId: string; amount: number }[]
  clientRequestId?: string
}

export interface VoidPosSaleInput {
  posSessionId: string
  reason: PosRefundReason
  notes: string | null
  restockSalesInvoiceLineIds: string[]
  refundTenders: { moneyAccountId: string; amount: number }[]
  clientRequestId?: string
}
