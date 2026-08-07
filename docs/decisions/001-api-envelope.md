# ADR-001 — Standard API Envelope

**Status:** Accepted, subject to code verification

## Decision

All normal API responses use a shared `ApiResponse<T>` / frontend `ApiEnvelope<T>` contract. The frontend API client unwraps successful data and converts failed envelopes to `ApiRequestError`.

Expected service failures use typed exceptions and centralized error codes; a global exception handler maps them to HTTP status and the envelope.

## Consequences

- Controllers and services do not invent local response/error shapes.
- Feature UI handles `ApiRequestError` through TanStack Query state.
- Any schema change must be made in backend, frontend envelope types, API client, and `error-handling.md` together.

## Open verification

The prior documents disagree on whether `traceId` is top-level or inside `error`. Treat the implementation as definitive and update this ADR once verified.
