# Error Handling and API Contract

All API responses share the same `ApiResponse` envelope. Error handling is fully centralized — services throw exceptions, the `GlobalExceptionHandler` formats them.

## Success responses

```json
// Single resource
{ "success": true, "data": { "id": "...", "username": "..." } }

// Paginated collection
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 42,
    "totalPages": 3,
    "hasPreviousPage": false,
    "hasNextPage": true
  }
}

// No-content (204) — no body
```

## Error responses

All error responses use the same shape. `traceId` is inside the `error` object.

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User with id '...' was not found.",
    "traceId": "0HN4K1F2Q8B3R:00000001"
  }
}
```

Validation errors include a `details` array:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "One or more validation errors occurred.",
    "traceId": "0HN4K1F2Q8B3R:00000002",
    "details": [
      { "field": "username", "message": "The Username field is required." },
      { "field": "password", "message": "Password must be at least 8 characters." }
    ]
  }
}
```

## Error flow

```
Service throws NotFoundException / ConflictException / etc.
  → GlobalExceptionHandler (IExceptionHandler) catches it
  → Maps exception type → HTTP status code
  → Writes ApiResponse.Fail(code, message, traceId) to response
  → Logs: 4xx at Information, 5xx at Error
```

**Never return `ApiResponse.Fail()` from controllers.** Throw the appropriate exception.

## Error sources

| Source | How it becomes an error response |
|--------|----------------------------------|
| Service business rule | Throw `NotFoundException` / `ConflictException` / `BadRequestException` / `UnauthorizedException` / `ForbiddenException` with an `ErrorCodes` constant |
| Request validation | Framework's `InvalidModelStateResponseFactory` → `VALIDATION_FAILED` |
| JWT auth failure | `JwtBearerEvents.OnChallenge` → `UNAUTHORIZED` |
| JWT authz failure | `JwtBearerEvents.OnForbidden` → `FORBIDDEN` |
| Rate limiting | `RateLimiter.OnRejected` → `TOO_MANY_REQUESTS` |
| Unhandled exception | `GlobalExceptionHandler` → `SERVER_ERROR` (500) |
| Client disconnect | `GlobalExceptionHandler` → logged, no response body |

## Frontend propagation

`apiClient` unwraps the response envelope. A failed envelope becomes `ApiRequestError` with the server code, message, HTTP status, any field details, and trace ID. Feature API files use that client; components do not decode envelopes directly.

TanStack Query exposes expected request failures through query/mutation state. Render validation under the relevant field. Render submission failures as a form-level alert. Use a toast only for global events not tied to a form.
