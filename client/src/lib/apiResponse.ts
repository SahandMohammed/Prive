// Mirrors backend Infrastructure/Http/ApiResponse.cs — keep in sync by hand.

export interface ApiFieldError {
  field: string
  message: string
}

export interface ApiError {
  code: string
  message: string
  details?: ApiFieldError[]
  traceId?: string
}

export interface ApiSuccessEnvelope<T> {
  success: true
  data: T
}

export interface ApiErrorEnvelope {
  success: false
  error: ApiError
}

export type ApiEnvelope<T> = ApiSuccessEnvelope<T> | ApiErrorEnvelope
