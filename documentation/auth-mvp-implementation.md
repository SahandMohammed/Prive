# Auth MVP implementation

## Implemented endpoints

All endpoints are versioned under `/api/v1/auth`.

| Endpoint | Behaviour |
| --- | --- |
| `POST /login` | Validates credentials, tracks lockouts, returns a 15-minute access token, and sets an HTTP-only refresh-token cookie. |
| `POST /refresh` | Rotates an active refresh token and returns a new access token. |
| `POST /logout` | Revokes the current refresh token when present and clears its cookie. |
| `POST /change-password` | Requires a valid bearer token, changes the password, revokes all refresh tokens, and clears the caller's cookie. |

The Swagger UI includes a Bearer security definition. Use the access token returned by login to authorize protected requests.

## Security behaviour

- Passwords use `PasswordHasher<UserEntity>`; raw passwords are never persisted.
- Refresh tokens are 64 bytes of cryptographically secure randomness and only their SHA-256 hash is stored.
- Login responses do not distinguish an unknown username from an incorrect password.
- Five failed password attempts lock the account for 15 minutes.
- Refresh tokens are single-use: a successful refresh revokes the previous token.
- Changing a password revokes every outstanding refresh token.
- Cookies are `HttpOnly`, `SameSite=Strict`, path-scoped to `/`, and `Secure` outside Development. Development intentionally allows localhost HTTP so the Vite client can test the flow.

## Required configuration

The API needs a PostgreSQL connection string and a Base64-encoded JWT signing key before it can serve auth requests. Keep both outside source control:

```bash
cd Api
dotnet user-secrets set "ConnectionStrings:Default" "Host=localhost;Database=prive;Username=postgres;Password=postgres"
dotnet user-secrets set "Jwt:Key" "$(openssl rand -base64 48)"
dotnet tool run dotnet-ef -- database update
```

`JwtOptions` validates that the key decodes to at least 32 bytes, along with issuer, audience, and lifetimes. The non-secret JWT settings are checked into `appsettings.json`.

## Persistence

`Shared/Persistence/AppDbContext` centrally aggregates `users` and `refresh_tokens`, while `ApplyConfigurationsFromAssembly` automatically discovers each module's Fluent API configuration. The user entity and `UserEntityConfiguration` stay in the Users module; refresh tokens and their configuration remain owned by Auth. The generated `AddAuthModule` migration creates both tables, an index for the username, and indexes for refresh-token lookups.

`AppDbContextFactory` is only for EF tooling. Its local fallback connection string lets `migrations add` scaffold without a running database; `database update` still requires the real connection string above.

## Assumptions and follow-up

The existing project had no user persistence model. The minimal entity introduces `Unassigned`, `Owner`, `Manager`, and `Professional` roles because the supplied auth contract requires a role and an optional linked-professional ID. Account creation and the first Owner bootstrap remain intentionally unimplemented, as specified.

Next recommended work:

- Add a restricted Owner-only account-management flow and an explicit first-Owner bootstrap process.
- Apply role authorization to administrative routes after those routes exist.
- Add login rate limiting and integration tests against a temporary PostgreSQL instance.
- Have the frontend send credentialed requests (`credentials: 'include'`) for login, refresh, and logout.
