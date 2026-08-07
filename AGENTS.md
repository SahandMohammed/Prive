# Prive — Agent Instructions

Prive is an operational salon ERP. Its known stack is ASP.NET Core Web API (.NET 10), PostgreSQL/EF Core, and React + Vite + TypeScript.

## Working principles

Prioritize simplicity, readability, explicit contracts, and consistency with the existing code. Inspect a similar implementation before adding a new pattern. Make the smallest complete change; do not redesign unrelated code or add dependencies without a clear need.

The current code is the source of truth for what exists. Domain documents define intended business behaviour. ADRs define accepted technical or business decisions. Archived documents are historical only. The current task defines the requested outcome.

## Context routing

Read only the material needed for the task:

| Task | Read |
| --- | --- |
| Backend work | `docs/architecture/backend.md` |
| Frontend work | `docs/architecture/frontend.md` |
| Error/API contract work | `docs/architecture/error-handling.md`, `docs/decisions/001-api-envelope.md` |
| Authentication | `docs/architecture/authentication.md`, `docs/decisions/002-authentication.md` |
| Finance | `docs/domain/finance.md`, `docs/decisions/003-financial-ledger.md` |
| Sales, purchases, inventory, warehouse | Matching file under `docs/domain/` |

Never use `docs/archive/` as current guidance unless the task explicitly asks for historical context. Resolve a conflict by this order: current prompt, accepted ADR, domain document, architecture document, code, archive. If it remains unresolved, state the conflict and ask before changing business behaviour.

## Backend rules

- Organize code by module/vertical slice under `Api/Modules/`.
- Controllers own binding, authorization, service calls, and successful HTTP responses.
- Services own business rules, persistence through `AppDbContext`, and explicit domain/API exceptions.
- Use the centralized error codes; never introduce magic error-code strings.
- Keep error-to-HTTP mapping in centralized exception handling, not services or controllers.
- Keep authorization explicit at endpoints and follow the closest comparable module.

## Frontend rules

- Organize product code by feature under `client/src/features/`.
- TanStack Query owns server state. Zustand is only for client/UI state; never copy API data into it.
- Use React Hook Form with Zod for forms and validation.
- Feature `api/` files are the only feature code that call `apiClient`; they contain no React or query logic.
- Import another feature only through its public `index.ts`; do not deep-import across features.
- Shared code (`src/lib`, shared components, shared hooks) must not import features.
- Reuse the existing shadcn/Radix components and Tailwind theme tokens.

## Execution and verification

For a non-trivial change: inspect comparable code, read the routed documents, identify affected contracts, implement the smallest complete solution, then build/test the affected projects. For frontend changes run the available typecheck/lint/tests; for backend changes build/test the solution and include a migration where the model changes. Review the final diff for unrelated edits.

## Packaged workflows

If the project installs `.agents/skills/`, use the matching skill for a new module, an extension to an existing module, backend-only work, or frontend-only work. Those workflows complement these rules; they do not override accepted ADRs or the current task.
