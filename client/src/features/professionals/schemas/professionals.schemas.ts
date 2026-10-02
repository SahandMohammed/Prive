import { z } from 'zod'

export const professionalSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  phoneNumber: z.string().trim().max(50),
  email: z.string().trim().email('Enter a valid email address').max(254).or(z.literal('')),
  notes: z.string().trim().max(2000),
  branchIds: z.array(z.string().uuid()),
  linkedUserId: z.string().uuid().or(z.literal('')),
  isActive: z.boolean(),
})

export type ProfessionalFormValues = z.infer<typeof professionalSchema>
