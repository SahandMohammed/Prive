import { z } from 'zod'

export const createCurrencySchema = z.object({
  code: z.string().min(1, 'Code is required').max(10),
  name: z.string().min(1, 'Name is required').max(50),
  symbol: z.string().max(10).optional().default(''),
  exchangeRate: z.coerce.number().min(0.000001, 'Exchange rate must be positive'),
  isBaseCurrency: z.boolean().default(false),
})

export const createMoneyBoxSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  currencyId: z.string().min(1, 'Currency is required'),
})

export const createAccountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  type: z.coerce.number().int().min(1).max(5),
  parentAccountId: z.string().optional(),
  currencyId: z.string().optional(),
})

export const createInvoiceSchema = z.object({
  type: z.coerce.number().int().min(1).max(3),
  accountId: z.string().min(1, 'Account is required'),
  title: z.string().min(1, 'Title is required').max(200),
  totalAmount: z.coerce.number().min(0.01, 'Amount must be positive'),
  currencyId: z.string().min(1, 'Currency is required'),
  dueDateUtc: z.string().optional(),
})

export const payInvoiceSchema = z.object({
  invoiceId: z.string().min(1, 'Invoice is required'),
  moneyBoxId: z.string().min(1, 'Money box is required'),
  amount: z.coerce.number().min(0.01, 'Amount must be positive'),
  description: z.string().max(500).optional().default(''),
})
