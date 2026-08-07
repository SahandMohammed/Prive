# ADR-002 — Token-Based Session Model

**Status:** Accepted, subject to code verification

## Decision

Use a short-lived JWT access token for API authorization and a long-lived, database-backed refresh token. Store refresh tokens hashed; use the established HTTP-only credential flow. Keep the access token in memory and make the auth session store the only frontend owner that hands it to the API client.

## Consequences

- Do not persist raw refresh tokens.
- Do not bypass the auth store to call the API client's token setter.
- Keep authorization enforcement at endpoints rather than in UI-only checks.
