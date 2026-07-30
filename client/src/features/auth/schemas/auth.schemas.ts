import { z } from 'zod'

export const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
})

// Infer the type from the schema — never hand-write this separately.
// Structurally identical to LoginRequest in auth.types.ts (which mirrors the
// backend DTO); kept as two files because they answer different questions —
// auth.types.ts is "what the API expects," auth.schemas.ts is "what's valid
// to submit," and the two can diverge slightly (e.g. client-side password
// confirmation has no backend equivalent).
export type LoginFormValues = z.infer<typeof loginSchema>

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your new password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  })

export type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>
