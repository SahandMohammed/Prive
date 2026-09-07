import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from '@/features/auth'
import { businessApi } from '../api/business.api'

export function useBranchAccess() {
  const { data: user } = useCurrentUser()
  return useQuery({
    queryKey: ['branch-access', user?.id],
    queryFn: businessApi.listAccessibleBranches,
    enabled: !!user,
    staleTime: 0,
  })
}
