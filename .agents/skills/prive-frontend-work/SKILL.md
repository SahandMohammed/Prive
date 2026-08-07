---
name: prive-frontend-work
description: Implement or modify Prive React frontend features using feature boundaries, apiClient, TanStack Query, React Hook Form, Zod, Zustand, and shadcn/Radix conventions. Use for Prive pages, components, routes, forms, feature APIs, query hooks, client state, or frontend tests.
---

# Prive Frontend Work

1. Read `AGENTS.md`, `docs/architecture/frontend.md`, and `docs/architecture/error-handling.md`. Inspect the closest feature, its public index, related route, API contract, and tests before writing code.
2. Keep product code inside the owning feature. Use `api/` for pure `apiClient` calls, `hooks/` for query keys and Query wrappers, `schemas/` for Zod, and `stores/` only for UI/client state. Export the intentionally public surface through `index.ts`.
3. Use TanStack Query as the server-state source of truth. Define stable query keys and invalidate/update only affected data after mutations. Never place fetched entities in Zustand.
4. Use React Hook Form with Zod and show field errors beside inputs. Convert request failures from `ApiRequestError` into form/root errors or appropriate UI feedback. Do not treat expected API failures as error-boundary crashes.
5. Reuse existing shadcn/Radix components and Tailwind v4 theme tokens. Read environment values only through the validated environment module. Wire pages through the established router/protection conventions.
6. Run available typecheck, lint, and focused tests. Verify loading, empty, success, validation-error, request-error, and mutation-refresh states relevant to the change.

Report the exposed public API, query/cache effects, UI states verified, and backend contract assumptions.
