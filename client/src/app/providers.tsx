import { type ReactNode, useEffect, useState } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { initAuthSession, tryRestoreSession } from '@/features/auth'

// Wire auth session handlers into apiClient once — before any render.
// This is synchronous and must run before the router mounts so the interceptor
// has its callbacks ready for any request made during initial render.
initAuthSession()

export function Providers({ children }: { children: ReactNode }) {
  // Block rendering until we've attempted to restore the session from the
  // httpOnly refresh cookie. Without this gate, ProtectedRoute would see
  // isAuthenticated=false and redirect to /login even for users who have a
  // perfectly valid session — they'd see a flash of /login on every hard refresh.
  const [ready, setReady] = useState(false)

  useEffect(() => {
    tryRestoreSession().finally(() => setReady(true))
  }, [])

  if (!ready) {
    // Minimal full-screen loading state — keeps the DOM stable while the
    // single /auth/refresh request completes (~100–300 ms on a local network).
    // Replace with a branded spinner if desired.
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    )
  }

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
