import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { useAuthSessionStore } from '../stores/auth-session.store'
import { queryClient } from '@/lib/queryClient'

export function useLogout() {
  const clearSession = useAuthSessionStore((s) => s.clearSession)

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      clearSession()
      queryClient.clear()
    },
  })
}
