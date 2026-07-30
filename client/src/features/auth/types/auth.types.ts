// mirrors backend auth DTOs — "what the API expects/returns"

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  mustChangePassword: boolean
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface MeResponse {
  id: string
  username: string
  email: string
  role: string
}
