import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import boundaries from 'eslint-plugin-boundaries'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'

export default defineConfig([
  globalIgnores(['dist']),

  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },

  {
    // shadcn-generated files — not hand-authored, so relax the
    // component-only-exports rule that cva-based components trip
    // (Button, Badge, Alert, etc. export both the component and
    // its variants function from the same file by design)
    files: ['src/components/ui/**/*.{ts,tsx}'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },

  {
    // Feature-boundary enforcement.
    //
    // Each src/features/* folder and src/app/* is one element instance.
    // Files inside the SAME instance (e.g. features/auth/pages/LoginPage.tsx
    // importing features/auth/hooks/useLogin.ts) are "internal" dependencies
    // and are never evaluated by this rule — no explicit allow needed for
    // same-feature imports.
    //
    // What this actually enforces:
    //   1. shared (components/hooks/lib/types) never imports features or app
    //      — the dependency direction is inverted deliberately; see
    //      apiClient.ts's registerSessionHandlers for the pattern shared
    //      code uses when it needs a feature to hand it a callback instead.
    //   2. a feature may import shared, and its own internals, but never
    //      reaches into another feature directly.
    //   3. app (router, providers, route guards) may only import a feature
    //      through its public entry point (index.ts), never a feature's
    //      internal components/hooks/api files.
    files: ['src/**/*.{ts,tsx}'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/*' },
        { type: 'feature', pattern: 'src/features/*' },
        { type: 'shared', pattern: 'src/{components,hooks,lib,types}/*' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: { element: { type: 'shared' } },
              disallow: { to: { element: { type: ['feature', 'app'] } } },
            },
            {
              from: { element: { type: 'feature' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'feature' } },
              disallow: { to: { element: { type: 'feature' } } },
            },
            {
              from: { element: { type: 'app' } },
              allow: { to: { element: { type: 'shared' } } },
            },
            {
              from: { element: { type: 'app' } },
              disallow: { to: { element: { type: 'feature' } } },
            },
            {
              // narrower policy declared after the broad disallow above —
              // policies are evaluated in order and the last match wins,
              // so this overrides the disallow for index.ts specifically
              from: { element: { type: 'app' } },
              allow: {
                to: { element: { type: 'feature', fileInternalPath: 'index.ts' } },
              },
            },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*'],
              message: 'Features must be imported from their public index.ts. Do not reach into feature internals.',
            },
            {
              group: ['../features/*/*'],
              message: 'Features must be imported from their public index.ts. Do not reach into feature internals.',
            },
            {
              group: ['../../features/*/*'],
              message: 'Features must be imported from their public index.ts. Do not reach into feature internals.',
            }
          ],
        },
      ],
    },
  },

  prettier,
])
