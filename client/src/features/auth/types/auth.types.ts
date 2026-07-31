// Mirrors backend Modules/Auth/DTOs/AuthDtos.cs — keep in sync by hand.
// Backend JSON uses camelCase (default ASP.NET Core serialization).

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  // ISO-8601 UTC string — e.g. "2026-07-31T04:30:00Z"
  accessTokenExpiresAtUtc: string
  mustChangePassword: boolean
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

