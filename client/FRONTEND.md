# Prive — Frontend Architecture Guide

> **Audience:** AI agents and developers implementing new features or views.
> Read this before touching any frontend code. Every pattern here is already
> in production across `auth` and `users` — follow them, don't invent new ones.

---

## Table of Contents

1. [Stack](#1-stack)
2. [Project Structure](#2-project-structure)
3. [Path Aliases](#3-path-aliases)
4. [Environment Variables](#4-environment-variables)
5. [API Layer — lib/apiClient](#5-api-layer--libapiClient)
6. [Response Envelope](#6-response-envelope)
7. [TanStack Query — Server State](#7-tanstack-query--server-state)
8. [Zustand — UI State](#8-zustand--ui-state)
9. [Zod — Validation](#9-zod--validation)
10. [React Hook Form](#10-react-hook-form)
11. [Routing](#11-routing)
12. [shadcn/ui Components](#12-shadcnui-components)
13. [Feature Folder Convention](#13-feature-folder-convention)
14. [How to Add a New Feature — Step-by-Step](#14-how-to-add-a-new-feature--step-by-step)
15. [Import Rules](#15-import-rules)
16. [Naming Conventions](#16-naming-conventions)
17. [What Is Deliberately NOT Here Yet](#17-what-is-deliberately-not-here-yet)
18. [Common Mistakes to Avoid](#18-common-mistakes-to-avoid)

---

## 1. Stack

| Concern | Library | Version |
|---|---|---|
| Framework | React | 19 |
| Build tool | Vite | 8 |
| Language | TypeScript | 6 |
| Styling | Tailwind CSS | v4 (Vite plugin, no config file) |
| UI primitives | shadcn/ui (Nova preset, **Radix UI** primitives) | latest |
| Server state | TanStack Query | 5 |
| UI/client state | Zustand | 5 |
| HTTP | Axios | latest |
| Forms | React Hook Form | 7 |
| Validation | Zod | 4 |
| Routing | React Router | 7 |
| Icons | lucide-react | latest |
| Class utilities | clsx + tailwind-merge (via `cn()`) | latest |
| Testing | Vitest + Testing Library + jsdom | latest |
| Linting | ESLint + eslint-config-prettier | latest |
| Formatting | Prettier | latest |
| Pre-commit | Husky + lint-staged | latest |

> **Tailwind v4 note:** There is no `tailwind.config.js`. No PostCSS config.
> Tailwind is loaded as a Vite plugin in `vite.config.ts`. All theme
> customisation happens in `src/index.css` using CSS `@theme`.

> **shadcn primitive note:** shadcn was initialised with `--base radix`, Nova
> preset. All generated components use **Radix UI** primitives (`radix-ui` package)
> — not Base UI (`@base-ui/react`). The original project decision was Radix; the
> initial CLI defaulted to Base UI via the `--defaults` flag and was corrected.
> Always verify by checking the import on line 1 of any `src/components/ui/*.tsx`
> file — it should be `from "radix-ui"`, not `from "@base-ui/react/..."` .

---

## 2. Project Structure

```
client/
├── src/
│   ├── app/                    # App shell — router, providers, root component
│   │   ├── App.tsx             # Root component — placeholder, wire real pages here
│   │   ├── providers.tsx       # QueryClientProvider (add more providers here)
│   │   └── router.tsx          # createBrowserRouter — all routes defined here
│   │
│   ├── features/               # ONE folder per product feature
│   │   ├── auth/
│   │   │   ├── api/            # Raw fetch functions — pure, no React
│   │   │   ├── hooks/          # TanStack Query wrappers (useQuery / useMutation)
│   │   │   ├── components/     # React components owned by this feature
│   │   │   ├── stores/         # Zustand stores for UI-only state
│   │   │   ├── schemas/        # Zod schemas for forms
│   │   │   ├── types/          # TS interfaces mirroring backend DTOs
│   │   │   └── index.ts        # PUBLIC SURFACE — only import from here
│   │   └── users/              # Same structure as auth
│   │
│   ├── components/
│   │   └── ui/                 # shadcn-generated — DO NOT hand-edit
│   │       ├── button.tsx
│   │       ├── dialog.tsx
│   │       ├── input.tsx
│   │       ├── label.tsx
│   │       └── table.tsx
│   │
│   ├── hooks/                  # Shared hooks used by 2+ features — keep tiny
│   ├── lib/                    # Shared infrastructure — not feature-specific
│   │   ├── apiClient.ts        # Axios wrapper with token injection + unwrap
│   │   ├── apiError.ts         # ApiRequestError class
│   │   ├── apiResponse.ts      # ApiEnvelope<T> type (mirrors backend)
│   │   ├── env.ts              # Zod-validated import.meta.env
│   │   ├── queryClient.ts      # QueryClient singleton with retry logic
│   │   └── utils.ts            # cn() helper for Tailwind class merging
│   ├── types/                  # Truly global types — keep tiny
│   ├── test/
│   │   └── setup.ts            # Vitest setup (imports @testing-library/jest-dom)
│   ├── index.css               # Tailwind + shadcn theme tokens
│   └── main.tsx                # Entry point
│
├── components.json             # shadcn config — do not edit aliases here
├── .env                        # Local only — never commit
├── .env.example                # Committed — documents required vars
└── vite.config.ts
```

---

## 3. Path Aliases

The `@` prefix always resolves to `src/`. Both TypeScript and Vite are
configured to agree on this.

```ts
// correct
import { apiClient } from '@/lib/apiClient'
import { useLogin } from '@/features/auth'
import { Button } from '@/components/ui/button'

// wrong — never use relative paths that cross feature boundaries
import { useLogin } from '../../features/auth/hooks/useLogin'
```

**Config locations:**

- `tsconfig.app.json` → `compilerOptions.paths: { "@/*": ["./src/*"] }` (note the `./` prefix — no `baseUrl` needed with `moduleResolution: "bundler"`)
- `vite.config.ts` → `resolve.alias: { '@': path.resolve(__dirname, './src') }`

---

## 4. Environment Variables

All env vars are validated at startup by Zod. **Never read `import.meta.env`
directly.** Always import from `@/lib/env`.

```ts
// correct
import { env } from '@/lib/env'
const url = env.VITE_API_BASE_URL

// wrong
const url = import.meta.env.VITE_API_BASE_URL  // type: string | undefined
```

**Adding a new env var:**

1. Add it to `lib/env.ts`:

```ts
const envSchema = z.object({
  VITE_API_BASE_URL: z.string().url(),
  VITE_NEW_VAR: z.string().min(1),  // add here
})
```

2. Add it to `.env.example` (committed) and your local `.env` (not committed):

```
VITE_NEW_VAR=your-value
```

---

## 5. API Layer — lib/apiClient

`apiClient` is the only thing that talks to the network. It is a thin Axios
wrapper that:

- Sets `baseURL` from `env.VITE_API_BASE_URL`
- Sends `withCredentials: true` (the httpOnly refresh-token cookie rides along)
- Injects the in-memory access token as `Authorization: Bearer <token>` on
  every request via a request interceptor
- Unwraps the `ApiEnvelope<T>` response — on success it returns `T`, on
  failure it throws `ApiRequestError`

```ts
export const apiClient = {
  get:    <T>(url: string)              => Promise<T>
  post:   <T>(url: string, body?)       => Promise<T>
  put:    <T>(url: string, body?)       => Promise<T>
  delete: <T>(url: string)              => Promise<T>
}
```

**Calling it from a feature's `api/` file:**

```ts
// features/orders/api/orders.api.ts
import { apiClient } from '@/lib/apiClient'
import type { Order, CreateOrderRequest } from '../types/orders.types'

export const ordersApi = {
  list:   ()                          => apiClient.get<Order[]>('/orders'),
  getOne: (id: string)                => apiClient.get<Order>(`/orders/${id}`),
  create: (body: CreateOrderRequest)  => apiClient.post<Order>('/orders', body),
  update: (id: string, body: unknown) => apiClient.put<Order>(`/orders/${id}`, body),
  delete: (id: string)                => apiClient.delete<void>(`/orders/${id}`),
}
```

**Rules:**

- Feature `api/` files are pure functions — no React, no hooks, no TanStack
  Query. This keeps them trivially unit-testable.
- Never call `apiClient` directly from a component or hook. Always go through
  the feature's `api/` file.
- The access token is managed by `useAuthSessionStore.setSession()` /
  `clearSession()`, which calls `setAccessToken()` from `apiClient.ts`. Never
  manually call `setAccessToken()` from anywhere else.

---

## 6. Response Envelope

Every backend response is wrapped in `ApiEnvelope<T>` (defined in
`lib/apiResponse.ts`, mirroring `Infrastructure/Http/ApiResponse.cs`):

```ts
// Success
{ success: true, data: T }

// Failure
{ success: false, error: { code: string, message: string, details?: ApiFieldError[], traceId?: string } }
```

`apiClient` handles this automatically via its internal `unwrap()` function.
If `success` is `false`, it throws `ApiRequestError` with `.code`, `.message`,
`.details`, and `.traceId`.

**Catching errors in components:**

```ts
import { ApiRequestError } from '@/lib/apiError'

const mutation = useMutation({ mutationFn: ordersApi.create })

if (mutation.isError) {
  const msg = mutation.error instanceof ApiRequestError
    ? mutation.error.message   // clean server message
    : 'Unexpected error'
}
```

---

## 7. TanStack Query — Server State

TanStack Query is the **only** owner of server data. Never copy server
responses into Zustand.

### Queries (reading data)

```ts
// features/orders/hooks/useOrders.ts
import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '../api/orders.api'

export const ORDERS_QUERY_KEY = ['orders'] as const

export function useOrders() {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY,
    queryFn: ordersApi.list,
  })
}

// Single item variant:
export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id] as const,
    queryFn: () => ordersApi.getOne(id),
    enabled: Boolean(id),   // don't fire with empty/undefined id
  })
}
```

### Mutations (writing data)

```ts
// features/orders/hooks/useCreateOrder.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '../api/orders.api'
import { ORDERS_QUERY_KEY } from './useOrders'

export function useCreateOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
  })
}
```

### Query key convention

- Always export query keys as `const` arrays from the query hook file.
- Use `['feature']` for list, `['feature', id]` for single item.
- Import the key into mutation hooks so invalidation stays in sync.

### Default retry behaviour

The `QueryClient` in `lib/queryClient.ts` retries up to 2 times, **except**
for `ApiRequestError` with code `AUTH_SESSION_EXPIRED` or `FORBIDDEN` — those
never retry. `staleTime` is 30 seconds globally.

---

## 8. Zustand — UI State

Zustand stores own **UI-only state** — state that is not a copy of server data.

**Currently existing store:**

```ts
// features/auth/stores/auth-session.store.ts
useAuthSessionStore {
  isAuthenticated: boolean       // set at login, cleared at logout — does NOT automatically
                                 // flip to false when the access token expires mid-session.
                                 // A ProtectedRoute built on this field is only as fresh as the
                                 // last explicit setSession()/clearSession() call. See Section 17
                                 // (token refresh interceptor) — that's what keeps this honest.
  mustChangePassword: boolean    // flag from login response
  setSession(accessToken: string, mustChangePassword: boolean): void
  clearSession(): void
}
```

`setSession` calls `setAccessToken()` internally — it is the only correct way
to hand the access token to the HTTP layer.

### When to create a Zustand store

Create a store when you have state that:

- Is **not** server data (don't duplicate query cache)
- Needs to be shared across multiple components without prop drilling
- Examples: sidebar open/collapsed, selected rows in a table, shared modal
  state, theme preference

### Store pattern

```ts
// features/orders/stores/order-selection.store.ts
import { create } from 'zustand'

interface OrderSelectionState {
  selectedIds: string[]
  select: (id: string) => void
  deselect: (id: string) => void
  clearSelection: () => void
}

export const useOrderSelectionStore = create<OrderSelectionState>((set) => ({
  selectedIds: [],
  select: (id) => set((s) => ({ selectedIds: [...s.selectedIds, id] })),
  deselect: (id) => set((s) => ({ selectedIds: s.selectedIds.filter((x) => x !== id) })),
  clearSelection: () => set({ selectedIds: [] }),
}))
```

**Rules:**

- One store per concern, colocated in the feature's `stores/` folder.
- Never put raw API response data in a store.
- Always export the store from the feature's `index.ts`.

---

## 9. Zod — Validation

Zod is used in exactly two places:

### 9a. Environment variables

Already handled in `lib/env.ts`. See [Section 4](#4-environment-variables).

### 9b. Form schemas

Each feature owns its schemas in `features/<name>/schemas/<name>.schemas.ts`.

```ts
// features/orders/schemas/orders.schemas.ts
import { z } from 'zod'

export const createOrderSchema = z.object({
  customerId: z.string().uuid('Invalid customer ID'),
  items: z.array(
    z.object({
      productId: z.string().uuid(),
      quantity: z.number().int().min(1, 'Quantity must be at least 1'),
    })
  ).min(1, 'Order must have at least one item'),
  notes: z.string().optional(),
})

// ALWAYS derive the type from the schema. Never hand-write it separately.
export type CreateOrderFormValues = z.infer<typeof createOrderSchema>
```

**Rules:**

- Never hand-write a form values interface separately — use `z.infer`.
- Schema files live in the feature's `schemas/` folder, not a global one.
- For cross-field validation (e.g. password confirmation), use `.refine()`.
  See `auth.schemas.ts > changePasswordSchema` for the reference pattern.
- Zod is **not** used to validate API responses at the network boundary —
  TypeScript types in `types/` are the agreed safety net for response shapes.

---

## 10. React Hook Form

Always pair with Zod via `zodResolver`.

```tsx
// features/orders/components/CreateOrderForm.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createOrderSchema, type CreateOrderFormValues } from '../schemas/orders.schemas'
import { useCreateOrder } from '../hooks/useCreateOrder'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function CreateOrderForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateOrderFormValues>({
    resolver: zodResolver(createOrderSchema),
  })

  const createOrder = useCreateOrder()

  const onSubmit = (values: CreateOrderFormValues) =>
    createOrder.mutate(values, { onSuccess: () => reset() })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <Input {...register('customerId')} placeholder="Customer ID" />
        {errors.customerId && (
          <p className="text-sm text-destructive">{errors.customerId.message}</p>
        )}
      </div>
      <Button type="submit" disabled={createOrder.isPending}>
        {createOrder.isPending ? 'Creating…' : 'Create order'}
      </Button>
      {createOrder.isError && (
        <p className="text-sm text-destructive">{createOrder.error.message}</p>
      )}
    </form>
  )
}
```

**Rules:**

- Always pass `resolver: zodResolver(yourSchema)` to `useForm`.
- Use `mutation.isPending` to disable the submit button (not `isLoading` —
  that was TanStack Query v4 terminology).
- Use `text-destructive` (shadcn token) for error text, not `text-red-600`.
- Show `mutation.error.message` for server errors — it comes from the
  backend's `ApiError.message` via `ApiRequestError`.

---

## 11. Routing

All routes are defined in `src/app/router.tsx`. There is currently one route.

**Adding a route for a new page:**

```tsx
// src/app/router.tsx
import { createBrowserRouter } from 'react-router-dom'
import App from '@/app/App'
import { LoginPage } from '@/features/auth'
import { UsersPage } from '@/features/users'

export const router = createBrowserRouter([
  { path: '/',       element: <App /> },
  { path: '/login',  element: <LoginPage /> },
  { path: '/users',  element: <UsersPage /> },
])
```

**Conventions:**

- Page components live in `features/<name>/pages/` — a subfolder inside the
  feature, not a top-level `pages/` directory.
- Import page components from the feature's `index.ts`, not directly.
- Protected route wrapper is **not built yet** — see
  [Section 17](#17-what-is-deliberately-not-here-yet).

---

## 12. shadcn/ui Components

Components are generated into `src/components/ui/` by the shadcn CLI. Do not
hand-edit files in that folder — regenerate them with `--overwrite` if needed.

**Available components:**

| Component | Import path |
|---|---|
| `Button` | `@/components/ui/button` |
| `Input` | `@/components/ui/input` |
| `Label` | `@/components/ui/label` |
| `Dialog` | `@/components/ui/dialog` |
| `Table` | `@/components/ui/table` |

**Adding a new shadcn component:**

```bash
cd client
pnpm dlx shadcn@latest add <component-name>
```

> **Note on the `@` folder bug:** `shadcn init` and `shadcn add` both
> create a literal `@/` directory at the project root instead of resolving the
> `@/*` alias to `src/`. This is a persistent shadcn CLI quirk — after every
> `init` or `add` run, move the generated files manually:
> `mv @/components/ui/*.tsx src/components/ui/ && rm -rf @`

**Button variants:**

```tsx
<Button>Primary (default)</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>
<Button variant="link">Link</Button>

// Sizes: xs | sm | default | lg | icon | icon-xs | icon-sm | icon-lg
<Button size="icon"><TrashIcon /></Button>

// asChild — renders as a different element (e.g. an <a> tag) while keeping
// Button's styles. Provided by Radix's Slot primitive.
<Button asChild><a href="/login">Sign in</a></Button>
```

**`cn()` — class merging:**

Always use `cn()` from `@/lib/utils` when composing Tailwind classes
conditionally. It deduplicates conflicting Tailwind classes via `tailwind-merge`.

```ts
import { cn } from '@/lib/utils'

<div className={cn('base-class', isActive && 'active-class', className)} />
```

**Theme tokens — use semantic tokens, not raw Tailwind colours:**

| Token | Use for |
|---|---|
| `bg-background` / `text-foreground` | Page background / primary text |
| `bg-card` / `text-card-foreground` | Card surfaces |
| `bg-primary` / `text-primary-foreground` | Primary action colour |
| `bg-secondary` | Secondary surfaces |
| `bg-muted` / `text-muted-foreground` | Subdued backgrounds / hint text |
| `text-destructive` | Error messages, destructive actions |
| `border-border` | Standard borders |
| `ring-ring` | Focus rings |

---

## 13. Feature Folder Convention

Every product feature gets its own folder under `src/features/`. The internal
structure is always:

```
features/<name>/
├── api/
│   └── <name>.api.ts       # Pure fetch functions using apiClient
├── hooks/
│   ├── use<Entity>.ts      # useQuery — list or single item
│   ├── useCreate<Entity>.ts
│   ├── useUpdate<Entity>.ts
│   └── useDelete<Entity>.ts
├── components/
│   └── <ComponentName>.tsx
├── pages/                   # Add when feature has its own route
│   └── <Name>Page.tsx
├── stores/                  # Only if UI-only state is needed
│   └── <name>.store.ts
├── schemas/
│   └── <name>.schemas.ts   # Zod schemas for forms
├── types/
│   └── <name>.types.ts     # TS interfaces mirroring backend DTOs
└── index.ts                 # Public surface — barrel export
```

The **`index.ts`** is the only file external code should import from:

```ts
// correct
import { useOrders, CreateOrderForm } from '@/features/orders'

// wrong — reaching into internals
import { useOrders } from '@/features/orders/hooks/useOrders'
```

This is a convention, not lint-enforced yet. Respect it.

---

## 14. How to Add a New Feature — Step-by-Step

This is the canonical process. Follow every step in order.

### Example: adding an `orders` feature

**Step 1 — Types (mirrors backend DTOs)**

```ts
// src/features/orders/types/orders.types.ts
export interface Order {
  id: string
  customerId: string
  status: 'pending' | 'fulfilled' | 'cancelled'
  createdAt: string
}

export interface CreateOrderRequest {
  customerId: string
  items: { productId: string; quantity: number }[]
  notes?: string
}
```

**Step 2 — Zod schemas (forms only)**

```ts
// src/features/orders/schemas/orders.schemas.ts
import { z } from 'zod'

export const createOrderSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  notes: z.string().optional(),
})

export type CreateOrderFormValues = z.infer<typeof createOrderSchema>
```

**Step 3 — API functions (pure, no React)**

```ts
// src/features/orders/api/orders.api.ts
import { apiClient } from '@/lib/apiClient'
import type { Order, CreateOrderRequest } from '../types/orders.types'

export const ordersApi = {
  list:   ()                          => apiClient.get<Order[]>('/orders'),
  create: (body: CreateOrderRequest)  => apiClient.post<Order>('/orders', body),
  delete: (id: string)                => apiClient.delete<void>(`/orders/${id}`),
}
```

**Step 4 — Query hooks (TanStack Query wrappers)**

```ts
// src/features/orders/hooks/useOrders.ts
import { useQuery } from '@tanstack/react-query'
import { ordersApi } from '../api/orders.api'

export const ORDERS_QUERY_KEY = ['orders'] as const

export function useOrders() {
  return useQuery({ queryKey: ORDERS_QUERY_KEY, queryFn: ordersApi.list })
}
```

```ts
// src/features/orders/hooks/useCreateOrder.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ordersApi } from '../api/orders.api'
import { ORDERS_QUERY_KEY } from './useOrders'

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ORDERS_QUERY_KEY }),
  })
}
```

**Step 5 — Components**

```tsx
// src/features/orders/components/OrderTable.tsx
import { useOrders } from '../hooks/useOrders'

export function OrderTable() {
  const { data: orders, isPending, isError } = useOrders()

  if (isPending) return <p className="text-sm text-muted-foreground">Loading…</p>
  if (isError)   return <p className="text-sm text-destructive">Failed to load orders.</p>

  return (
    <table className="w-full text-sm">
      {/* ... */}
    </table>
  )
}
```

**Step 6 — Page component (when adding a route)**

```tsx
// src/features/orders/pages/OrdersPage.tsx
import { OrderTable } from '../components/OrderTable'

export function OrdersPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Orders</h1>
      <OrderTable />
    </main>
  )
}
```

**Step 7 — Public surface (index.ts)**

```ts
// src/features/orders/index.ts
export { useOrders } from './hooks/useOrders'
export { useCreateOrder } from './hooks/useCreateOrder'
export { OrderTable } from './components/OrderTable'
export { OrdersPage } from './pages/OrdersPage'
export { createOrderSchema } from './schemas/orders.schemas'
export type { CreateOrderFormValues } from './schemas/orders.schemas'
export type { Order, CreateOrderRequest } from './types/orders.types'
```

**Step 8 — Wire the route**

```tsx
// src/app/router.tsx
import { OrdersPage } from '@/features/orders'

export const router = createBrowserRouter([
  { path: '/',        element: <App /> },
  { path: '/orders',  element: <OrdersPage /> },
])
```

---

## 15. Import Rules

| From | Can import from | Cannot import from |
|---|---|---|
| `app/` | `features/*`, `lib/*`, `components/*`, `hooks/*`, `types/*` | — |
| `features/<A>/` | `lib/*`, `components/*`, `hooks/*`, `types/*`, `features/<B>/index.ts` | `features/<B>/<anything internal>` |
| `lib/` | Only other `lib/` files | `features/`, `app/`, `components/ui/` |
| `components/ui/` | `lib/utils`, other `components/ui/*` files | Anything in `features/` |

**Cross-feature imports:** when feature A needs something from feature B,
import only from `features/<B>/index.ts`:

```ts
// correct
import { useCurrentUser } from '@/features/auth'

// wrong
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser'
```

---

## 16. Naming Conventions

| Thing | Convention | Example |
|---|---|---|
| Feature folders | kebab-case | `features/order-items/` |
| API object | camelCase + `Api` suffix | `ordersApi`, `authApi` |
| Query hook | `use` + PascalCase entity | `useOrders`, `useOrder` |
| Mutation hook | `use` + verb + PascalCase | `useCreateOrder`, `useDeleteUser` |
| Query key export | `SCREAMING_SNAKE_CASE_QUERY_KEY` | `ORDERS_QUERY_KEY` |
| Zustand store hook | `use` + PascalCase + `Store` | `useAuthSessionStore` |
| Zustand store file | kebab-case + `.store.ts` | `auth-session.store.ts` |
| Zod schema | camelCase + `Schema` | `createOrderSchema` |
| Zod inferred type | PascalCase + `FormValues` | `CreateOrderFormValues` |
| TS DTO interface | PascalCase, matches backend | `LoginRequest`, `Order` |
| Component | PascalCase | `OrderTable`, `CreateOrderForm` |
| Page component | PascalCase + `Page` | `OrdersPage`, `LoginPage` |
| shadcn files | lowercase | `button.tsx`, `dialog.tsx` |

---

## 17. What Is Deliberately NOT Here Yet

These are **known gaps**, not oversights. Do not implement them ad-hoc —
spec them first.

| Thing | Status | Notes |
|---|---|---|
| Protected route wrapper | Not built | `useAuthSessionStore.isAuthenticated` is ready; needs a `<ProtectedRoute>` component wrapping React Router `<Outlet>` |
| Token refresh interceptor | Not built | `apiClient` does not handle 401 → refresh → retry; needs an Axios response interceptor |
| Full `AuthContext` | Not built | Zustand store covers session state; React context may be added later |
| Dashboard / feature pages | Not built | Only `/` exists as a placeholder |
| `pages/` subfolder in existing features | Not created | `auth` and `users` have no page components yet; add when a route is needed |
| ESLint-enforced import boundaries | Not enforced | Convention only for now |
| Optimistic updates | Not used | `invalidateQueries` pattern only; add per-mutation as UX demands |
| React Query DevTools | Not installed | Add `@tanstack/react-query-devtools` locally for debugging |

---

## 18. Common Mistakes to Avoid

**Putting server data in Zustand:**

```ts
// Wrong — duplicates cache, causes stale data bugs
const useOrderStore = create(() => ({ orders: [] as Order[] }))
// Right — use useOrders() from TanStack Query
```

**Importing from deep inside another feature:**

```ts
// Wrong
import { useAuthSessionStore } from '@/features/auth/stores/auth-session.store'
// Right
import { useAuthSessionStore } from '@/features/auth'
```

**Reading `import.meta.env` directly:**

```ts
// Wrong — type is string | undefined, no validation
const base = import.meta.env.VITE_API_BASE_URL
// Right
import { env } from '@/lib/env'
const base = env.VITE_API_BASE_URL
```

**Hand-writing a type that duplicates a Zod schema:**

```ts
// Wrong — two sources of truth that will diverge
const schema = z.object({ name: z.string() })
interface FormValues { name: string }  // delete this, use z.infer
// Right
type FormValues = z.infer<typeof schema>
```

**Calling `apiClient` directly from a component or hook:**

```ts
// Wrong — skips feature api layer, can't be unit tested easily
const data = await apiClient.get<Order[]>('/orders')
// Right — define ordersApi.list() and call it from useOrders()
```

**Hand-editing files in `src/components/ui/`:**

```
shadcn will overwrite them on the next `add` run.
Regenerate instead: pnpm dlx shadcn@latest add button --overwrite
```

**Using `isLoading` instead of `isPending` on mutations:**

```ts
// Wrong — isLoading is TanStack Query v4 terminology
<Button disabled={mutation.isLoading}>
// Right
<Button disabled={mutation.isPending}>
```
