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
}

export interface PosRegister { id: string; code: string; name: string; branchId: string; isActive: boolean }
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
  netAmount: number
  tenderedBaseAmount: number
  changeBaseAmount: number
  netBaseAmount: number
}
export interface PosDrawerSummary {
  currencyId: string
  currencyCode: string
  openingAmount: number
  tenderedAmount: number
  changeAmount: number
  expectedAmount: number
  countedAmount: number | null
  varianceAmount: number | null
  openingBaseAmount: number
  tenderedBaseAmount: number
  changeBaseAmount: number
  expectedBaseAmount: number
  countedBaseAmount: number | null
  varianceBaseAmount: number | null
}
export interface PosXReport {
  session: PosSession
  generatedAtUtc: string
  saleCount: number
  serviceSalesBase: number
  productSalesBase: number
  grossSalesBase: number
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
  paymentMode: PosPaymentMode
  cashierUserId: string
  cashierUsername: string
  completedAtUtc: string
  journalEntryId: string
  stockMovementIds: string[]
  lines: PosSaleLine[]
  tenders: PosTender[]
  change: PosChange | null
}
