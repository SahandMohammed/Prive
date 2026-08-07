import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '../api/finance.api'
import type {
  CreateAccountRequest,
  CreateCurrencyRequest,
  CreateInvoiceRequest,
  CreateContactRequest,
  CreateVoucherRequest,
  InvoiceType,
  VoucherType,
  ContactType,
} from '../types/finance.types'

// --- Currencies ---
export function useCurrencies() {
  return useQuery({
    queryKey: ['currencies'],
    queryFn: () => financeApi.getCurrencies(),
  })
}

export function useCreateCurrency() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCurrencyRequest) => financeApi.createCurrency(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] })
    },
  })
}

// --- Accounts ---
export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => financeApi.getAccounts(),
  })
}

export function useCreateAccount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateAccountRequest) => financeApi.createAccount(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

export function useSeedAccounts() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => financeApi.seedAccounts(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}

// --- Contacts ---
export function useContacts(type?: ContactType) {
  return useQuery({
    queryKey: ['contacts', type],
    queryFn: () => financeApi.getContacts(type),
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateContactRequest) => financeApi.createContact(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] }) // Created a sub-ledger account
    },
  })
}

// --- Invoices ---
export function useInvoices(
  type?: InvoiceType,
  search?: string,
  startDate?: string,
  endDate?: string,
  page = 1,
  pageSize = 10
) {
  return useQuery({
    queryKey: ['invoices', type, search, startDate, endDate, page, pageSize],
    queryFn: () => financeApi.getInvoices(type, search, startDate, endDate, page, pageSize),
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInvoiceRequest) => financeApi.createInvoice(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
    },
  })
}

// --- Vouchers ---
export function useVouchers(type?: VoucherType) {
  return useQuery({
    queryKey: ['vouchers', type],
    queryFn: () => financeApi.getVouchers(type),
  })
}

export function useCreateVoucher() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateVoucherRequest) => financeApi.createVoucher(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vouchers'] })
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['ledger'] })
    },
  })
}

// --- Ledger ---
export function useLedger() {
  return useQuery({
    queryKey: ['ledger'],
    queryFn: () => financeApi.getLedger(),
  })
}
