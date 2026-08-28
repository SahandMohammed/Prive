export const ExpenseDocumentStatus = {
  Draft: 0,
  Posted: 1,
} as const
export type ExpenseDocumentStatus = (typeof ExpenseDocumentStatus)[keyof typeof ExpenseDocumentStatus]

export interface ExpenseCategory {
  id: string
  code: string
  name: string
  accountingAccountId: string
  accountingAccountCode: string
  accountingAccountName: string
  isActive: boolean
  description: string | null
  createdAtUtc: string
  updatedAtUtc: string
}

export interface ExpenseCategoryOption {
  id: string
  code: string
  name: string
  accountingAccountId: string
  accountingAccountCode: string
  accountingAccountName: string
}

export interface ExpenseCategoryInput {
  code: string
  name: string
  accountingAccountId: string
  isActive: boolean
  description?: string | null
}

export interface ExpenseCategoryFilters {
  page: number
  pageSize: number
  search?: string
  isActive?: boolean
}

export interface ExpenseLineInput {
  expenseCategoryId: string
  description?: string | null
  amount: number
}

export interface ExpenseDraftInput {
  branchId: string
  expenseDate: string
  moneyAccountId: string
  exchangeRate?: number | null
  contactId?: string | null
  payeeName?: string | null
  reference?: string | null
  notes?: string | null
  lines: ExpenseLineInput[]
}

export interface ExpenseLine {
  id: string
  expenseCategoryId: string
  expenseCategoryCode: string
  expenseCategoryName: string
  description: string | null
  amount: number
  baseAmount: number
  expenseAccountingAccountId: string | null
  expenseAccountingAccountCode: string | null
  expenseAccountingAccountName: string | null
}

export interface Expense {
  id: string
  documentNumber: string
  status: ExpenseDocumentStatus
  expenseDate: string
  branchId: string
  branchName: string
  moneyAccountId: string
  moneyAccountCode: string
  moneyAccountName: string
  currencyId: string
  currencyCode: string
  baseCurrencyId: string
  baseCurrencyCode: string
  exchangeRate: number
  contactId: string | null
  contactName: string | null
  payeeName: string | null
  reference: string | null
  notes: string | null
  totalAmount: number
  baseTotalAmount: number
  createdByUserId: string
  createdByUsername: string
  createdAtUtc: string
  updatedAtUtc: string
  postedAtUtc: string | null
  postedByUserId: string | null
  postedByUsername: string | null
  journalEntryId: string | null
  moneyLedgerEntryId: string | null
  lines: ExpenseLine[]
}

export interface ExpenseSummary {
  id: string
  documentNumber: string
  status: ExpenseDocumentStatus
  expenseDate: string
  branchId: string
  branchName: string
  moneyAccountId: string
  moneyAccountCode: string
  moneyAccountName: string
  currencyId: string
  currencyCode: string
  exchangeRate: number
  contactId: string | null
  contactName: string | null
  payeeName: string | null
  reference: string | null
  totalAmount: number
  baseTotalAmount: number
  createdByUsername: string
  createdAtUtc: string
  postedAtUtc: string | null
}

export interface ExpenseFilters {
  page: number
  pageSize: number
  search?: string
  dateFrom?: string
  dateTo?: string
  status?: ExpenseDocumentStatus
  branchId?: string
  moneyAccountId?: string
  expenseCategoryId?: string
  contactId?: string
}

export interface ExpenseSummaryTotals {
  totalExpenses: number
  baseTotalExpenses: number
  count: number
}
