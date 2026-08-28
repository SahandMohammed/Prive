import { apiClient } from '@/lib/apiClient'
import type {
  Expense,
  ExpenseCategory,
  ExpenseCategoryFilters,
  ExpenseCategoryInput,
  ExpenseCategoryOption,
  ExpenseDraftInput,
  ExpenseFilters,
  ExpenseSummary,
  ExpenseSummaryTotals,
} from '../types/expenses.types'

function queryParams(params: Record<string, unknown>) {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value))
    }
  })
  const str = query.toString()
  return str ? `?${str}` : ''
}

export const expensesApi = {
  // Categories
  listCategories: (filters: ExpenseCategoryFilters) =>
    apiClient.getPaginated<ExpenseCategory>(`/expenses/categories${queryParams(filters as unknown as Record<string, unknown>)}`),
  getCategoryOptions: () => apiClient.get<ExpenseCategoryOption[]>('/expenses/categories/options'),
  getCategoryById: (id: string) => apiClient.get<ExpenseCategory>(`/expenses/categories/${id}`),
  createCategory: (body: ExpenseCategoryInput) => apiClient.post<ExpenseCategory>('/expenses/categories', body),
  updateCategory: (id: string, body: ExpenseCategoryInput) => apiClient.put<ExpenseCategory>(`/expenses/categories/${id}`, body),
  deleteCategory: (id: string) => apiClient.delete<void>(`/expenses/categories/${id}`),

  // Expense Documents
  list: (filters: ExpenseFilters) =>
    apiClient.getPaginated<ExpenseSummary>(`/expenses${queryParams(filters as unknown as Record<string, unknown>)}`),
  getSummary: (filters: ExpenseFilters) =>
    apiClient.get<ExpenseSummaryTotals>(`/expenses/summary${queryParams(filters as unknown as Record<string, unknown>)}`),
  getById: (id: string) => apiClient.get<Expense>(`/expenses/${id}`),
  create: (body: ExpenseDraftInput) => apiClient.post<Expense>('/expenses', body),
  update: (id: string, body: ExpenseDraftInput) => apiClient.put<Expense>(`/expenses/${id}`, body),
  delete: (id: string) => apiClient.delete<void>(`/expenses/${id}`),
  post: (id: string) => apiClient.post<Expense>(`/expenses/${id}/post`),
}
