import { apiClient } from '@/lib/apiClient'
import type {
  AccountDto,
  CreateAccountRequest,
  CreateCurrencyRequest,
  CreateInvoiceRequest,
  CurrencyDto,
  InvoiceDto,
  ContactDto,
  CreateContactRequest,
  VoucherDto,
  CreateVoucherRequest,
  JournalEntryDto,
  InvoiceType,
  VoucherType,
  ContactType,
} from '../types/finance.types'

export const financeApi = {
  // Currencies
  getCurrencies: () => apiClient.get<CurrencyDto[]>('/finance/currencies'),
  createCurrency: (body: CreateCurrencyRequest) => apiClient.post<CurrencyDto>('/finance/currencies', body),

  // Chart of Accounts
  getAccounts: () => apiClient.get<AccountDto[]>('/finance/accounts'),
  createAccount: (body: CreateAccountRequest) => apiClient.post<AccountDto>('/finance/accounts', body),
  seedAccounts: () => apiClient.post<string>('/finance/accounts/seed', {}),

  // Contacts
  getContacts: (type?: ContactType) => {
    const url = type ? `/finance/contacts?type=${type}` : '/finance/contacts'
    return apiClient.get<ContactDto[]>(url)
  },
  createContact: (body: CreateContactRequest) => apiClient.post<ContactDto>('/finance/contacts', body),

  // Invoices
  getInvoices: (
    type?: InvoiceType,
    search?: string,
    startDate?: string,
    endDate?: string,
    page = 1,
    pageSize = 10
  ) => {
    let url = `/finance/invoices?page=${page}&pageSize=${pageSize}`
    if (type !== undefined) url += `&type=${type}`
    if (search) url += `&search=${encodeURIComponent(search)}`
    if (startDate) url += `&startDate=${startDate}`
    if (endDate) url += `&endDate=${endDate}`
    return apiClient.getPaginated<InvoiceDto>(url)
  },
  createInvoice: (body: CreateInvoiceRequest) => apiClient.post<InvoiceDto>('/finance/invoices', body),

  // Vouchers
  getVouchers: (type?: VoucherType) => {
    const url = type ? `/finance/vouchers?type=${type}` : '/finance/vouchers'
    return apiClient.get<VoucherDto[]>(url)
  },
  createVoucher: (body: CreateVoucherRequest) => apiClient.post<VoucherDto>('/finance/vouchers', body),

  // General Ledger
  getLedger: () => apiClient.get<JournalEntryDto[]>('/finance/ledger'),
}
