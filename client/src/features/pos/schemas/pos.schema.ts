import { z } from 'zod'
import { PosPaymentMode } from '../types/pos.types'

const tenderSchema = z.object({
  moneyAccountId: z.string().uuid('Select a Money Account'),
  amount: z.number().positive('Enter the amount received'),
})

export const posCheckoutSchema = z.object({
  paymentMode: z.union([
    z.literal(PosPaymentMode.Paid),
    z.literal(PosPaymentMode.Partial),
    z.literal(PosPaymentMode.Credit),
  ]),
  tenders: z.array(tenderSchema),
  changeMoneyAccountId: z.string(),
  changeAmount: z.number().min(0, 'Change cannot be negative'),
}).superRefine((value, context) => {
  if (value.paymentMode !== PosPaymentMode.Credit && value.tenders.length === 0) {
    context.addIssue({
      code: 'custom',
      path: ['tenders'],
      message: value.paymentMode === PosPaymentMode.Paid
        ? 'Add at least one tender to fully pay the sale'
        : 'Add at least one tender for a partial payment',
    })
  }

  if (value.paymentMode === PosPaymentMode.Credit && value.tenders.length > 0) {
    context.addIssue({
      code: 'custom',
      path: ['tenders'],
      message: 'Credit sales cannot include a tender. Choose Partial if the customer pays something now.',
    })
  }

  if (value.paymentMode !== PosPaymentMode.Paid
    && (value.changeMoneyAccountId !== '' || value.changeAmount > 0)) {
    context.addIssue({
      code: 'custom',
      path: ['changeAmount'],
      message: 'Change is only valid for a fully paid sale.',
    })
  }
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
