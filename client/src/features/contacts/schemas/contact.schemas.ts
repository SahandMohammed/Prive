import { z } from 'zod'

const optionalText = (maxLength: number) => z.string().trim().max(maxLength)

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  kind: z.union([z.literal(0), z.literal(1)]),
  isCustomer: z.boolean(),
  isSupplier: z.boolean(),
  primaryPhoneNumber: optionalText(50),
  secondaryPhoneNumber: optionalText(50),
  email: z.string().trim().email('Enter a valid email address').max(254).or(z.literal('')),
  address: optionalText(500),
  city: optionalText(100),
  region: optionalText(100),
  country: optionalText(100),
  notes: optionalText(2000),
  isActive: z.boolean(),
}).refine((value) => value.isCustomer || value.isSupplier, {
  message: 'Select at least one contact role',
  path: ['isCustomer'],
})

export type ContactFormValues = z.infer<typeof contactSchema>
