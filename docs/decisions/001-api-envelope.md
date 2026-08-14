# ADR-001 — Standard API Envelope

**Status:** Accepted

## Decision

All API responses use the `ApiResponse<T>` envelope. The shape is:

- **Success:** `{ "success": true, "data": T, "meta"?: PaginationMetadata }`
- **Error:** `{ "success": false, "error": { "code": string, "message": string, "traceId"?: string, "details"?: ApiFieldError[] } }`

`traceId` lives inside the `error` object, not at the envelope level. `details` is only present for `VALIDATION_FAILED` responses.

Services throw typed `ApiException` subclasses with `ErrorCodes` constants. The `GlobalExceptionHandler` (`IExceptionHandler`) maps them to the correct HTTP status and envelope. Controllers never construct error responses manually.

The frontend `apiClient` unwraps successful data and converts failed envelopes to `ApiRequestError`.

## Consequences

- Controllers and services do not invent local response/error shapes.
- Feature UI handles `ApiRequestError` through TanStack Query state.
- Any schema change must be made in backend, frontend envelope types, API client, and `error-handling.md` together.
