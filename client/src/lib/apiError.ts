import type { ApiError } from './apiResponse'

export class ApiRequestError extends Error {
  readonly code: string
  readonly status: number
  readonly details?: ApiError['details']
  readonly traceId?: string

  constructor(error: ApiError, status: number) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.status = status
    this.details = error.details
    this.traceId = error.traceId
  }
}
