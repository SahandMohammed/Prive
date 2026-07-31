import { Navigate, Outlet } from 'react-router-dom'
import { useAuthSessionStore } from '@/features/auth'

// Wraps routes that should not be accessible when already authenticated
// (e.g. /login). Redirects authenticated users to /dashboard.
//
// Without this, a logged-in user navigating to /login would see the login form,
// which is confusing and potentially lets them create a second session.

export function PublicOnlyRoute() {
  const isAuthenticated = useAuthSessionStore((s) => s.isAuthenticated)

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
