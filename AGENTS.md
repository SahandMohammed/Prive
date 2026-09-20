# Prive — Agent Instructions

Prive is a salon management platform. Stack: ASP.NET Core Web API (.NET 10), PostgreSQL/EF Core, React + Vite + TypeScript.

## Working principles

Prioritize simplicity, readability, explicit contracts, and consistency with the existing code. Inspect a similar implementation before adding a new pattern. Make the smallest complete change; do not redesign unrelated code or add dependencies without a clear need.

The current code is the source of truth for what exists. The current task defines the requested outcome. Resolve a conflict by this order: current prompt, ADR, architecture document, code. If it remains unresolved, state the conflict and ask before changing behaviour.

## Context routing

Read only the material needed for the task:

| Task | Read |
| --- | --- |
| Backend work | `docs/architecture/backend.md` |
| Frontend work | `docs/architecture/frontend.md` |
| Flutter customer app work | `docs/architecture/mobile.md` |
| Error/API contract work | `docs/architecture/error-handling.md`, `docs/decisions/001-api-envelope.md` |
| Authentication | `docs/architecture/authentication.md`, `docs/decisions/002-authentication.md` |

## Backend rules

- Organize code by module/vertical slice under `Api/Modules/<Module>/`.
- Each module directory contains: controller, service, module registration, `DTOs/` (request/response records), and `Entities/` (entity classes + EF configurations in the same file).
- Controllers own binding, authorization, service calls, and wrapping results in `ApiResponse<T>`. Controllers never contain business logic.
- Services own business rules, persistence through `AppDbContext`, and throw typed exceptions from `Api.Infrastructure.Http` with codes from `ErrorCodes`.
- **Never** create manual error responses in controllers — throw `NotFoundException`, `ConflictException`, `BadRequestException`, `UnauthorizedException`, or `ForbiddenException` and the `GlobalExceptionHandler` formats them automatically.
- Use the centralized `ErrorCodes` class; never use inline error-code strings.
- Use the existing pagination infrastructure (`PaginationRequest`, `PagedResult<T>`, `ToPagedResultAsync()`, `PaginationMetadata`) for collection endpoints.
- Register new modules via an extension method in `<Module>Module.cs` and call it in `Program.cs`.
- Add new `DbSet<T>` properties to `AppDbContext.cs` when persisting new entities.

## Frontend rules

- Organize product code by feature under `client/src/features/`.
- TanStack Query owns server state. Zustand is only for client/UI state; never copy API data into it.
- Use React Hook Form with Zod for forms and validation.
- Feature `api/` files are the only feature code that call `apiClient`; they contain no React or query logic.
- Import another feature only through its public `index.ts`; do not deep-import across features.
- Shared code (`src/lib`, shared components, shared hooks) must not import features.
- Reuse the existing shadcn/Radix components and Tailwind theme tokens.

## Customer mobile app

The Privé customer-facing Flutter application lives in `customer_app/`.

For customer mobile work:

- read `docs/architecture/mobile.md`
- use `.agents/skills/prive-mobile-work/SKILL.md`
- when creating a new Flutter feature, use `.agents/skills/create-prive-mobile-feature/SKILL.md`

The mobile app uses feature-first architecture and Riverpod.

During the UI-first phase, features contain only UI/state code actually required.

Do not introduce speculative repositories, API clients, DTOs, domain layers, persistence, or backend abstractions.

Flutter features represent customer capabilities rather than mirroring backend modules.

The ASP.NET Core API remains authoritative for business rules.

## Execution and verification

For a non-trivial change: inspect comparable code (Auth or User module), read the routed documents, identify affected contracts, implement the smallest complete solution, then build/test. For backend changes run `dotnet build` and include a migration where the model changes. Review the final diff for unrelated edits.

## Packaged workflows

If the project installs `.agents/skills/`, use the matching skill for a new module, an extension to an existing module, backend-only work, or frontend-only work. Those workflows complement these rules.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
