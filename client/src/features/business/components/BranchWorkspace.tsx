import { useEffect, type ReactNode } from 'react'
import { useIsMutating } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { useCurrentUser } from '@/features/auth'
import { registerBranchAccessHandler } from '@/lib/apiClient'
import { useBranchAccess } from '../hooks/useBranchAccess'
import {
  rememberedBranch,
  selectBranch,
  useBranchSelectionStore,
} from '../stores/branch-selection.store'

export function BranchWorkspace({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { data: user } = useCurrentUser()
  const branches = useBranchAccess()
  const { userId, branchId, switching } = useBranchSelectionStore()
  const pendingMutations = useIsMutating()
  const { refetch } = branches

  useEffect(() => {
    registerBranchAccessHandler(() => { void refetch() })
    return () => registerBranchAccessHandler(null)
  }, [refetch])

  useEffect(() => {
    if (!user || !branches.data || branches.isError || switching || pendingMutations > 0) return
    if (userId === user.id && branchId && branches.data.some(branch => branch.id === branchId)) return

    if (!branches.data.length) {
      if (branchId) void selectBranch(user.id, null)
      return
    }

    const remembered = userId === user.id ? branchId : rememberedBranch(user.id)
    const accessibleRemembered = branches.data.find(branch => branch.id === remembered)
    const mainBranch = branches.data.find(branch => branch.isMainBranch)
    const next = accessibleRemembered ?? mainBranch ?? branches.data[0]

    void selectBranch(user.id, next?.id ?? null)
  }, [user, branches.data, branches.isError, userId, branchId, switching, pendingMutations])

  // Setup and access management must remain reachable before the first branch exists.
  const isSetup = ['/settings/branches', '/settings/business', '/settings/currencies', '/users'].includes(pathname)
  const ready = !switching
    && !branches.isError
    && userId === user?.id
    && branches.data?.some(branch => branch.id === branchId)

  if (!isSetup && !ready) {
    return (
      <p role="status" className="py-8 text-sm text-muted-foreground">
        {branches.isPending || switching
          ? 'Loading branch workspace…'
          : 'Choose an accessible branch in the sidebar to continue.'}
      </p>
    )
  }

  return <div key={`${user?.id}:${branchId}`}>{children}</div>
}
