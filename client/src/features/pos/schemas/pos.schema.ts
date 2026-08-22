import { z } from 'zod'

export const posCheckoutSchema = z.object({
  customerId: z.string(),
  customerSearch: z.string().max(200),
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

export type PosCheckoutValues = z.infer<typeof posCheckoutSchema>
