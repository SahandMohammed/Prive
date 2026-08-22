export type AccountClassification = number
export type JournalEntryStatus = number
export type JournalEntryType = number

export interface Account {
  id: string
  code: string
  name: string
  classification: AccountClassification
  parentAccountId: string | null
  isGroup: boolean
  isActive: boolean
}

export interface AccountInput {
  code: string
  name: string
  classification: AccountClassification
  parentAccountId: string | null
  isGroup: boolean
  isActive: boolean
}

export interface JournalLineInput {
  accountId: string
  description: string | null
  currencyId: string
  originalDebitAmount: number
  originalCreditAmount: number
  exchangeRate: number
}

export interface JournalLine extends JournalLineInput {
  id: string
  accountCode: string
  accountName: string
  currencyCode: string
  debitBaseAmount: number
  creditBaseAmount: number
}

export interface JournalInput {
  entryDate: string
  reference: string | null
  description: string
  branchId: string
  type: JournalEntryType
  lines: JournalLineInput[]
}

export interface JournalEntry {
  id: string
  entryDate: string
  reference: string | null
  description: string
  branchId: string
  branchCode: string
  branchName: string
  status: JournalEntryStatus
  type: JournalEntryType
  postedAtUtc: string | null
  reversalOfJournalId: string | null
  sourcePurchaseInvoiceId: string | null
  sourceSalesInvoiceId: string | null
  sourceMoneyTransferId: string | null
  sourceSupplierPaymentId: string | null
  sourceCustomerReceiptId: string | null
  totalDebitBaseAmount: number
  totalCreditBaseAmount: number
  lines: JournalLine[]
}

export interface GeneralLedgerLine {
  journalId: string
  entryDate: string
  reference: string | null
  journalDescription: string
  lineDescription: string | null
  branchId: string
  branchCode: string
  branchName: string
  currencyCode: string
  debitBaseAmount: number
  creditBaseAmount: number
  runningBalance: number
}

export interface GeneralLedger {
  accountId: string
  accountCode: string
  accountName: string
  openingBalance: number
  lines: GeneralLedgerLine[]
}

export interface TrialBalanceLine {
  accountId: string
  accountCode: string
  accountName: string
  classification: AccountClassification
  openingDebit: number
  openingCredit: number
  debitMovement: number
  creditMovement: number
  closingDebit: number
  closingCredit: number
}

export interface TrialBalance {
  fromDate: string | null
  toDate: string | null
  lines: TrialBalanceLine[]
  totalOpeningDebit: number
  totalOpeningCredit: number
  totalDebitMovement: number
  totalCreditMovement: number
  totalClosingDebit: number
  totalClosingCredit: number
}

export const accountClassificationLabels: Record<number, string> = {
  0: 'Asset', 1: 'Liability', 2: 'Equity', 3: 'Revenue', 4: 'Expense', 5: 'Contra Asset',
}

export const journalStatusLabels: Record<number, string> = {
  0: 'Draft', 1: 'Posted', 2: 'Reversed',
}
