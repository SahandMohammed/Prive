// Public surface for the users feature.
// Other features/app code MUST import from here — never from deep internal paths.

export { usersApi } from './api/users.api'
export { useUsers } from './hooks/useUsers'
export { useCreateUser } from './hooks/useCreateUser'
export { useResetPassword } from './hooks/useResetPassword'
export { UserTable } from './components/UserTable'
export { CreateUserDialog } from './components/CreateUserDialog'
export { createUserSchema, resetPasswordSchema } from './schemas/users.schemas'
export type { CreateUserFormValues, ResetPasswordFormValues } from './schemas/users.schemas'
export type { User, CreateUserRequest, UserRole } from './types/users.types'

export { UsersPage } from './pages/UsersPage'
