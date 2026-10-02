import type { ComponentProps } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTablePaginationProps {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
}

export function DataTablePagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}: DataTablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))
  const currentPage = Math.min(Math.max(page, 1), totalPages)

  return (
    <div className="flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">{totalItems} result{totalItems === 1 ? '' : 's'}</p>
      <div className="flex items-center justify-between gap-4 sm:justify-end">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Rows per page:
          <select
            className="h-8 cursor-pointer rounded-lg border border-border bg-card px-2 text-xs text-foreground shadow-2xs outline-none focus:border-ring"
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-1.5">
          <PaginationButton label="First page" disabled={currentPage === 1} onClick={() => onPageChange(1)}><ChevronsLeft /></PaginationButton>
          <PaginationButton label="Previous page" disabled={currentPage === 1} onClick={() => onPageChange(currentPage - 1)}><ChevronLeft /></PaginationButton>
          <span className="min-w-12 text-center text-xs text-foreground font-medium">{currentPage} / {totalPages}</span>
          <PaginationButton label="Next page" disabled={currentPage === totalPages} onClick={() => onPageChange(currentPage + 1)}><ChevronRight /></PaginationButton>
          <PaginationButton label="Last page" disabled={currentPage === totalPages} onClick={() => onPageChange(totalPages)}><ChevronsRight /></PaginationButton>
        </div>
      </div>
    </div>
  )
}

function PaginationButton({ label, children, ...props }: ComponentProps<typeof Button> & { label: string }) {
  return <Button variant="outline" size="sm" className="h-8 w-8 rounded-lg p-0" aria-label={label} {...props}>{children}</Button>
}
