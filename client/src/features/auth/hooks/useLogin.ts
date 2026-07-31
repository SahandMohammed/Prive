import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import { useAuthSessionStore } from '../stores/auth-session.store'

export function useLogin() {
  const setSession = useAuthSessionStore((s) => s.setSession)

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) =>
      setSession(data.accessToken, data.accessTokenExpiresAtUtc, data.mustChangePassword),
  })
}
