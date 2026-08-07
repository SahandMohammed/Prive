# Authentication Architecture

**Authority:** known authentication/session contract.  
**Source migration:** extract current protocol details from Auth MVP notes; archive the implementation timeline separately.

The referenced design uses short-lived JWT access tokens and long-lived refresh tokens. Refresh tokens are SHA-256 hashed and persisted as `RefreshTokenEntity`; the refresh credential travels using the configured secure HTTP-only cookie flow. The in-memory access token is injected by `apiClient` via the authorization header.

Endpoint authorization is explicit, including allowed roles such as `SuperAdmin`, `Owner`, `Manager`, `Professional`, and `Cashier`. The frontend auth session store owns session flags and the access-token handoff to the HTTP client. Do not set raw tokens directly elsewhere.

Before modifying login, refresh, logout, cookie policy, or roles, inspect the implementation and update [ADR 002](../decisions/002-authentication.md) if the enduring decision changes.
