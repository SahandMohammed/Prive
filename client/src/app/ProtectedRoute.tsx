import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuthSessionStore } from '@/features/auth'

// Wraps any routes that require authentication.
//
// Usage in router.tsx:
//   { element: <ProtectedRoute />, children: [
//     { path: '/dashboard', element: <DashboardPage /> },
//   ]}
//
// How it works:
//   - Reads isAuthenticated from Zustand (in-memory — resets on hard refresh).
//   - On a hard refresh, isAuthenticated is false. The redirect to /login fires
//     immediately. However, the refresh interceptor in apiClient.ts will silently
//     restore the session on the first protected API call. This means the user
//     sees /login briefly on hard refresh until the token is restored.
//
// Considered alternative: call /auth/refresh eagerly on app load.
//   That would avoid the /login flash on hard refresh. It adds complexity —
//   every protected page needs to wait for the refresh before rendering.
//   Deferred until it becomes a real UX issue; document it here for the next dev.
//
// `from` in location state lets LoginPage know where to send the user after login.

export function ProtectedRoute() {
  const isAuthenticated = useAuthSessionStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
