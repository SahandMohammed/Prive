import { useDeferredValue, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { usePosCustomers } from '../hooks/usePos'
import type { PosCustomer } from '../types/pos.types'

export function CustomerPicker({
  customer,
  onChange,
}: {
  customer: PosCustomer | null
  onChange: (customer: PosCustomer | null) => void
}) {
  const { t } = useTranslation(['pos', 'common'])
  const walkInLabel = t('pos:checkout.walkIn', { defaultValue: 'Walk-in customer' })
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(customer?.name ?? walkInLabel)
  const [search, setSearch] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const deferredSearch = useDeferredValue(search)
  const query = usePosCustomers({
    page: 1,
    pageSize: 20,
    search: deferredSearch.trim() || undefined,
  })
  const customers = useMemo(() => {
    const rows = query.data?.data ?? []
    if (!customer || rows.some((item) => item.id === customer.id)) return rows
    return [customer, ...rows]
  }, [customer, query.data?.data])
  const suggestions = useMemo(() => [null, ...customers] as Array<PosCustomer | null>, [customers])
  const selectedLabel = customer?.name ?? walkInLabel

  useEffect(() => {
    if (!open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restores the selected label after a cancelled search or external reset.
      setInputValue(selectedLabel)
      setSearch('')
    }
  }, [open, selectedLabel])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps keyboard navigation valid as suggestions change.
    setHighlightedIndex(0)
  }, [suggestions.length])

  const selectCustomer = (nextCustomer: PosCustomer | null) => {
    onChange(nextCustomer)
    setInputValue(nextCustomer?.name ?? walkInLabel)
    setSearch('')
    setOpen(false)
  }

  const showSuggestions = () => {
    setOpen(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) {
        showSuggestions()
        return
      }
      setHighlightedIndex((index) => Math.min(index + 1, suggestions.length - 1))
    } else if (event.key === 'ArrowUp' && open) {
      event.preventDefault()
      setHighlightedIndex((index) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter' && open) {
      event.preventDefault()
      selectCustomer(suggestions[highlightedIndex] ?? null)
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <label className="sr-only" htmlFor={listboxId}>
        {t('pos:checkout.customer', { defaultValue: 'Customer' })}
      </label>
      <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        id={listboxId}
        role="combobox"
        aria-autocomplete="list"
        aria-controls={`${listboxId}-options`}
        aria-expanded={open}
        aria-activedescendant={open ? `${listboxId}-option-${highlightedIndex}` : undefined}
        value={inputValue}
        onFocus={(event) => {
          setOpen(true)
          event.currentTarget.select()
        }}
        onBlur={() => setOpen(false)}
        onChange={(event) => {
          const value = event.target.value
          setInputValue(value)
          setSearch(value)
          setOpen(true)
          if (!value) onChange(null)
        }}
        onKeyDown={handleKeyDown}
        placeholder={t('pos:checkout.searchCustomerPlaceholder', { defaultValue: 'Search customer or phone' })}
        className="h-10 bg-background ps-9 pe-10 text-sm"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="absolute end-1 top-1/2 -translate-y-1/2"
        aria-label={t('pos:checkout.showCustomerSuggestions', { defaultValue: 'Show customer suggestions' })}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          if (open) setOpen(false)
          else showSuggestions()
        }}
      >
        <ChevronDown className="size-4" />
      </Button>
      {open && (
        <div
          id={`${listboxId}-options`}
          role="listbox"
          aria-label={t('pos:checkout.customerSuggestions', { defaultValue: 'Customer suggestions' })}
          className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-sm shadow-md"
        >
          {suggestions.map((item, index) => {
            const selected = item?.id === customer?.id || (!item && !customer)
            const label = item?.name ?? walkInLabel

            return (
              <button
                key={item?.id ?? 'walk-in'}
                id={`${listboxId}-option-${index}`}
                type="button"
                role="option"
                aria-selected={selected}
                className={`flex w-full items-center gap-2 rounded-sm px-2.5 py-2 text-start outline-none ${
                  index === highlightedIndex
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                }`}
                onMouseDown={(event) => {
                  event.preventDefault()
                  selectCustomer(item)
                }}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {item?.primaryPhoneNumber && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {item.primaryPhoneNumber}
                  </span>
                )}
                {selected && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })}
          {query.isPending && (
            <p className="px-2.5 py-2 text-xs text-muted-foreground">
              {t('pos:checkout.searchingCustomers', { defaultValue: 'Searching customers…' })}
            </p>
          )}
          {query.isError && (
            <p className="px-2.5 py-2 text-xs text-destructive">{query.error.message}</p>
          )}
        </div>
      )}
    </div>
  )
}
