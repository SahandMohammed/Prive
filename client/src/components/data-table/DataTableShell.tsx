import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface DataTableShellProps {
  children: ReactNode
  className?: string
}

/**
 * Shared visual frame for index/list tables. Table columns and row content stay
 * feature-owned, while the surrounding surface remains consistent everywhere.
 */
export function DataTableShell({ children, className }: DataTableShellProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl border border-border bg-card shadow-2xs', className)}>
      {children}
    </div>
  )
}
