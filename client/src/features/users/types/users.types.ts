// Mirrors backend Modules/User/UserDtos.cs — keep in sync by hand.

export type UserRole = 'SuperAdmin' | 'Owner' | 'Manager' | 'Professional' | 'Cashier' | 'Unassigned'

export interface User {
  id: string
  username: string
  role: UserRole
  linkedProfessionalId: string | null
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAtUtc: string | null
}

// Returned by GET /users/me — the authenticated user's own profile.
// Endpoint not yet implemented on the backend; useCurrentUser() is disabled
// until it is. See features/auth/hooks/useCurrentUser.ts.
export type MeResponse = Pick<User, 'id' | 'username' | 'role'>

export interface CreateUserRequest {
  username: string
  password: string
  role: UserRole
  linkedProfessionalId?: string
  mustChangePassword?: boolean
}

export interface UpdateUserRequest {
  username?: string
  role: UserRole
  linkedProfessionalId: string | null
  isActive: boolean
}

export interface ResetPasswordRequest {
  newPassword: string
  mustChangePassword: boolean
}
