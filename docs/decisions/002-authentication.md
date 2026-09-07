# ADR-002 — Token-Based Session Model

**Status:** Accepted, subject to code verification

## Decision

Use a short-lived JWT access token for API authorization and a long-lived, database-backed refresh token. Store refresh tokens hashed; use an HTTP-only, `Secure`, `SameSite=None` credential flow so the SPA can refresh across its configured API origin. Keep the access token in memory and make the auth session store the only frontend owner that hands it to the API client.

## Consequences

- Do not persist raw refresh tokens.
- The refresh-token cookie requires HTTPS, including local development.
- Do not bypass the auth store to call the API client's token setter.
- Keep authorization enforcement at endpoints rather than in UI-only checks.

Branch authorization is checked against current database assignments on every operational request. User creation, role changes, password resets, deletion, and branch-access assignments require an Owner or SuperAdmin; Managers retain user-list access. See [ADR-003](003-branch-workspace.md).
