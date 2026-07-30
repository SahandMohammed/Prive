// mirrors backend user DTOs

export interface User {
  id: string
  username: string
  email: string
  role: 'Admin' | 'User'
  createdAt: string
}

export interface CreateUserRequest {
  username: string
  email: string
  role: 'Admin' | 'User'
}

export interface ResetPasswordRequest {
  newPassword: string
}
