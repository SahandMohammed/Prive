import { z } from 'zod'

export const posCheckoutSchema = z.object({
  tenders: z
    .array(
      z.object({
        moneyAccountId: z.string().uuid('Select a Money Account'),
        amount: z.number().positive('Enter the amount received'),
      })
    )
    .min(1, 'Add at least one tender'),
  changeMoneyAccountId: z.string(),
  changeAmount: z.number().min(0, 'Change cannot be negative'),
})

export const posOpenSessionSchema = z.object({
  registerId: z.string().uuid('Select a POS Register'),
  openingCounts: z.array(
    z.object({
      currencyId: z.string().uuid(),
      amount: z.number().min(0, 'Opening cash cannot be negative'),
    })
  ),
  notes: z.string().max(500, 'Opening notes cannot exceed 500 characters'),
})

export const posCloseSessionSchema = z.object({
  closingCounts: z.array(
    z.object({
      currencyId: z.string().uuid(),
      countedAmount: z.number().min(0, 'Counted cash cannot be negative'),
    })
  ),
  notes: z.string().max(500, 'Closing notes cannot exceed 500 characters'),
})

export const posRegisterSchema = z.object({
  code: z.string().trim().min(1, 'Register code is required').max(32, 'Register code cannot exceed 32 characters'),
  name: z.string().trim().min(1, 'Register name is required').max(120, 'Register name cannot exceed 120 characters'),
})

export type PosCheckoutValues = z.infer<typeof posCheckoutSchema>
export type PosOpenSessionValues = z.infer<typeof posOpenSessionSchema>
export type PosCloseSessionValues = z.infer<typeof posCloseSessionSchema>
export type PosRegisterValues = z.infer<typeof posRegisterSchema>
