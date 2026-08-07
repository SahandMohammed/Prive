---
name: prive-backend-work
description: Implement or modify Prive ASP.NET Core backend code while preserving modular boundaries, API envelopes, authorization, and EF Core conventions. Use for Prive controllers, services, entities, DTOs, database changes, error codes, or backend tests.
---

# Prive Backend Work

1. Read `AGENTS.md`, `docs/architecture/backend.md`, and `docs/architecture/error-handling.md`. Read a relevant domain file and ADR for business, inventory, payment, balance, or posting changes.
2. Inspect the closest comparable module, relevant `AppDbContext` configuration, error-code definitions, exception handler, and tests. Treat observed code conventions as the default implementation pattern.
3. Keep request binding, authorization, service invocation, and successful response construction in controllers. Put validation beyond request shape, persistence, and business decisions in services. Throw established typed exceptions using centralized error codes for expected failures.
4. Keep response envelopes and error mapping centralized. Use explicit DTOs rather than entities at the API boundary. Add an EF migration for persistent model changes and consider existing data.
5. Add or update focused tests for the contract, authorization, happy path, and relevant failure path. Build and run the affected backend tests. Inspect the final diff for scope creep.

Report changed API/data contracts, migration status, checks run, and unresolved domain decisions.
