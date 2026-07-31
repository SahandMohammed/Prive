# Prive MVP — AI Context & Architecture Guide

Welcome, AI Agent! This document is your definitive guide to the architecture, patterns, boundaries, and philosophy of the Prive MVP project. 

When you are tasked with creating a new module, refactoring code, or debugging an issue, you **MUST** adhere to the rules outlined in this document. The goal is to maintain a cohesive, scalable, and predictable codebase designed to be maintained by a team for the next 5 years.

---

## 1. Global Project Philosophy
- **Stack**: ASP.NET Core Web API (.NET 10) + React (Vite + TypeScript).
- **Roles**: `SuperAdmin`, `Owner`, `Manager`, `Professional`, `Cashier`.
- **Core Tenets**: Prioritize simplicity, readability, and explicit contracts over "clever" abstractions. The codebase relies heavily on centralized error handling and strict domain boundaries.

---

## 2. The Exception & Error Flow (Full Stack)

Understanding how an error propagates from deep in the backend database all the way to a red text message on the user's screen is critical.

### The Flow:
1. **Backend Service Layer**: A business rule fails. The service explicitly throws a derived exception.
   ```csharp
   throw new ConflictException(ErrorCodes.User.DuplicateEmail, "Email already exists.");
   ```
2. **Backend GlobalExceptionHandler**: The middleware catches the exception. It retrieves the current HTTP `TraceId`, maps the `ConflictException` to an HTTP 409 status code, and serializes the response into the standard API Envelope:
   ```json
   {
     "success": false,
     "error": { "code": "USER_DUPLICATE_EMAIL", "message": "Email already exists." },
     "traceId": "0HM...:0000001"
   }
   ```
3. **Frontend API Client (`apiClient.ts`)**: The Axios instance intercepts the 409 response. The `unwrap<T>` function extracts the envelope. Seeing `success: false`, it throws an `ApiRequestError` containing the `code`, `message`, and `status`.
4. **TanStack React Query**: The active `useMutation` (e.g., `createUser`) catches the `ApiRequestError`. It sets `isError: true` and places the `ApiRequestError` inside the `error` property. (Note: 4xx errors are immediately rejected, while 5xx/network errors are retried twice before failing).
5. **UI Rendering**: The React component detects `mutation.isError`. It reads `mutation.error.message` and displays it to the user.
   ```tsx
   {mutation.isError && <p className="text-red-500">{mutation.error.message}</p>}
   // OR mapping to react-hook-form:
   form.setError('root', { message: mutation.error.message })
   ```

### Error Boundaries
- **API Errors (4xx/5xx)** are caught by TanStack Query and handled gracefully *within the component's state* (`isError`). They do **not** crash the component tree.
- **Unexpected Rendering Errors / Crashes**: Target architecture (to be implemented): Handled by React Error Boundaries (`react-error-boundary`) or React Router's `errorElement`. These are reserved strictly for unexpected UI crashes (e.g., null pointer exceptions in JS), not expected API validation failures.
- **TraceID Usage**: When a 500 error occurs, the UI should ideally present the `traceId` to the user (e.g., *"An unexpected error occurred. Support ID: [TraceID]"*) so it can be cross-referenced with backend logs.

---

## 3. Frontend Architecture (`client/`)

### 3.1 Feature-Sliced Design (Strict Boundaries)
- **Features (`src/features/`)**: Every domain (auth, users, dashboard) lives here.
- **Internal Structure**: `api/`, `components/`, `hooks/`, `schemas/`, `stores/`, `types/`, and `pages/`.
- **Public API (`index.ts`)**: A feature MUST export its public surface via `index.ts`. 
- **Linter Enforced Boundary**: Deep cross-feature imports are blocked by ESLint (`no-restricted-imports`). **Never** import from another feature's internal folders (`@/features/auth/stores/X`). You MUST import via the public index (`@/features/auth`).

### 3.2 State Management: Zustand vs. TanStack Query
- **TanStack React Query**: The absolute **source of truth for Server State**. Use it for data fetching, caching, deduplication, and synchronization. Any data that originates from the backend (Users, Invoices, Profiles) lives here.
- **Zustand**: Used **strictly for Global Client State** that cannot be tied to a URL or server. (e.g., `auth-session.store.ts` for managing the `isAuthenticated` boolean flag and raw token presence). Do NOT duplicate server data into Zustand.

