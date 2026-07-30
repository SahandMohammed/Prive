import type { ApiError } from './apiResponse'

export class ApiRequestError extends Error {
  code: string
  details?: ApiError['details']
  traceId?: string

  constructor(error: ApiError) {
    super(error.message)
    this.name = 'ApiRequestError'
    this.code = error.code
    this.details = error.details
    this.traceId = error.traceId
  }
}
