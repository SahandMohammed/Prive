import { useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'
import { USERS_QUERY_KEY } from './useUsers'

export function useCreateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USERS_QUERY_KEY }),
  })
}
