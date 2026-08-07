# Backend Architecture

**Authority:** current backend structure and implementation guidance.  
**Source migration:** consolidate the backend portions of the former AI context guide and any verified current setup notes here.

## Structure and ownership

Organize business code as vertical modules under `Api/Modules/<Module>/`. Keep entities, DTOs, service logic, controllers, and module-specific details close together. Shared infrastructure belongs outside modules only when at least two modules genuinely require it.

```text
Controller → Service → AppDbContext
                     ↘ explicit domain/API exception
Global exception handler → standard API envelope
```

Controllers bind requests, apply authorization, invoke a service, and return successful HTTP results. They do not implement business rules, decide missing-resource semantics, or manually compose standard error responses.

Services contain validation beyond input-shape validation, business rules, and persistence through `AppDbContext`. They signal expected failures by throwing the established exception types with entries from centralized `ErrorCodes`.

## Module contract

When adding or changing a module:

1. Inspect the closest existing module and mirror its naming, route, DTO, and test conventions.
2. Model persistence explicitly and add `DbSet`/configuration/migration only when data must persist.
3. Keep request and response DTOs explicit; do not expose entities as API contracts.
4. Add centralized error codes for client-actionable failures.
5. Apply endpoint authorization deliberately. Never rely on an assumed default role.
6. Make cross-module effects explicit in the owning domain document before implementing them.

## Non-negotiable boundaries

- All normal API responses use the standard response envelope.
- Error status mapping is centralized; services do not return ad-hoc HTTP response objects.
- Domain data changes that affect inventory, balances, or posting must follow the accepted ADRs and domain invariants.
- Avoid generic repositories, mediator layers, or other abstractions unless existing code already uses them or a concrete duplication problem requires them.

See [error-handling.md](error-handling.md) for the external failure contract.
