import { useQuery } from '@tanstack/react-query'
import { usersApi } from '@/features/users'
import { useAuthSessionStore } from '../stores/auth-session.store'

// Query key lives here, not in users/, because "current user" is an auth
// concern — it changes when the session changes, not when user data changes.
export const ME_QUERY_KEY = ['users', 'me'] as const

export function useCurrentUser() {
  const isAuthenticated = useAuthSessionStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: usersApi.me,
    // isAuthenticated alone is the correct gate.
    enabled: isAuthenticated,
  })
}
