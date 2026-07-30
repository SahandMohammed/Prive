import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export const USERS_QUERY_KEY = ['users'] as const

export function useUsers() {
  return useQuery({
    queryKey: USERS_QUERY_KEY,
    queryFn: usersApi.list,
  })
}
