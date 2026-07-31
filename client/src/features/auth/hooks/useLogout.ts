import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { useAuthSessionStore } from '../stores/auth-session.store'
import { queryClient } from '@/lib/queryClient'

export function useLogout() {
  const clearSession = useAuthSessionStore((s) => s.clearSession)

  return useMutation({
    mutationFn: authApi.logout,
    // onSettled fires on both success AND error.
    // A failed /auth/logout request (network blip, 500) must not trap the user
    // in a logged-in state — they clicked logout and expect to be logged out.
    onSettled: () => {
      clearSession()
      queryClient.clear()
    },
  })
}
