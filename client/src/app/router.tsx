import { createBrowserRouter, Navigate } from 'react-router-dom'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'
import { AppLayout } from '@/components/layout/AppLayout'
import { LoginPage } from '@/features/auth'
import { DashboardPage } from '@/features/dashboard'

// ---------------------------------------------------------------------------
// Route structure
//
//  /                    → redirect to /dashboard
//  /login               → LoginPage (public only — redirects to /dashboard if authed)
//  /dashboard           → protected placeholder (replace with DashboardPage)
//
// To add a new protected page:
//   1. Create the page component in features/<name>/pages/
//   2. Export it from features/<name>/index.ts
//   3. Import and add it under the ProtectedRoute children array below
// ---------------------------------------------------------------------------

export const router = createBrowserRouter([
  // Root redirect — always send / to /dashboard
  { path: '/', element: <Navigate to="/dashboard" replace /> },

  // Public-only routes (redirect to /dashboard if already authenticated)
  {
    element: <PublicOnlyRoute />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },

  // Protected routes (redirect to /login if not authenticated)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/dashboard', element: <DashboardPage /> },
        ],
      },
    ],
  },
])
