import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import { USERS_QUERY_KEY } from './useUsers'
import type { ResetPasswordRequest } from '../types/users.types'

export function useResetPassword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, ...body }: ResetPasswordRequest & { userId: string }) =>
      usersApi.resetPassword(userId, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  })
}
