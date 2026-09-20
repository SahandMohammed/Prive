import { useBranchAccess, useBranchSelectionStore } from '@/features/business'
import { useCurrentUser } from '@/features/auth'
import { RotateCw } from 'lucide-react'

interface DashboardHeaderProps {
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DashboardHeader({ onRefresh, isRefreshing }: DashboardHeaderProps) {
  const { branchId } = useBranchSelectionStore()
  const { data: branches } = useBranchAccess()
  const { data: user } = useCurrentUser()
  const currentBranch = branches?.find((b) => b.id === branchId)

  const userName = user?.username ? user.username.split(' ')[0] : 'there'
  const branchName = currentBranch?.name?.toUpperCase() ?? 'MAIN BRANCH'

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold font-heading text-foreground tracking-tight">
          Business Overview
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Welcome back, {userName}. Here's what's happening with your business today • {branchName}.
        </p>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 self-start sm:self-center px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-card hover:bg-neutral-50 dark:hover:bg-neutral-800 text-foreground shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          title="Refresh dashboard data"
        >
          <RotateCw className={`size-3.5 ${isRefreshing ? 'animate-spin text-foreground' : 'text-muted-foreground'}`} />
          <span>Refresh</span>
        </button>
      )}
    </div>
  )
}
