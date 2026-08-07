import { useQuery } from '@tanstack/react-query'
import { usersApi } from '../api/users.api'

export const USERS_QUERY_KEY = ['users'] as const

export function useUsers(page = 1, pageSize = 20, search?: string) {
  return useQuery({
    queryKey: [...USERS_QUERY_KEY, page, pageSize, search],
    queryFn: () => usersApi.list(page, pageSize, search),
  })
}
