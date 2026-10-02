import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BriefcaseBusiness,
  Check,
  Package,
  PackagePlus,
  RotateCcw,
  Search,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Product } from '@/features/inventory'
import { formatNumber } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { SalesLineType } from '../types/sales.types'
import type {
  SalesCatalogItem,
  Service,
} from '../types/sales.types'
import type { SalesItemOption } from './SalesItemCombobox'

export interface AddSalesItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddItems: (items: SalesItemOption[]) => void
  items?: SalesCatalogItem[]
  services?: Service[]
  products?: Product[]
  rate?: number
  currencyCode?: string
  currencyDecimals?: number
}

type ItemTypeFilter = 'all' | 'services' | 'products'

export function AddSalesItemModal({
  open,
  onOpenChange,
  onAddItems,
  items: catalogItems,
  services = [],
  products = [],
  rate = 1,
  currencyCode = '',
  currencyDecimals = 2,
}: AddSalesItemModalProps) {
  const { t } = useTranslation(['sales', 'common'])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<ItemTypeFilter>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [selectedMap, setSelectedMap] = useState<Map<string, SalesItemOption>>(new Map())
  const selectAllRef = useRef<HTMLInputElement>(null)

  // Reset dialog state on opening
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- resetting dialog filter and selection state upon opening
      setSelectedMap(new Map())
      setSearch('')
      setTypeFilter('all')
      setSelectedCategory('')
    }
  }, [open])

  // Build unified item catalog from catalogItems, services, and products
  const allItems: SalesItemOption[] = useMemo(() => {
    const map = new Map<string, SalesItemOption>()

    if (catalogItems && catalogItems.length > 0) {
      catalogItems.forEach((item) => {
        map.set(`${item.type}-${item.id}`, {
          id: item.id,
          name: item.name,
          type: item.type,
          sku: item.sku ?? null,
          unitOfMeasureId: item.unitOfMeasureId ?? null,
          unitCode: item.unitCode ?? null,
          basePrice: item.basePrice,
          durationMinutes: item.durationMinutes ?? null,
          categoryId: item.categoryId ?? null,
          categoryName: item.categoryName ?? null,
          availableQuantity: item.availableQuantity ?? null,
          isActive: item.isActive,
        })
      })
    }

    services.forEach((s) => {
      const key = `${SalesLineType.Service}-${s.id}`
      if (!map.has(key)) {
        map.set(key, {
          id: s.id,
          name: s.name,
          type: SalesLineType.Service,
          sku: null,
          unitOfMeasureId: null,
          unitCode: null,
          basePrice: s.sellingPriceBase,
          durationMinutes: s.durationMinutes,
          categoryId: s.categoryId ?? null,
          categoryName: s.categoryName ?? null,
          availableQuantity: null,
          isActive: s.isActive,
        })
      }
    })

    products.forEach((p) => {
      const key = `${SalesLineType.Product}-${p.id}`
      if (!map.has(key)) {
        map.set(key, {
          id: p.id,
          name: p.name,
          type: SalesLineType.Product,
          sku: p.sku,
          unitOfMeasureId: p.unitOfMeasureId,
          unitCode: p.unitCode,
          basePrice: p.sellingPriceBase,
          durationMinutes: null,
          categoryId: p.categoryId ?? null,
          categoryName: p.categoryName ?? null,
          availableQuantity: p.totalQuantity ?? null,
          isActive: p.isActive,
        })
      }
    })

    return Array.from(map.values())
  }, [catalogItems, services, products])

  // Unique categories for filtering
  const categories = useMemo(() => {
    const set = new Set<string>()
    allItems.forEach((item) => {
      if (item.categoryName?.trim()) {
        set.add(item.categoryName.trim())
      }
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [allItems])

  // Counts by item type
  const serviceCount = useMemo(
    () => allItems.filter((item) => item.type === SalesLineType.Service).length,
    [allItems]
  )
  const productCount = useMemo(
    () => allItems.filter((item) => item.type === SalesLineType.Product).length,
    [allItems]
  )

  // Filtered items based on search, type filter, and category
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase()

    return allItems.filter((item) => {
      // Type filter
      if (typeFilter === 'services' && item.type !== SalesLineType.Service) return false
      if (typeFilter === 'products' && item.type !== SalesLineType.Product) return false

      // Category filter
      if (selectedCategory && item.categoryName !== selectedCategory) return false

      // Search query (matches name, SKU, or category)
      if (query) {
        const nameMatch = item.name.toLowerCase().includes(query)
        const skuMatch = item.sku?.toLowerCase().includes(query) ?? false
        const catMatch = item.categoryName?.toLowerCase().includes(query) ?? false
        return nameMatch || skuMatch || catMatch
      }

      return true
    })
  }, [allItems, search, typeFilter, selectedCategory])

  // Checkbox selection state
  const allVisibleSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedMap.has(item.id))
  const someVisibleSelected = filteredItems.some((item) => selectedMap.has(item.id))

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected && !allVisibleSelected
    }
  }, [someVisibleSelected, allVisibleSelected])

  const toggleSelectAllVisible = () => {
    setSelectedMap((prev) => {
      const next = new Map(prev)
      if (allVisibleSelected) {
        filteredItems.forEach((item) => next.delete(item.id))
      } else {
        filteredItems.forEach((item) => next.set(item.id, item))
      }
      return next
    })
  }

  const toggleItem = (item: SalesItemOption) => {
    setSelectedMap((prev) => {
      const next = new Map(prev)
      if (next.has(item.id)) {
        next.delete(item.id)
      } else {
        next.set(item.id, item)
      }
      return next
    })
  }

  const handleResetFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setSelectedCategory('')
  }

  const handleConfirm = () => {
    const itemsToAdd = Array.from(selectedMap.values())
    if (itemsToAdd.length > 0) {
      onAddItems(itemsToAdd)
    }
    onOpenChange(false)
  }

  const formatPrice = (basePrice: number) => {
    const converted = rate > 0 ? basePrice / rate : basePrice
    return formatNumber(converted, {
      minimumFractionDigits: currencyDecimals,
      maximumFractionDigits: currencyDecimals,
    })
  }

  const hasActiveFilters = Boolean(search || typeFilter !== 'all' || selectedCategory)
  const selectedCount = selectedMap.size

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden sm:max-w-4xl">
        {/* MODAL HEADER */}
        <DialogHeader className="border-b border-border/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PackagePlus className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold tracking-tight text-foreground">
                {t('sales:addItemsModal.title')}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {t('sales:addItemsModal.desc')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* FILTRATION TOOLBAR */}
        <div className="flex flex-col gap-3 border-b border-border/60 bg-muted/20 px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t('sales:addItemsModal.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 ps-8 pe-8 text-xs"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                aria-label={t('sales:addItemsModal.clearSearchAria')}
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Type Filter Buttons */}
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5 text-xs shadow-2xs">
              <button
                type="button"
                onClick={() => setTypeFilter('all')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  typeFilter === 'all'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('sales:addItemsModal.all', { count: allItems.length })}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('services')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  typeFilter === 'services'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <BriefcaseBusiness className="size-3" />
                {t('sales:addItemsModal.services', { count: serviceCount })}
              </button>
              <button
                type="button"
                onClick={() => setTypeFilter('products')}
                className={cn(
                  'flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  typeFilter === 'products'
                    ? 'bg-primary text-primary-foreground shadow-2xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Package className="size-3" />
                {t('sales:addItemsModal.products', { count: productCount })}
              </button>
            </div>

            {/* Category Filter Dropdown */}
            {categories.length > 0 && (
              <select
                aria-label={t('sales:addItemsModal.category')}
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-9 rounded-lg border border-border bg-card px-2.5 text-xs text-foreground shadow-2xs outline-none focus:border-ring focus:ring-1 focus:ring-ring/50"
              >
                <option value="">{t('sales:addItemsModal.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            )}

            {/* Reset Filters button */}
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 gap-1 text-xs text-muted-foreground hover:text-foreground"
                aria-label="Reset all filters"
              >
                <RotateCcw className="size-3" />
                {t('sales:addItemsModal.reset')}
              </Button>
            )}
          </div>
        </div>

        {/* ITEMS SELECTION TABLE */}
        <div className="max-h-[380px] overflow-y-auto">
          <Table className="w-full border-collapse">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-xs">
              <TableRow className="border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/80">
                <TableHead className="w-12 px-4 py-2.5 text-center">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    aria-label={t('sales:addItemsModal.selectAllAria')}
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                    className="size-4 cursor-pointer rounded border-border text-primary accent-primary focus:ring-primary"
                  />
                </TableHead>
                <TableHead className="min-w-[200px] px-4 py-2.5 text-start">{t('sales:addItemsModal.itemName')}</TableHead>
                <TableHead className="w-28 px-4 py-2.5 text-start">{t('sales:addItemsModal.type')}</TableHead>
                <TableHead className="min-w-[140px] px-4 py-2.5 text-start">{t('sales:addItemsModal.category')}</TableHead>
                <TableHead className="w-28 px-4 py-2.5 text-start">{t('sales:addItemsModal.unitOrDuration')}</TableHead>
                <TableHead className="w-32 px-4 py-2.5 text-end">{t('sales:addItemsModal.price')}</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-border/60">
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-12 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center justify-center space-y-2">
                      <Search className="size-8 text-muted-foreground/40" />
                      <p className="text-sm font-medium text-foreground">{t('sales:addItemsModal.noItemsFound')}</p>
                      <p className="text-xs text-muted-foreground">
                        {hasActiveFilters
                          ? t('sales:addItemsModal.adjustFilters')
                          : t('sales:addItemsModal.noCatalogItems')}
                      </p>
                      {hasActiveFilters && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleResetFilters}
                          className="mt-2 text-xs"
                        >
                          {t('sales:addItemsModal.clearFilters')}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((item) => {
                  const isSelected = selectedMap.has(item.id)
                  const isService = item.type === SalesLineType.Service

                  return (
                    <TableRow
                      key={`${item.type}-${item.id}`}
                      onClick={() => toggleItem(item)}
                      className={cn(
                        'cursor-pointer transition-colors hover:bg-muted/30',
                        isSelected && 'bg-primary/5 hover:bg-primary/10'
                      )}
                    >
                      {/* Checkbox */}
                      <TableCell
                        className="px-4 py-2.5 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          aria-label={`Select ${item.name}`}
                          checked={isSelected}
                          onChange={() => toggleItem(item)}
                          className="size-4 cursor-pointer rounded border-border text-primary accent-primary focus:ring-primary"
                        />
                      </TableCell>

                      {/* Name & SKU */}
                      <TableCell className="px-4 py-2.5 text-start">
                        <div className="flex flex-col">
                          <span
                            className={cn(
                              'text-xs font-medium text-foreground',
                              isSelected && 'font-semibold text-primary'
                            )}
                          >
                            {item.name}
                          </span>
                          {!isService && item.sku && (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              {t('sales:addItemsModal.skuLabel', { sku: item.sku })}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell className="px-4 py-2.5 text-start">
                        <Badge
                          variant={isService ? 'champagne' : 'outline'}
                          className="text-[10px] px-1.5 py-0 uppercase tracking-wider font-semibold"
                        >
                          {isService ? t('sales:addItemsModal.serviceBadge') : t('sales:addItemsModal.productBadge')}
                        </Badge>
                      </TableCell>

                      {/* Category */}
                      <TableCell className="px-4 py-2.5 text-start">
                        <span className="text-xs text-muted-foreground">
                          {item.categoryName || '—'}
                        </span>
                      </TableCell>

                      {/* Unit or Duration */}
                      <TableCell className="px-4 py-2.5 text-start">
                        {isService ? (
                          <span className="text-xs font-mono text-muted-foreground">
                            {item.durationMinutes ? t('sales:addItemsModal.durationMinutes', { count: item.durationMinutes }) : '—'}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-muted-foreground">
                            {item.unitCode ?? '—'}
                          </span>
                        )}
                      </TableCell>

                      {/* Unit Price */}
                      <TableCell className="px-4 py-2.5 text-end">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {formatPrice(item.basePrice)} {currencyCode}
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* MODAL FOOTER */}
        <DialogFooter className="flex flex-row items-center justify-between border-t border-border/60 bg-muted/20 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Badge
              variant={selectedCount > 0 ? 'default' : 'secondary'}
              className="font-mono text-xs"
            >
              {selectedCount === 1
                ? t('sales:addItemsModal.selectedCount_one', { count: selectedCount })
                : t('sales:addItemsModal.selectedCount_other', { count: selectedCount })}
            </Badge>

            {selectedCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMap(new Map())}
                className="h-7 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('sales:addItemsModal.clearSelection')}
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              {t('sales:addItemsModal.cancel')}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              className="gap-1.5 text-xs font-medium shadow-xs"
            >
              <Check className="size-3.5" />
              {selectedCount > 0
                ? (selectedCount === 1
                    ? t('sales:addItemsModal.addCount_one', { count: selectedCount })
                    : t('sales:addItemsModal.addCount_other', { count: selectedCount }))
                : t('sales:addItemsModal.addItems')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
