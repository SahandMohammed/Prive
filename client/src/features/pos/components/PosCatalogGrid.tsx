import {
  BriefcaseBusiness,
  ChevronLeft,
  ChevronRight,
  Package,
  Plus,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCatalogItem } from '../types/pos.types'

interface CatalogMeta {
  page: number
  totalPages: number
  totalCount: number
  hasPreviousPage: boolean
  hasNextPage: boolean
}

export function PosCatalogGrid({
  items,
  baseCurrencyCode,
  search,
  warehouseSelected,
  loading,
  errorMessage,
  meta,
  onSearchChange,
  onAdd,
  onPreviousPage,
  onNextPage,
}: {
  items: PosCatalogItem[]
  baseCurrencyCode: string
  search: string
  warehouseSelected: boolean
  loading: boolean
  errorMessage?: string
  meta?: CatalogMeta
  onSearchChange: (value: string) => void
  onAdd: (item: PosCatalogItem) => void
  onPreviousPage: () => void
  onNextPage: () => void
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
      <div className="shrink-0 border-b p-3 sm:p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search service, product, SKU or barcode"
            className="h-11 rounded-xl pl-9 text-sm"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-2xl border bg-muted/50" />
            ))}
          </div>
        ) : errorMessage ? (
          <div className="grid h-64 place-items-center rounded-2xl border border-dashed px-6 text-center text-sm text-destructive">
            {errorMessage}
          </div>
        ) : items.length === 0 ? (
          <div className="grid h-64 place-items-center rounded-2xl border border-dashed px-6 text-center text-sm text-muted-foreground">
            No matching services or products.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => {
              const isProduct = item.itemType === PosCatalogItemType.Product
              const unavailable =
                isProduct && (!warehouseSelected || (item.availableQuantity ?? 0) <= 0)
              return (
                <button
                  key={`${item.itemType}-${item.id}`}
                  type="button"
                  disabled={unavailable}
                  onClick={() => onAdd(item)}
                  className="group flex min-h-44 flex-col overflow-hidden rounded-2xl border bg-card text-left shadow-xs transition hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-45"
                >
                  <div className="flex h-20 items-center justify-center overflow-hidden border-b bg-muted/30">
                    {item.imageReference ? (
                      <img src={item.imageReference} alt="" className="h-full w-full object-cover" />
                    ) : isProduct ? (
                      <Package className="size-8 text-muted-foreground/60" />
                    ) : (
                      <BriefcaseBusiness className="size-8 text-muted-foreground/60" />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-3">
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={cn(
                          'rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                          isProduct
                            ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300'
                            : 'bg-violet-500/10 text-violet-700 dark:text-violet-300'
                        )}
                      >
                        {isProduct ? 'Product' : 'Service'}
                      </span>
                      <Plus className="size-4 text-muted-foreground transition group-hover:text-foreground" />
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-semibold leading-snug">{item.name}</p>
                    <p className="mt-1 truncate text-[11px] text-muted-foreground">
                      {item.sku ? `${item.sku} · ` : ''}{item.categoryName}
                    </p>
                    <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                      <span className="font-mono text-sm font-bold">
                        {amount(item.unitPriceBase)} {baseCurrencyCode}
                      </span>
                      {isProduct && (
                        <span
                          className={cn(
                            'text-[10px] font-medium',
                            (item.availableQuantity ?? 0) > 0
                              ? 'text-emerald-700 dark:text-emerald-400'
                              : 'text-destructive'
                          )}
                        >
                          {amount(item.availableQuantity ?? 0)} available
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <footer className="flex h-14 shrink-0 items-center justify-between border-t px-3 text-xs sm:px-4">
        <span className="text-muted-foreground">{meta?.totalCount ?? 0} items</span>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!meta?.hasPreviousPage}
            onClick={onPreviousPage}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-16 text-center font-mono">
            {meta?.page ?? 1} / {Math.max(meta?.totalPages ?? 1, 1)}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            disabled={!meta?.hasNextPage}
            onClick={onNextPage}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </footer>
    </section>
  )
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
