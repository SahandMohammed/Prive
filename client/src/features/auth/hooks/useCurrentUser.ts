import { useQuery } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { useAuthSessionStore } from '../stores/auth-session.store'

export const ME_QUERY_KEY = ['auth', 'me'] as const

export function useCurrentUser() {
  const isAuthenticated = useAuthSessionStore((s) => s.isAuthenticated)

  return useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authApi.me,
    enabled: isAuthenticated,
  })
}
