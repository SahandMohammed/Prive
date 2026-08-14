---
name: extend-prive-module
description: Safely extend an existing Prive backend module and matching React feature without breaking established contracts. Use when a user asks to add a field, workflow, endpoint, screen, status, or capability to an existing Prive module.
---

# Extend a Prive Module

1. Read `AGENTS.md` and `docs/architecture/backend.md`. Inspect the **entire** module being extended — its entity, configuration, DTOs, service, controller, and module registration.
2. State the existing behaviour being preserved, the requested change, and whether migration/backfill is needed. Escalate conflicts between code and documentation instead of guessing.
3. Follow the module's established patterns exactly:
   - Add new properties to the existing entity class and update its `IEntityTypeConfiguration`.
   - Add/update request/response records in the existing `DTOs/<Name>Dtos.cs` — do not create a second DTO file.
   - Add new error codes to the existing `ErrorCodes.<Module>` nested class.
   - Add new service methods that throw typed exceptions with `ErrorCodes` constants.
   - Add controller endpoints wrapped in `ApiResponse<T>` with proper `[Authorize]` and `[ProducesResponseType]`.
4. Use existing infrastructure — do not duplicate or reinvent:
   - `ApiResponse<T>.Ok()`, typed exceptions, `ErrorCodes`, pagination utilities.
5. Add a migration for schema changes: `dotnet ef migrations add <MigrationName>`.
6. Verify: `dotnet build` must pass with 0 errors, 0 warnings.

Report compatibility decisions, migration implications, and verification results.
