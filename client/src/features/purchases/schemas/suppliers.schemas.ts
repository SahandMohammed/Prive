import { z } from 'zod'

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional().or(z.literal(''))

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(200),
  phoneNumber: optionalText(30),
  email: z.string().trim().email('Enter a valid email address').max(320).optional().or(z.literal('')),
  address: optionalText(500),
  description: optionalText(2_000),
  openingBalance: z.number().min(0, 'Opening balance cannot be negative'),
})

export type CreateSupplierFormValues = z.infer<typeof createSupplierSchema>
