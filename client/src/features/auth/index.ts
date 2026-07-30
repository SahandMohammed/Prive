// Public surface for the auth feature.
// Other features/app code MUST import from here — never from deep internal paths.

export { useLogin } from './hooks/useLogin'
export { useLogout } from './hooks/useLogout'
export { useCurrentUser } from './hooks/useCurrentUser'
export { useAuthSessionStore } from './stores/auth-session.store'
export { LoginForm } from './components/LoginForm'
export { ChangePasswordDialog } from './components/ChangePasswordDialog'
export { loginSchema, changePasswordSchema } from './schemas/auth.schemas'
export type { LoginFormValues, ChangePasswordFormValues } from './schemas/auth.schemas'
export type { LoginRequest, LoginResponse, MeResponse } from './types/auth.types'
