import { z } from 'zod'
import { PosPaymentMode, PosRefundReason } from '../types/pos.types'

export const posCheckoutSchema = z.object({
  paymentMode: z.union([
    z.literal(PosPaymentMode.Paid),
    z.literal(PosPaymentMode.Partial),
    z.literal(PosPaymentMode.Credit),
  ]),
  collectionAmounts: z.record(z.string().uuid(), z.number().min(0, 'Received amount cannot be negative')),
}).superRefine((value, context) => {
  if ((value.paymentMode === PosPaymentMode.Paid || value.paymentMode === PosPaymentMode.Partial)
    && !Object.values(value.collectionAmounts).some((amount) => amount > 0)) {
    context.addIssue({
      code: 'custom',
      path: ['collectionAmounts'],
      message: 'Enter an amount received',
    })
  }
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
  refundPayouts: z.array(z.object({
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
export type PosRefundValues = z.infer<typeof posRefundSchema>
