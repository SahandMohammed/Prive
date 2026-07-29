# Backend MVP setup implementation

## Scope

This pass implements the backend and root-level items from the MVP setup checklist. Frontend tooling, environment files, aliases, and pre-commit hooks are intentionally deferred.

## Implemented

- **CORS:** the named `Frontend` policy reads its allow-list from `Cors:AllowedOrigins`. It permits the configured Vite development origin, request headers and methods, and credentials. Add each deployed frontend origin explicitly in production configuration.
- **Configuration pattern:** `CorsOptions` is bound and validated at application startup. New settings (such as future JWT settings) should follow this options pattern.
- **Global error handling:** unhandled exceptions are logged and returned as RFC 7807 `application/problem+json` responses without exposing exception details.
- **Structured logging:** Serilog is the host logger, includes request logging, and writes structured console events. Logging levels and sinks are configured under `Serilog` in `appsettings.json`.
- **Health checks:**
  - `GET /api/v1/health/live` reports process liveness without dependencies.
  - `GET /api/v1/health` reports readiness. It includes PostgreSQL when `ConnectionStrings:Default` is non-empty.
- **EF Core CLI:** the reproducible local tool manifest is at `Api/dotnet-tools.json`. Restore it with `dotnet tool restore` from `Api`.
- **Repository conventions:** root `.editorconfig` and `README.md` were added.

## Configuration and operations

The API starts with PostgreSQL health checking disabled because the checked-in development connection string is empty. Set `ConnectionStrings:Default` via user secrets or environment configuration before relying on `/api/v1/health` as a database-readiness probe.

For production, replace the development CORS origin through environment configuration, for example:

```bash
Cors__AllowedOrigins__0=https://app.example.com
```

Do not commit database credentials or production origins containing secrets.

## Deferred follow-up

- Add the EF Core provider and `DbContext` when the data model is created; then create and apply migrations.
- Implement authentication before adding JWT middleware, authorization attributes, password hashing, and rate limiting.
- Add automated tests for CORS, exception responses, and health endpoints alongside the test project.
- Complete the frontend checklist separately: Prettier, lint-staged/Husky, aliases, and a checked-in `.env.example`.
