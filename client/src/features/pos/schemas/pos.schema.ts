import { z } from 'zod'
import { PosPaymentMode, PosRefundReason } from '../types/pos.types'

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

export const posForceCloseSessionSchema = posCloseSessionSchema.refine(
  ({ notes }) => notes.trim().length > 0,
  { path: ['notes'], message: 'A closing reason is required for another cashier\'s session' }
)

export const posRegisterSchema = z.object({
  code: z.string().trim().min(1, 'Register code is required').max(32, 'Register code cannot exceed 32 characters'),
  name: z.string().trim().min(1, 'Register name is required').max(120, 'Register name cannot exceed 120 characters'),
})

export const posRefundSchema = z.object({
  reason: z.union([
    z.literal(PosRefundReason.WrongServiceEntered),
    z.literal(PosRefundReason.WrongProductEntered),
    z.literal(PosRefundReason.CustomerComplaint),
    z.literal(PosRefundReason.DuplicateSale),
    z.literal(PosRefundReason.ProductReturned),
    z.literal(PosRefundReason.ServiceIssue),
    z.literal(PosRefundReason.CashierMistake),
    z.literal(PosRefundReason.Other),
  ]),
  notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters'),
  lines: z.array(z.object({
    salesInvoiceLineId: z.string().uuid(),
    selected: z.boolean(),
    quantity: z.number().min(0),
    restockProduct: z.boolean(),
  })),
  refundTenders: z.array(z.object({
    moneyAccountId: z.string().uuid('Select a Money Account'),
    amount: z.number().positive('Enter a refund amount'),
  })),
}).superRefine((value, context) => {
  const selected = value.lines.filter((line) => line.selected && line.quantity > 0)
  if (selected.length === 0) {
    context.addIssue({ code: 'custom', path: ['lines'], message: 'Select at least one refundable line.' })
  }
  if (value.reason === PosRefundReason.Other && value.notes.length === 0) {
    context.addIssue({ code: 'custom', path: ['notes'], message: 'Notes are required when the reason is Other.' })
  }
})

export type PosCheckoutValues = z.infer<typeof posCheckoutSchema>
export type PosOpenSessionValues = z.infer<typeof posOpenSessionSchema>
export type PosCloseSessionValues = z.infer<typeof posCloseSessionSchema>
export type PosRegisterValues = z.infer<typeof posRegisterSchema>
export type PosRefundValues = z.infer<typeof posRefundSchema>
