import { z } from 'zod'

const requiredId = z.string().uuid('Select a value')

export const expenseCategorySchema = z.object({
  code: z.string().min(1, 'Category code is required').max(32, 'Maximum 32 characters'),
  name: z.string().min(1, 'Category name is required').max(100, 'Maximum 100 characters'),
  accountingAccountId: requiredId,
  isActive: z.boolean(),
  description: z.string().max(500, 'Maximum 500 characters').nullable().optional(),
})

export const expenseLineSchema = z.object({
  expenseCategoryId: requiredId,
  description: z.string().max(500, 'Maximum 500 characters').nullable().optional(),
  amount: z.number().positive('Amount must be greater than zero'),
})

export const expenseDraftSchema = z.object({
  branchId: requiredId,
  expenseDate: z.string().min(1, 'Expense date is required'),
  moneyAccountId: requiredId,
  exchangeRate: z.number().positive('Exchange rate must be greater than zero').nullable().optional(),
  contactId: z.string().uuid('Select a contact').nullable().optional(),
  payeeName: z.string().max(200, 'Maximum 200 characters').nullable().optional(),
  reference: z.string().max(100, 'Maximum 100 characters').nullable().optional(),
  notes: z.string().max(1000, 'Maximum 1000 characters').nullable().optional(),
  lines: z.array(expenseLineSchema).min(1, 'Add at least one expense line'),
})
