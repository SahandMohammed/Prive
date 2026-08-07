export const AccountCategory = {
  Asset: 1000,
  Liability: 2000,
  Equity: 3000,
  Revenue: 4000,
  Expense: 5000,
} as const
export type AccountCategory = typeof AccountCategory[keyof typeof AccountCategory]

export const ContactType = {
  Customer: 1,
  Vendor: 2,
} as const
export type ContactType = typeof ContactType[keyof typeof ContactType]

export const InvoiceType = {
  SalesInvoice: 1,
  SalesReturn: 2,
  PurchaseInvoice: 3,
  PurchaseReturn: 4,
} as const
export type InvoiceType = typeof InvoiceType[keyof typeof InvoiceType]

export const VoucherType = {
  Receipt: 1,
  Payment: 2,
  InternalTransfer: 3,
  CurrencyExchange: 4,
  DirectIncome: 5,
  DirectExpense: 6,
} as const
export type VoucherType = typeof VoucherType[keyof typeof VoucherType]

export interface CurrencyDto {
  id: string
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBaseCurrency: boolean
}

export interface CreateCurrencyRequest {
  code: string
  name: string
  symbol: string
  exchangeRate: number
  isBaseCurrency: boolean
}

export interface AccountDto {
  id: string
  code: string
  name: string
  category: AccountCategory
  parentAccountId: string | null
  isLeaf: boolean
  currencyId: string | null
  isActive: boolean
}

export interface CreateAccountRequest {
  code: string
  name: string
  category: AccountCategory
  parentAccountId?: string | null
  currencyId?: string | null
}

export interface ContactDto {
  id: string
  name: string
  type: ContactType
  accountId: string
  isActive: boolean
}

export interface CreateContactRequest {
  name: string
  type: ContactType
}

export interface InvoiceLineDto {
  description: string
  accountId: string
  quantity: number
  unitPrice: number
}

export interface InvoiceDto {
  id: string
  type: InvoiceType
  contactId: string
  totalAmount: number
  currencyId: string
  exchangeRate: number
  invoiceDateUtc: string
  lines: {
    id: string
    description: string
    accountId: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }[]
}

export interface CreateInvoiceRequest {
  type: InvoiceType
  contactId: string
  currencyId: string
  exchangeRate: number
  lines: InvoiceLineDto[]
  invoiceDate: string
}

export interface VoucherAllocationDto {
  invoiceId: string
  allocatedAmount: number
}

export interface VoucherDto {
  id: string
  type: VoucherType
  treasuryAccountId: string
  contactId: string | null
  totalAmount: number
  currencyId: string
  exchangeRate: number
  voucherDateUtc: string
  allocations: {
    id: string
    invoiceId: string
    allocatedAmount: number
  }[]
}

export interface CreateVoucherRequest {
  type: VoucherType
  treasuryAccountId: string
  contactId?: string | null
  currencyId: string
  exchangeRate: number
  totalAmount: number
  voucherDate: string
  allocations: VoucherAllocationDto[]
}

export interface JournalEntryLineDto {
  id: string
  accountId: string
  account?: AccountDto
  debit: number
  credit: number
  currencyId: string
  currency?: CurrencyDto
  exchangeRate: number
  baseDebit: number
  baseCredit: number
}

export interface JournalEntryDto {
  id: string
  entryDateUtc: string
  referenceType: string
  referenceId: string | null
  description: string
  lines: JournalEntryLineDto[]
  createdAtUtc: string
}
