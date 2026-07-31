import { z } from 'zod'

export const createUserSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['SuperAdmin', 'Owner', 'Manager', 'Professional', 'Cashier', 'Unassigned'], { message: 'Please select a valid role' }),
  mustChangePassword: z.boolean().optional(),
})

export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>
