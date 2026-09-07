import { useBranchAccess, useBranchSelectionStore } from '@/features/business'
import { getTimeGreeting } from '../utils/dashboard.utils'
import { RotateCw } from 'lucide-react'

interface DashboardHeaderProps {
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function DashboardHeader({ onRefresh, isRefreshing }: DashboardHeaderProps) {
  const { branchId } = useBranchSelectionStore()
  const { data: branches } = useBranchAccess()
  const currentBranch = branches?.find((b) => b.id === branchId)

  const greeting = getTimeGreeting()
  const branchName = currentBranch?.name?.toUpperCase() ?? 'CURRENT BRANCH'

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date())

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border border-border shadow-xs hover:shadow-sm transition-all">
      <div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary/10 text-primary uppercase tracking-wider">
            {greeting}
          </span>
          <span className="text-xs text-muted-foreground/60">•</span>
          <span className="text-xs font-semibold text-foreground/80">
            {branchName}
          </span>
          <span className="text-xs text-muted-foreground/60">·</span>
          <span className="text-xs font-medium text-muted-foreground">
            {formattedDate}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-heading font-bold text-foreground mt-1">
          Business Overview
        </h1>
      </div>

      {onRefresh && (
        <button
          type="button"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-1.5 self-start sm:self-center px-3.5 py-1.5 text-xs font-medium rounded-lg border border-border/80 bg-background hover:bg-muted/70 text-foreground shadow-2xs transition-colors disabled:opacity-50"
          title="Refresh dashboard data"
        >
          <RotateCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          <span>Refresh</span>
        </button>
      )}
    </div>
  )
}
