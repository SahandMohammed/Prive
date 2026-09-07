import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { useCurrentUser } from '@/features/auth'
import { useBranchAccess } from '../hooks/useBranchAccess'
import { useBranchSelectionStore } from '../stores/branch-selection.store'

export function BranchWorkspace({ children }: { children: ReactNode }) {
  const { pathname } = useLocation()
  const { data: user } = useCurrentUser()
  const branches = useBranchAccess()
  const { userId, branchId, switching } = useBranchSelectionStore()
  // Setup and access management must remain reachable before the first branch exists.
  const isSetup = ['/settings/branches', '/settings/business', '/settings/currencies', '/users'].includes(pathname)
  const ready = !switching && !branches.isError && userId === user?.id && branches.data?.some(branch => branch.id === branchId)
  if (!isSetup && !ready) return <p role="status" className="py-8 text-sm text-muted-foreground">{branches.isPending || switching ? 'Loading branch workspace…' : 'Choose an accessible branch in the sidebar to continue.'}</p>
  return <div key={`${user?.id}:${branchId}`}>{children}</div>
}
