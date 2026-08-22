import type { MoneyAccountType } from '@/features/finance'
import type { SalesLineType } from '@/features/sales'

export const PosCatalogItemType = { Service: 0, Product: 1 } as const
export type PosCatalogItemType = (typeof PosCatalogItemType)[keyof typeof PosCatalogItemType]
export const PosSaleStatus = { Completed: 0 } as const
export type PosSaleStatus = (typeof PosSaleStatus)[keyof typeof PosSaleStatus]

export interface PosBranch {
  id: string
  code: string
  name: string
  isMainBranch: boolean
}
export interface PosWarehouse {
  id: string
  code: string
  name: string
  branchId: string
}
export interface PosCategory {
  id: string
  name: string
  itemType: PosCatalogItemType
}
export interface PosProfessional {
  id: string
  username: string
}
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
  unitCode: string | null
  availableQuantity: number | null
  imageReference: string | null
}
export interface PosCustomer {
  id: string
  name: string
  primaryPhoneNumber: string | null
}

export interface PosCatalogFilters {
  page: number
  pageSize: number
  search?: string
  itemType?: PosCatalogItemType
  categoryId?: string
  warehouseId?: string
}
export interface PosCustomerFilters {
  page: number
  pageSize: number
  search?: string
}

export interface CompletePosSaleInput {
  branchId: string
  warehouseId: string | null
  customerId: string | null
  lines: {
    lineType: SalesLineType
    serviceId: string | null
    productId: string | null
    quantity: number
    professionalUserId: string | null
  }[]
  tenders: { moneyAccountId: string; amount: number }[]
  change: { moneyAccountId: string; amount: number } | null
}

export interface PosSaleLine {
  id: string
  lineType: SalesLineType
  serviceId: string | null
  serviceName: string | null
  productId: string | null
  productName: string | null
  sku: string | null
  unitCode: string | null
  professionalUserId: string | null
  professionalUsername: string | null
  quantity: number
  unitPrice: number
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
  cashierUserId: string
  cashierUsername: string
  completedAtUtc: string
  journalEntryId: string
  stockMovementIds: string[]
  lines: PosSaleLine[]
  tenders: PosTender[]
  change: PosChange | null
}
