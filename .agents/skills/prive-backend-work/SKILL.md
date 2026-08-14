---
name: prive-backend-work
description: Implement or modify Prive ASP.NET Core backend code while preserving modular boundaries, API envelopes, authorization, and EF Core conventions. Use for Prive controllers, services, entities, DTOs, database changes, error codes, or backend tests.
---

# Prive Backend Work

1. Read `AGENTS.md` and `docs/architecture/backend.md` (contains all patterns and code examples). Read `docs/architecture/error-handling.md` for the error contract.
2. Inspect the `User` module as the canonical reference. Match its naming, file layout, and code conventions exactly.
3. Apply these non-negotiable rules:
   - Controllers: bind, authorize, call service, wrap in `ApiResponse<T>.Ok()`. Never put business logic or error formatting here.
   - Services: own business rules, throw typed exceptions (`NotFoundException`, `ConflictException`, etc.) with `ErrorCodes` constants. Inject `AppDbContext` directly.
   - DTOs: explicit `sealed record` types in `DTOs/<Name>Dtos.cs`. Never expose entities at the API boundary.
   - Entities: `sealed class` with `Guid` primary key. Configuration in separate `IEntityTypeConfiguration` file. Enums stored as strings.
   - Error codes: add to `ErrorCodes.<Module>`. Never use inline string codes.
   - Pagination: extend `PaginationRequest`, use `ToPagedResultAsync()`, return `ApiResponse<List<T>>.Ok(items, metadata)`.
4. Generate a migration for persistent model changes: `dotnet ef migrations add <Name>`.
5. Verify: `dotnet build` must pass with 0 errors, 0 warnings. Inspect the diff for scope creep.

Report changed API/data contracts, migration status, and checks run.
