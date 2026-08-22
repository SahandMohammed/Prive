import { apiClient } from '@/lib/apiClient'
import type { ExchangeRate, ExchangeRateInput, FinanceSupplier, MoneyAccount, MoneyAccountAccess, MoneyAccountAccessInput, MoneyAccountInput, MoneyLedgerEntry, MoneyTransfer, MoneyTransferInput, OpeningBalanceInput, OutstandingPurchaseInvoice, PageFilters, SupplierPayment, SupplierPaymentInput } from '../types/finance.types'

function qs(filters: Record<string, string | number | boolean | undefined>) { const query = new URLSearchParams(); Object.entries(filters).forEach(([key, value]) => { if (value !== undefined && value !== '') query.set(key, String(value)) }); return query.toString() }

export const financeApi = {
  moneyAccounts: (filters: PageFilters, management = false) => apiClient.getPaginated<MoneyAccount>(`/finance/money-accounts${management ? '/management' : ''}?${qs(filters)}`),
  moneyAccount: (id: string) => apiClient.get<MoneyAccount>(`/finance/money-accounts/${id}`),
  createMoneyAccount: (body: MoneyAccountInput) => apiClient.post<MoneyAccount>('/finance/money-accounts', body),
  updateMoneyAccount: (id: string, body: MoneyAccountInput) => apiClient.put<MoneyAccount>(`/finance/money-accounts/${id}`, body),
  moneyAccountAccess: (id: string) => apiClient.get<MoneyAccountAccess[]>(`/finance/money-accounts/${id}/access`),
  replaceMoneyAccountAccess: (id: string, assignments: MoneyAccountAccessInput[]) => apiClient.put<MoneyAccountAccess[]>(`/finance/money-accounts/${id}/access`, { assignments }),
  openingBalance: (id: string, body: OpeningBalanceInput) => apiClient.post<MoneyLedgerEntry>(`/finance/money-accounts/${id}/opening-balance`, body),
  ledger: (filters: PageFilters) => apiClient.getPaginated<MoneyLedgerEntry>(`/finance/money-ledger?${qs(filters)}`),
  exchangeRates: (filters: PageFilters) => apiClient.getPaginated<ExchangeRate>(`/finance/exchange-rates?${qs(filters)}`),
  createExchangeRate: (body: ExchangeRateInput) => apiClient.post<ExchangeRate>('/finance/exchange-rates', body),
  deactivateExchangeRate: (id: string) => apiClient.put<ExchangeRate>(`/finance/exchange-rates/${id}/deactivate`),
  transfers: (filters: PageFilters) => apiClient.getPaginated<MoneyTransfer>(`/finance/transfers?${qs(filters)}`),
  transfer: (id: string) => apiClient.get<MoneyTransfer>(`/finance/transfers/${id}`),
  createTransfer: (body: MoneyTransferInput) => apiClient.post<MoneyTransfer>('/finance/transfers', body),
  updateTransfer: (id: string, body: MoneyTransferInput) => apiClient.put<MoneyTransfer>(`/finance/transfers/${id}`, body),
  deleteTransfer: (id: string) => apiClient.delete<void>(`/finance/transfers/${id}`),
  postTransfer: (id: string) => apiClient.post<MoneyTransfer>(`/finance/transfers/${id}/post`),
  supplierPayments: (filters: PageFilters) => apiClient.getPaginated<SupplierPayment>(`/finance/supplier-payments?${qs(filters)}`),
  suppliers: () => apiClient.get<FinanceSupplier[]>('/finance/suppliers'),
  supplierPayment: (id: string) => apiClient.get<SupplierPayment>(`/finance/supplier-payments/${id}`),
  outstandingInvoices: (supplierId: string, currencyId?: string) => apiClient.get<OutstandingPurchaseInvoice[]>(`/finance/supplier-payments/outstanding-invoices?${qs({ supplierId, currencyId })}`),
  createSupplierPayment: (body: SupplierPaymentInput) => apiClient.post<SupplierPayment>('/finance/supplier-payments', body),
  updateSupplierPayment: (id: string, body: SupplierPaymentInput) => apiClient.put<SupplierPayment>(`/finance/supplier-payments/${id}`, body),
  deleteSupplierPayment: (id: string) => apiClient.delete<void>(`/finance/supplier-payments/${id}`),
  postSupplierPayment: (id: string) => apiClient.post<SupplierPayment>(`/finance/supplier-payments/${id}/post`),
}
