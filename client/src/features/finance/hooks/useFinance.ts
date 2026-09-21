import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '../api/finance.api'
import type {
  CustomerReceiptInput,
  SetDollarRateInput,
  ExchangeRateInput,
  MoneyAccountAccessInput,
  MoneyAccountInput,
  MoneyTransferInput,
  OpeningBalanceInput,
  PageFilters,
  SupplierPaymentInput,
} from '../types/finance.types'

export const FINANCE_KEY = ['finance'] as const
const refresh = (client: ReturnType<typeof useQueryClient>) =>
  client.invalidateQueries({ queryKey: FINANCE_KEY })
export function useMoneyAccounts(filters: PageFilters, management = true) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'money-accounts', management, filters],
    queryFn: () => financeApi.moneyAccounts(filters, management),
  })
}
export function useMoneyAccount(id?: string) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'money-account', id],
    queryFn: () => financeApi.moneyAccount(id!),
    enabled: Boolean(id),
  })
}
export function useSaveMoneyAccount(id?: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: MoneyAccountInput) =>
      id ? financeApi.updateMoneyAccount(id, body) : financeApi.createMoneyAccount(body),
    onSuccess: () => refresh(client),
  })
}
export function useDeleteMoneyAccount() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => financeApi.deleteMoneyAccount(id),
    onSuccess: () => {
      refresh(client)
      client.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}
export function useMoneyAccountAccess(id?: string) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'access', id],
    queryFn: () => financeApi.moneyAccountAccess(id!),
    enabled: Boolean(id),
  })
}
export function useReplaceMoneyAccountAccess(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (assignments: MoneyAccountAccessInput[]) =>
      financeApi.replaceMoneyAccountAccess(id, assignments),
    onSuccess: () => refresh(client),
  })
}
export function useOpeningBalance(id: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: OpeningBalanceInput) => financeApi.openingBalance(id, body),
    onSuccess: () => {
      refresh(client)
      client.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}
export function useMoneyLedger(filters: PageFilters) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'ledger', filters],
    queryFn: () => financeApi.ledger(filters),
  })
}
export function useExchangeRates(filters: PageFilters) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'exchange-rates', filters],
    queryFn: () => financeApi.exchangeRates(filters),
  })
}
export function useEffectiveExchangeRate(currencyId?: string, date?: string, enabled = true) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'exchange-rate', currencyId, date],
    queryFn: () => financeApi.effectiveExchangeRate(currencyId!, date!),
    enabled: enabled && Boolean(currencyId && date),
  })
}
export function useCurrentDollarRate() {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'dollar-rate'],
    queryFn: financeApi.currentDollarRate,
  })
}
export function useSetDollarRate() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (body: SetDollarRateInput) => financeApi.setDollarRate(body),
    onSuccess: () => {
      refresh(client)
      client.invalidateQueries({ queryKey: ['pos', 'setup'] })
    },
  })
}
export function useExchangeRateActions() {
  const client = useQueryClient()
  const done = () => {
    refresh(client)
    client.invalidateQueries({ queryKey: ['pos', 'setup'] })
  }
  return {
    create: useMutation({
      mutationFn: (body: ExchangeRateInput) => financeApi.createExchangeRate(body),
      onSuccess: done,
    }),
    deactivate: useMutation({
      mutationFn: financeApi.deactivateExchangeRate,
      onSuccess: done,
    }),
  }
}
export function useMoneyTransfers(filters: PageFilters) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'transfers', filters],
    queryFn: () => financeApi.transfers(filters),
  })
}
export function useMoneyTransfer(id?: string) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'transfer', id],
    queryFn: () => financeApi.transfer(id!),
    enabled: Boolean(id),
  })
}
export function useTransferActions() {
  const client = useQueryClient()
  const done = () => {
    refresh(client)
    client.invalidateQueries({ queryKey: ['accounting'] })
  }
  return {
    create: useMutation({
      mutationFn: (body: MoneyTransferInput) => financeApi.createTransfer(body),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: MoneyTransferInput }) =>
        financeApi.updateTransfer(id, body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: financeApi.deleteTransfer, onSuccess: done }),
    post: useMutation({ mutationFn: financeApi.postTransfer, onSuccess: done }),
  }
}
export function useSupplierPayments(filters: PageFilters) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'supplier-payments', filters],
    queryFn: () => financeApi.supplierPayments(filters),
  })
}
export function useFinanceSuppliers() {
  return useQuery({ queryKey: [...FINANCE_KEY, 'suppliers'], queryFn: financeApi.suppliers })
}
export function useSupplierPayment(id?: string) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'supplier-payment', id],
    queryFn: () => financeApi.supplierPayment(id!),
    enabled: Boolean(id),
  })
}
export function useOutstandingInvoices(supplierId?: string, currencyId?: string) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'outstanding', supplierId, currencyId],
    queryFn: () => financeApi.outstandingInvoices(supplierId!, currencyId),
    enabled: Boolean(supplierId && currencyId),
  })
}
export function useSupplierPaymentActions() {
  const client = useQueryClient()
  const done = () => {
    refresh(client)
    client.invalidateQueries({ queryKey: ['accounting'] })
  }
  return {
    create: useMutation({
      mutationFn: (body: SupplierPaymentInput) => financeApi.createSupplierPayment(body),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: SupplierPaymentInput }) =>
        financeApi.updateSupplierPayment(id, body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: financeApi.deleteSupplierPayment, onSuccess: done }),
    post: useMutation({ mutationFn: financeApi.postSupplierPayment, onSuccess: done }),
  }
}
export function useCustomerReceipts(filters: PageFilters) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'customer-receipts', filters],
    queryFn: () => financeApi.customerReceipts(filters),
  })
}
export function useFinanceCustomers() {
  return useQuery({ queryKey: [...FINANCE_KEY, 'customers'], queryFn: financeApi.customers })
}
export function useCustomerReceipt(id?: string) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'customer-receipt', id],
    queryFn: () => financeApi.customerReceipt(id!),
    enabled: Boolean(id),
  })
}
export function useOutstandingSalesInvoices(customerId?: string, currencyId?: string) {
  return useQuery({
    queryKey: [...FINANCE_KEY, 'outstanding-sales', customerId, currencyId],
    queryFn: () => financeApi.outstandingSalesInvoices(customerId!, currencyId),
    enabled: Boolean(customerId && currencyId),
  })
}
export function useCustomerReceiptActions() {
  const client = useQueryClient()
  const done = () => {
    refresh(client)
    client.invalidateQueries({ queryKey: ['accounting'] })
    client.invalidateQueries({ queryKey: ['sales'] })
  }
  return {
    create: useMutation({
      mutationFn: (body: CustomerReceiptInput) => financeApi.createCustomerReceipt(body),
      onSuccess: done,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: string; body: CustomerReceiptInput }) =>
        financeApi.updateCustomerReceipt(id, body),
      onSuccess: done,
    }),
    remove: useMutation({ mutationFn: financeApi.deleteCustomerReceipt, onSuccess: done }),
    post: useMutation({ mutationFn: financeApi.postCustomerReceipt, onSuccess: done }),
  }
}
