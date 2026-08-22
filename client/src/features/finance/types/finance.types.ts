export const MoneyAccountType = { Cashbox: 0, Bank: 1 } as const
export type MoneyAccountType = typeof MoneyAccountType[keyof typeof MoneyAccountType]
export const MoneyAccountAccessLevel = { View: 0, Operate: 1 } as const
export type MoneyAccountAccessLevel = typeof MoneyAccountAccessLevel[keyof typeof MoneyAccountAccessLevel]
export const FinanceDocumentStatus = { Draft: 0, Posted: 1 } as const
export type FinanceDocumentStatus = typeof FinanceDocumentStatus[keyof typeof FinanceDocumentStatus]
export const MoneyLedgerSourceType = { OpeningBalance: 0, MoneyTransfer: 1, SupplierPayment: 2, CustomerReceipt: 3, PosSale: 4 } as const
export type MoneyLedgerSourceType = typeof MoneyLedgerSourceType[keyof typeof MoneyLedgerSourceType]

export interface PageFilters { page: number; pageSize: number; [key: string]: string | number | boolean | undefined }
export interface MoneyAccount { id: string; code: string; name: string; type: MoneyAccountType; branchId: string; branchCode: string; branchName: string; currencyId: string; currencyCode: string; accountingAccountId: string; accountingAccountCode: string; accountingAccountName: string; balance: number; isActive: boolean; notes: string | null; bankName: string | null; accountNumberOrIban: string | null; currentUserAccess: MoneyAccountAccessLevel | null; createdAtUtc: string; updatedAtUtc: string }
export interface MoneyAccountInput { code: string; name: string; type: MoneyAccountType; branchId: string; currencyId: string; accountingAccountId: string; isActive: boolean; notes: string | null; bankName: string | null; accountNumberOrIban: string | null }
export interface MoneyAccountAccess { userId: string; username: string; accessLevel: MoneyAccountAccessLevel }
export interface MoneyAccountAccessInput { userId: string; accessLevel: MoneyAccountAccessLevel }
export interface OpeningBalanceInput { date: string; amount: number; exchangeRate: number | null; notes: string | null }
export interface MoneyLedgerEntry { id: string; movementDate: string; moneyAccountId: string; moneyAccountCode: string; moneyAccountName: string; branchId: string; branchName: string; currencyId: string; currencyCode: string; baseCurrencyId: string; baseCurrencyCode: string; sourceType: MoneyLedgerSourceType; sourceDocumentId: string; documentNumber: string; amountIn: number; amountOut: number; amount: number; baseAmount: number; exchangeRate: number; journalEntryId: string; performedByUserId: string; performedByUsername: string; notes: string | null; postedAtUtc: string }
export interface ExchangeRate { id: string; fromCurrencyId: string; fromCurrencyCode: string; toCurrencyId: string; toCurrencyCode: string; rate: number; effectiveAtUtc: string; isActive: boolean; createdByUserId: string; createdByUsername: string; createdAtUtc: string }
export interface ExchangeRateInput { fromCurrencyId: string; toCurrencyId: string; rate: number; effectiveAtUtc: string }
export interface MoneyTransfer { id: string; documentNumber: string; transferDate: string; sourceMoneyAccountId: string; sourceMoneyAccountCode: string; sourceMoneyAccountName: string; destinationMoneyAccountId: string; destinationMoneyAccountCode: string; destinationMoneyAccountName: string; currencyId: string; currencyCode: string; baseCurrencyId: string; baseCurrencyCode: string; amount: number; exchangeRate: number; baseAmount: number; status: FinanceDocumentStatus; notes: string | null; createdByUserId: string; createdByUsername: string; createdAtUtc: string; updatedAtUtc: string; postedAtUtc: string | null; journalEntryId: string | null }
export interface MoneyTransferInput { transferDate: string; sourceMoneyAccountId: string; destinationMoneyAccountId: string; amount: number; notes: string | null }
export interface SupplierPaymentAllocation { id: string; purchaseInvoiceId: string; purchaseInvoiceDocumentNumber: string; amount: number; baseAmount: number }
export interface SupplierPayment { id: string; documentNumber: string; supplierId: string; supplierName: string; paymentDate: string; moneyAccountId: string; moneyAccountCode: string; moneyAccountName: string; currencyId: string; currencyCode: string; baseCurrencyId: string; baseCurrencyCode: string; exchangeRate: number; totalAmount: number; baseTotalAmount: number; status: FinanceDocumentStatus; notes: string | null; createdByUserId: string; createdByUsername: string; createdAtUtc: string; updatedAtUtc: string; postedAtUtc: string | null; journalEntryId: string | null; allocations: SupplierPaymentAllocation[] }
export interface SupplierPaymentInput { supplierId: string; paymentDate: string; moneyAccountId: string; exchangeRate: number | null; totalAmount: number; notes: string | null; allocations: { purchaseInvoiceId: string; amount: number }[] }
export interface OutstandingPurchaseInvoice { id: string; documentNumber: string; invoiceDate: string; supplierId: string; supplierName: string; currencyId: string; currencyCode: string; exchangeRate: number; originalTotal: number; paidAmount: number; outstandingAmount: number }
export interface FinanceSupplier { id: string; name: string }
export interface CustomerReceiptAllocation { id: string; salesInvoiceId: string; salesInvoiceDocumentNumber: string; salesInvoiceDate: string; salesInvoiceTotal: number; amount: number; baseAmount: number }
export interface CustomerReceiptSummary { id: string; documentNumber: string; customerId: string; customerName: string; receiptDate: string; moneyAccountId: string; moneyAccountCode: string; moneyAccountName: string; branchId: string; branchName: string; currencyId: string; currencyCode: string; totalAmount: number; status: FinanceDocumentStatus; createdByUserId: string; createdByUsername: string }
export interface CustomerReceipt { id: string; documentNumber: string; customerId: string; customerName: string; receiptDate: string; moneyAccountId: string; moneyAccountCode: string; moneyAccountName: string; branchId: string; branchName: string; currencyId: string; currencyCode: string; baseCurrencyId: string; baseCurrencyCode: string; exchangeRate: number; totalAmount: number; baseTotalAmount: number; status: FinanceDocumentStatus; notes: string | null; createdByUserId: string; createdByUsername: string; createdAtUtc: string; updatedAtUtc: string; postedAtUtc: string | null; journalEntryId: string | null; moneyLedgerEntryId: string | null; allocations: CustomerReceiptAllocation[] }
export interface CustomerReceiptInput { customerId: string; receiptDate: string; moneyAccountId: string; exchangeRate: number | null; totalAmount: number; notes: string | null; allocations: { salesInvoiceId: string; amount: number }[] }
export interface OutstandingSalesInvoice { id: string; documentNumber: string; invoiceDate: string; customerId: string; customerName: string; currencyId: string; currencyCode: string; exchangeRate: number; originalTotal: number; receivedAmount: number; outstandingAmount: number }
export interface FinanceCustomer { id: string; name: string }

// Legacy Sales prototype contracts retained until the Sales module is replaced.
export const InvoiceType = { SalesInvoice: 1, SalesReturn: 2, PurchaseInvoice: 3, PurchaseReturn: 4 } as const
export type InvoiceType = typeof InvoiceType[keyof typeof InvoiceType]
export const ContactType = { Customer: 1, Vendor: 2 } as const
export type ContactType = typeof ContactType[keyof typeof ContactType]
export interface ContactDto { id: string; name: string; type: ContactType; accountId: string; isActive: boolean }
export interface InvoiceDto { id: string; type: InvoiceType; contactId: string; totalAmount: number; currencyId: string; exchangeRate: number; invoiceDateUtc: string; lines: { id: string; description: string; accountId: string; quantity: number; unitPrice: number; totalPrice: number }[] }
