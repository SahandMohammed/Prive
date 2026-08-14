---
name: create-prive-module
description: Create a new end-to-end Prive business module, including only the required ASP.NET Core backend and React feature slices. Use when a user asks to introduce a new Prive module or product domain, such as appointments, invoices, customers, sales, purchases, or inventory.
---

# Create a Prive Module

1. Read `AGENTS.md` and `docs/architecture/backend.md` (contains exact file layout, code patterns, and checklist). For frontend, also read `docs/architecture/frontend.md`.
2. Inspect the `User` module (`Api/Modules/User/`) as the reference implementation. Your new module must mirror its structure exactly:
   - `<Name>Controller.cs` — routes, authorization, `ApiResponse<T>` wrapping
   - `<Name>Service.cs` — business logic, `AppDbContext`, typed exceptions
   - `<Name>Module.cs` — DI registration extension method
   - `DTOs/<Name>Dtos.cs` — all request/response records in one file
   - `Entities/<Name>Entity.cs` — entity class + enum
   - `Entities/<Name>EntityConfiguration.cs` — EF Core `IEntityTypeConfiguration<T>`
3. Use existing infrastructure — do not duplicate:
   - `ApiResponse<T>.Ok()` for success responses
   - `NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`, `ForbiddenException` for errors
   - `ErrorCodes.<Module>` for error code constants (add a new nested class)
   - `PaginationRequest`, `ToPagedResultAsync()`, `PaginationMetadata` for list endpoints
4. Register: add `DbSet` to `AppDbContext`, chain `Add<Name>Module()` in `Program.cs`.
5. Generate migration: `dotnet ef migrations add <MigrationName>`.
6. Verify: `dotnet build` must pass with 0 errors, 0 warnings. For frontend, run typecheck/lint.

Report the completed scope, intentionally excluded scope, and verification results.
