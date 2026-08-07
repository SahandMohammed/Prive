---
name: create-prive-module
description: Create a new end-to-end Prive business module, including only the required ASP.NET Core backend and React feature slices. Use when a user asks to introduce a new Prive module or product domain, such as appointments, invoices, customers, sales, purchases, or inventory.
---

# Create a Prive Module

1. Read the repository `AGENTS.md`, `docs/architecture/backend.md`, and `docs/architecture/frontend.md`. Read the matching domain document and any routed ADR before designing cross-module effects.
2. Inspect the closest existing backend module and frontend feature. List the user-visible scope, existing contracts to reuse, affected modules, and explicitly out-of-scope work. Ask before proceeding if a business rule or financial model is unresolved.
3. Define the smallest complete vertical slice: entity/data configuration only when persistence is needed; explicit request/response DTOs; centralized error codes; service rules; authorized controller endpoints; frontend types; pure API calls; query/mutation hooks; schemas/forms/components/pages; public feature exports; and route integration.
4. Keep controllers on the success path and services responsible for business failures. Keep backend data in TanStack Query, not Zustand. Import across features through public indexes only.
5. Implement in dependency order. Add a database migration when the persisted model changes. Do not build speculative reporting, generic abstractions, or future workflow states.
6. Verify backend build/tests and frontend typecheck/lint/tests available in the repository. Exercise each endpoint and UI state that the new module introduces. Review the diff for unrelated changes.

Report the completed scope, intentionally excluded scope, verification results, and any decision needing an ADR.
