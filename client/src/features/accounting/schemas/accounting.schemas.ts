import { z } from 'zod'

const positive = z.number().positive('Enter a positive amount.')

export const accountSchema = z.object({
  code: z.string().trim().min(1, 'Account code is required.').max(32),
  name: z.string().trim().min(1, 'Account name is required.').max(250),
  classification: z.number().int().min(0).max(5),
  parentAccountId: z.string().nullable(),
  isGroup: z.boolean(),
  isActive: z.boolean(),
})

export const journalLineSchema = z.object({
  accountId: z.string().uuid('Select a posting account.'),
  description: z.string().trim().max(1000).nullable(),
  currencyId: z.string().uuid('Select a currency.'),
  originalDebitAmount: z.number().min(0),
  originalCreditAmount: z.number().min(0),
  exchangeRate: positive,
}).refine((line) => (line.originalDebitAmount > 0) !== (line.originalCreditAmount > 0), 'Enter either a debit or credit amount.')

export const journalSchema = z.object({
  entryDate: z.string().min(1, 'Entry date is required.'),
  reference: z.string().trim().max(100).nullable(),
  description: z.string().trim().min(1, 'Description is required.').max(1000),
  branchId: z.string().uuid('Select an active branch.'),
  type: z.number().int().min(0).max(1),
  lines: z.array(journalLineSchema).min(2, 'A journal needs at least two lines.'),
})
