import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronsUpDown, Search, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { Product } from '@/features/inventory'
import { formatNumber } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { SalesLineType } from '../types/sales.types'
import type { SalesCatalogItem, SalesLineType as SalesLineTypeValue, Service } from '../types/sales.types'

export interface SalesItemOption {
  id: string
  name: string
  type: SalesLineTypeValue
  sku?: string | null
  unitOfMeasureId?: string | null
  unitCode?: string | null
  basePrice: number
  durationMinutes?: number | null
  categoryId?: string | null
  categoryName?: string | null
  availableQuantity?: number | null
  isActive: boolean
}

export interface SalesItemComboboxProps {
  value?: string
  displayName?: string
  lineType?: SalesLineTypeValue
  onSelect: (item: SalesItemOption) => void
  onClear?: () => void
  items?: SalesCatalogItem[]
  services?: Service[]
  products?: Product[]
  rate?: number
  currencyCode?: string
  currencyDecimals?: number
  disabled?: boolean
  error?: string
  placeholder?: string
  'aria-label'?: string
  className?: string
}

export function SalesItemCombobox({
  value,
  displayName = '',
  lineType,
  onSelect,
  onClear,
  items: catalogItems,
  services = [],
  products = [],
  rate = 1,
  currencyCode = '',
  currencyDecimals = 2,
  disabled = false,
  error,
  placeholder,
  'aria-label': ariaLabel,
  className,
}: SalesItemComboboxProps) {
  const { t } = useTranslation(['sales', 'common'])
  const resolvedPlaceholder = placeholder ?? t('sales:combobox.placeholder')
  const resolvedAriaLabel = ariaLabel ?? t('sales:combobox.ariaLabel')
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 360 })

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()

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

  // Resolve currently selected item
  const selectedItem = useMemo(() => {
    if (!value) return null
    return allItems.find(
      (item) => item.id === value && (lineType === undefined || item.type === lineType)
    )
  }, [allItems, value, lineType])

  // Filter or curate initial suggestions
  const displayedItems = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) {
      // Curated initial suggestions: top 5 active services + top 5 active products
      const topServices = allItems
        .filter((item) => item.type === SalesLineType.Service && item.isActive)
        .slice(0, 5)
      const topProducts = allItems
        .filter((item) => item.type === SalesLineType.Product && item.isActive)
        .slice(0, 5)
      return [...topServices, ...topProducts]
    }

    return allItems
      .filter((item) => {
        const nameMatch = item.name.toLowerCase().includes(query)
        const skuMatch = item.sku?.toLowerCase().includes(query) ?? false
        return nameMatch || skuMatch
      })
      .slice(0, 20)
  }, [allItems, search])

  // Update floating dropdown position
  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 360),
      })
    }
  }

  useEffect(() => {
    if (open) {
      updatePosition()
      window.addEventListener('resize', updatePosition)
      window.addEventListener('scroll', updatePosition, true)
      return () => {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
      }
    }
  }, [open])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Reset highlight index when displayed list changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps keyboard navigation valid when filter results change
    setHighlightedIndex(0)
  }, [displayedItems.length])

  const handleSelect = (item: SalesItemOption) => {
    onSelect(item)
    setSearch('')
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClear?.()
    setSearch('')
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightedIndex((prev) => Math.min(prev + 1, displayedItems.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) {
        setOpen(true)
        return
      }
      setHighlightedIndex((prev) => Math.max(prev - 1, 0))
    } else if (event.key === 'Enter') {
      if (open && displayedItems[highlightedIndex]) {
        event.preventDefault()
        handleSelect(displayedItems[highlightedIndex])
      }
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      setSearch('')
    }
  }

  const formatPrice = (basePrice: number) => {
    const converted = rate > 0 ? basePrice / rate : basePrice
    return formatNumber(converted, {
      minimumFractionDigits: currencyDecimals,
      maximumFractionDigits: currencyDecimals,
    })
  }

  const currentLabel = selectedItem
    ? `${selectedItem.name}${selectedItem.sku ? ` (${selectedItem.sku})` : ''}`
    : displayName || ''

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={resolvedAriaLabel}
          disabled={disabled}
          title={error}
          placeholder={currentLabel || resolvedPlaceholder}
          value={open ? search : currentLabel}
          onChange={(e) => {
            setSearch(e.target.value)
            if (!open) setOpen(true)
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true)
              updatePosition()
            }
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            'h-9 w-full rounded-lg border border-border bg-card px-3 pe-14 text-xs text-foreground shadow-2xs outline-none transition-colors placeholder:text-muted-foreground hover:border-input focus:border-ring focus:ring-1 focus:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-destructive focus:border-destructive ring-1 ring-destructive/30'
          )}
        />

        <div className="absolute end-2 flex items-center gap-1 text-muted-foreground">
          {Boolean(currentLabel || value) && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded p-0.5 hover:bg-muted hover:text-foreground transition-colors"
              aria-label={t('sales:combobox.clearAria')}
            >
              <X className="size-3.5" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                setOpen((prev) => !prev)
                inputRef.current?.focus()
              }
            }}
            className="rounded p-0.5 hover:text-foreground"
          >
            <ChevronsUpDown className="size-3.5" />
          </button>
        </div>
      </div>

      {/* FLOATING SUGGESTIONS DROPDOWN (PORTAL) */}
      {open &&
        createPortal(
          <div
            ref={listRef}
            id={listboxId}
            role="listbox"
            style={{
              position: 'fixed',
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 9999,
            }}
            className="max-h-72 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-lg animate-in fade-in-0 zoom-in-95"
          >
            {displayedItems.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-muted-foreground">
                <Search className="size-4 mx-auto mb-1.5 opacity-50" />
                {t('sales:combobox.noMatch')}
              </div>
            ) : (
              displayedItems.map((item, index) => {
                const isSelected = selectedItem?.id === item.id && selectedItem.type === item.type
                const isHighlighted = highlightedIndex === index
                const isService = item.type === SalesLineType.Service

                return (
                  <div
                    key={`${item.type}-${item.id}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-md px-2.5 py-2 transition-colors text-xs',
                      isHighlighted ? 'bg-muted text-foreground' : 'hover:bg-muted/60',
                      isSelected && 'bg-primary/10 text-primary font-medium'
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <Badge
                        variant={isService ? 'champagne' : 'outline'}
                        className="text-[9px] px-1 py-0 uppercase tracking-wider font-semibold shrink-0"
                      >
                        {isService ? t('sales:combobox.serviceBadge') : t('sales:combobox.productBadge')}
                      </Badge>
                      <div className="min-w-0 truncate">
                        <span className="font-medium text-foreground">{item.name}</span>
                        {!isService && item.sku && (
                          <span className="ms-1.5 font-mono text-[10px] text-muted-foreground">
                            ({item.sku})
                          </span>
                        )}
                        {isService && item.durationMinutes && (
                          <span className="ms-1.5 text-[10px] text-muted-foreground">
                            {t('sales:combobox.durationMinutes', { count: item.durationMinutes })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {formatPrice(item.basePrice)} {currencyCode}
                      </span>
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                  </div>
                )
              })
            )}

            {!search.trim() && allItems.length > displayedItems.length && (
              <div className="border-t border-border/50 mt-1 pt-1.5 px-2.5 pb-0.5 text-[10px] text-muted-foreground flex justify-between">
                <span>{t('sales:combobox.showingSuggestions')}</span>
                <span>{t('sales:combobox.typeToSearch')}</span>
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
