import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableColumnHeaderProps {
  title: ReactNode
  canSort?: boolean
  isSorted?: 'asc' | 'desc' | false
  onSort?: () => void
  className?: string
  align?: 'left' | 'center' | 'right'
}

export function DataTableColumnHeader({
  title,
  canSort = false,
  isSorted = false,
  onSort,
  className,
  align = 'left',
}: DataTableColumnHeaderProps) {
  if (!canSort || !onSort) {
    return (
      <div
        className={cn(
          'flex items-center text-xs font-semibold tracking-wider uppercase',
          align === 'right' && 'justify-end text-right',
          align === 'center' && 'justify-center text-center',
          className
        )}
      >
        {title}
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onSort}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-sm py-1 text-xs font-semibold tracking-wider uppercase transition-colors select-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        isSorted ? 'text-foreground font-bold' : 'text-muted-foreground hover:text-foreground',
        align === 'right' && 'w-full justify-end',
        align === 'center' && 'w-full justify-center',
        className
      )}
      aria-sort={isSorted === 'asc' ? 'ascending' : isSorted === 'desc' ? 'descending' : 'none'}
    >
      <span>{title}</span>
      <span className="shrink-0">
        {isSorted === 'asc' ? (
          <ArrowUp className="size-3.5 text-primary stroke-[2.5]" aria-hidden="true" />
        ) : isSorted === 'desc' ? (
          <ArrowDown className="size-3.5 text-primary stroke-[2.5]" aria-hidden="true" />
        ) : (
          <ArrowUpDown
            className="size-3 text-muted-foreground/60 transition-opacity group-hover:text-foreground group-hover:opacity-100"
            aria-hidden="true"
          />
        )}
      </span>
    </button>
  )
}
