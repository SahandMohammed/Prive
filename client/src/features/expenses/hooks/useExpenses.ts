import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expensesApi } from '../api/expenses.api'
import type {
  ExpenseCategoryFilters,
  ExpenseCategoryInput,
  ExpenseDraftInput,
  ExpenseFilters,
} from '../types/expenses.types'

export const EXPENSE_CATEGORIES_QUERY_KEY = ['expenses', 'categories'] as const
export const EXPENSES_QUERY_KEY = ['expenses', 'documents'] as const
export const EXPENSES_SUMMARY_QUERY_KEY = ['expenses', 'summary'] as const

// ---------------------------------------------------------------------------
// Categories Hooks
// ---------------------------------------------------------------------------

export function useExpenseCategories(filters: ExpenseCategoryFilters) {
  return useQuery({
    queryKey: [...EXPENSE_CATEGORIES_QUERY_KEY, filters],
    queryFn: () => expensesApi.listCategories(filters),
  })
}

export function useExpenseCategoryOptions() {
  return useQuery({
    queryKey: [...EXPENSE_CATEGORIES_QUERY_KEY, 'options'],
    queryFn: () => expensesApi.getCategoryOptions(),
  })
}

export function useExpenseCategory(id?: string) {
  return useQuery({
    queryKey: [...EXPENSE_CATEGORIES_QUERY_KEY, id],
    queryFn: () => expensesApi.getCategoryById(id!),
    enabled: Boolean(id),
  })
}

export function useSaveExpenseCategory(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ExpenseCategoryInput) =>
      id ? expensesApi.updateCategory(id, body) : expensesApi.createCategory(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_QUERY_KEY })
    },
  })
}

export function useDeleteExpenseCategory() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesApi.deleteCategory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_CATEGORIES_QUERY_KEY })
    },
  })
}

// ---------------------------------------------------------------------------
// Expense Documents Hooks
// ---------------------------------------------------------------------------

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, filters],
    queryFn: () => expensesApi.list(filters),
  })
}

export function useExpensesSummary(filters: ExpenseFilters) {
  return useQuery({
    queryKey: [...EXPENSES_SUMMARY_QUERY_KEY, filters],
    queryFn: () => expensesApi.getSummary(filters),
  })
}

export function useExpense(id?: string) {
  return useQuery({
    queryKey: [...EXPENSES_QUERY_KEY, id],
    queryFn: () => expensesApi.getById(id!),
    enabled: Boolean(id),
  })
}

export function useSaveExpense(id?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ExpenseDraftInput) =>
      id ? expensesApi.update(id, body) : expensesApi.create(body),
    onSuccess: (expense) => {
      queryClient.setQueryData([...EXPENSES_QUERY_KEY, expense.id], expense)
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: EXPENSES_SUMMARY_QUERY_KEY })
    },
  })
}

export function usePostExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesApi.post(id),
    onSuccess: (expense) => {
      queryClient.setQueryData([...EXPENSES_QUERY_KEY, expense.id], expense)
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: EXPENSES_SUMMARY_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['finance'] })
      queryClient.invalidateQueries({ queryKey: ['accounting'] })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: EXPENSES_SUMMARY_QUERY_KEY })
    },
  })
}
