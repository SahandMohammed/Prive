# Error Handling and API Contract

**Authority:** failure handling from service to UI.  
**Source migration:** consolidate the exception-flow sections of the old AI context guide and any response-envelope notes here.

## Expected failures

Services throw established typed exceptions for expected business failures, using centralized `ErrorCodes` (for example, duplicate input or a missing resource). The global exception handler maps the exception to an HTTP status and the standard response envelope. Controllers do not duplicate this handling.

```json
{
  "success": false,
  "error": {
    "code": "USER_DUPLICATE_EMAIL",
    "message": "Email already exists."
  },
  "traceId": "request-trace-id"
}
```

Confirm the exact placement of `traceId` against `ApiResponse` before changing this example; the prior documents disagree about whether it belongs at the envelope or error level.

## Paginated successes

Collection endpoints that opt into pagination return their records directly in `data` and a pagination object in the optional top-level `meta` property. Non-paginated successes omit `meta` entirely.

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalCount": 0,
    "totalPages": 0,
    "hasPreviousPage": false,
    "hasNextPage": false
  }
}
```

## Frontend propagation

`apiClient` unwraps the response envelope. A failed envelope becomes `ApiRequestError` with the server code, message, HTTP status, any field details, and trace ID. Feature API files use that client; components do not decode envelopes directly.

TanStack Query exposes expected request failures through query/mutation state. Render validation under the relevant field. Render submission failures as a form-level alert/root error when appropriate. Use a toast only for a global event that should not be tied to a form.

React error boundaries are for unexpected render crashes, not expected API validation or authorization failures. When a user-visible unexpected failure is reported, include the trace ID when it is available.

## Retry behaviour

Follow the configured `QueryClient` behaviour. The referenced design retries transient 5xx/network failures up to twice and does not retry authentication/forbidden failures. Verify this in code before changing it.
