# Frontend Architecture

**Authority:** client code structure and UI/data-flow conventions.  
**Source migration:** merge the former `Prive — Frontend Architecture Guide` after verifying it against `client/`.

## Stack and layout

The known client stack is React 19, Vite, TypeScript, Tailwind CSS v4, shadcn/ui with Radix primitives, TanStack Query, Zustand, Axios, React Hook Form, Zod, React Router, and lucide-react.

```text
client/src/
  app/          app shell, providers, router
  features/     product features; each exposes index.ts
  components/   shared components; ui/ is shadcn-generated
  hooks/        small shared hooks
  lib/          shared infrastructure, including apiClient
  types/        truly global types only
```

The `@` alias resolves to `src/`. Do not use relative imports to cross feature boundaries.

## Feature contract

Place product code under `features/<feature>/` as needed: `api/`, `hooks/`, `components/`, `schemas/`, `stores/`, `types/`, `pages/`, and a public `index.ts`. Not every feature needs every folder.

- `api/`: pure request functions that use `apiClient`; no React or Query.
- `hooks/`: query keys and TanStack Query wrappers; mutations invalidate or update affected cache deliberately.
- `schemas/`: Zod schemas for runtime/form validation.
- `stores/`: only UI/client state, never a cached copy of backend data.
- `index.ts`: the only cross-feature public surface.

Shared infrastructure must never import from a feature. If infrastructure needs a feature-owned reaction (such as clearing auth state), use a registration/callback seam instead of reversing the dependency.

## Data, forms, and UI

Use TanStack Query for backend data, caching, synchronization, and mutations. Use Zustand only for global client state that cannot be represented in server state or the URL.

Use React Hook Form with Zod for forms. Mirror API DTOs in types; keep mapping explicit if UI needs a different shape. All environment access goes through the validated `lib/env` layer, never direct `import.meta.env` reads.

Use existing shadcn components from `src/components/ui/`, lucide icons, `cn()` for class merging, and semantic Tailwind theme tokens. Tailwind v4 customization is in `src/index.css`; do not add a legacy Tailwind config merely for a new feature.

## Authentication and routing

The API client owns transport details: base URL, credential behavior, access-token injection, and envelope unwrapping. The auth session store is the sole feature-level owner of setting/clearing the access token. Wire feature pages through the application router and honor protected-route conventions already present in the code.