### 3.3 UI, Forms, and Libraries
- **Forms**: Use `react-hook-form` paired with `zod` for strictly typed runtime validation.
- **Components & Styling**: 
  - `shadcn/ui` components (Base UI primitives) are placed in `src/components/ui/`.
  - Icons are provided by `lucide-react`.
  - CSS is handled by Tailwind v4 utilizing `@theme` inside `src/index.css` (no config file).
- **Showing Errors**: 
  - Field-level validation -> display under the specific input using `react-hook-form`.
  - Form submission failures (backend rejection) -> use generic `Alert` components or map to the form's `'root'` error.
  - Global system events -> use Toast notifications.

### 3.4 Dependency Inversion (Shared vs Features)
- **Shared Code (`src/lib/`, `src/components/`, `src/hooks/`)**: Must **NEVER** import from `src/features/`.
- **Callbacks/Registration**: If `apiClient.ts` needs to trigger feature-specific behavior (e.g., clearing auth state on session expiry), it exposes a registration hook. The feature (`features/auth/bootstrap.ts`) calls this hook at app startup.

---

## 4. Backend Architecture (`Api/`)

### 4.1 Vertical Slice / Modular Structure
- Code is organized by domain modules (`Modules/Auth/`, `Modules/User/`). A module folder contains its `Controller`, `Service`, `Entity`, `DTOs`, and related logic.

### 4.2 The Controller / Service Contract
- **Controllers (Pure Happy-Path)**:
  - Responsibilities: Route mapping (`[Route]`), auth attributes (`[Authorize]`), input binding, invoking the service, and returning HTTP success responses (`Ok()`, `CreatedAtAction()`).
  - **Rule**: Controllers **NEVER** check for `null` to return 404, and **NEVER** throw domain exceptions.
- **Services (Business Logic & Errors)**:
  - Responsibilities: Database interaction via `AppDbContext`, validation, and business rules.
  - **Rule**: Services handle all failure states by explicitly throwing domain exceptions (`NotFoundException`, `ConflictException`).

### 4.3 API Responses & Envelopes
- **API Envelope**: ALL responses are wrapped in `ApiResponse<T>`.
- **Error Codes**: Always use the static strings defined in `Infrastructure/Http/ErrorCodes.cs` (e.g., `ErrorCodes.User.NotFound`). No magic strings allowed.

### 4.4 Security & Auth
- **JWT Tokens**: Access tokens are short-lived. Refresh tokens are long-lived, securely hashed (`SHA256`), and stored in the database (`RefreshTokenEntity`).
- **Authorization**: Enforced strictly at the endpoint level via attributes (`[Authorize(Roles = "Manager,Owner")]`).

---

## 5. Execution Plan for Creating a New Module
When instructed to create a new feature (e.g., "Invoices"), execute the following flow:

### Step 1: Backend Implementation
1. **Entity**: Create `InvoiceEntity.cs` in `Modules/Invoice/`. Include standard properties like `Id` and `IsActive`. Add it as a `DbSet` in `AppDbContext.cs`.
2. **DTOs**: Create `InvoiceDtos.cs` for Request and Response shapes.
3. **Error Codes**: Add new module error codes to `ErrorCodes.cs`.
4. **Service**: Create `InvoiceService.cs`. Handle DB logic and throw explicit domain exceptions on failure.
5. **Controller**: Create `InvoiceController.cs`. Bind routes, apply `[Authorize]` roles, call the service, and return `ApiResponse<T>.Ok(...)`.

### Step 2: Frontend Implementation
1. **Scaffold Feature**: Create `src/features/invoices/`.
2. **Types**: Add `types/invoices.types.ts` mirroring the backend DTOs EXACTLY.
3. **API Client**: Add `api/invoices.api.ts` mapping the backend endpoints via `apiClient`.
4. **State**: Add React Query wrappers in `hooks/useInvoices.ts`.
5. **UI & Forms**: Build components in `components/` and define Zod schemas in `schemas/`.
6. **Public API**: Export ONLY the necessary public hooks, types, and components through `features/invoices/index.ts`.
7. **Routing**: Hook up the new feature pages in `src/app/router.tsx`.
