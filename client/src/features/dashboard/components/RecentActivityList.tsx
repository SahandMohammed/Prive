import type { DashboardRecentActivity } from '../types/dashboard.types'
import { formatRelativeTime } from '../utils/dashboard.utils'
import { UserCheck } from 'lucide-react'

interface RecentActivityListProps {
  activities?: DashboardRecentActivity[]
  isLoading?: boolean
}

export function RecentActivityList({ activities, isLoading }: RecentActivityListProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs hover:shadow-sm transition-all flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-base font-heading font-semibold text-foreground">
            Recent Activity
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Team actions and audit trail
          </p>
        </div>
        <UserCheck className="h-4 w-4 text-muted-foreground" />
      </div>

      <div className="flex-1">
        {isLoading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 bg-muted/40 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : !activities || activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground border border-dashed border-border rounded-lg">
            No recent activity recorded for this branch.
          </div>
        ) : (
          <div className="space-y-2.5">
            {activities.map((act) => {
              const initials = act.username.slice(0, 2).toUpperCase()

              return (
                <div
                  key={act.id}
                  className="flex items-center justify-between gap-3 text-xs py-1.5 px-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold text-[10px] flex items-center justify-center shrink-0">
                      {initials}
                    </div>

                    <div className="truncate">
                      <span className="font-semibold text-foreground">{act.username}</span>{' '}
                      <span className="text-muted-foreground">{act.action}</span>{' '}
                      <span className="font-medium text-foreground">{act.documentNumber}</span>
                      {act.description && (
                        <span className="text-muted-foreground/80 text-[11px] block truncate">
                          {act.description}
                        </span>
                      )}
                    </div>
                  </div>

                  <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                    {formatRelativeTime(act.timestampUtc)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
