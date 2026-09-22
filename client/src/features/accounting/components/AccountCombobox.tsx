import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronsUpDown, X } from 'lucide-react'
import {
  accountClassificationLabels,
  type Account,
  type AccountClassification,
} from '../types/accounting.types'

interface AccountComboboxProps {
  accounts: Account[]
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: boolean
  placeholder?: string
}

export function AccountCombobox({
  accounts,
  value,
  onChange,
  disabled = false,
  error = false,
  placeholder = 'Type code or name...',
}: AccountComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 320 })

  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === value),
    [accounts, value]
  )

  // Sync display text when value changes from outside or reset
  useEffect(() => {
    if (selectedAccount) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors an externally controlled value in the input label.
      setQuery(`${selectedAccount.code} — ${selectedAccount.name}`)
    } else if (!value) {
      setQuery('')
    }
  }, [selectedAccount, value])

  const updatePosition = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
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

  const filteredAccounts = useMemo(() => {
    if (!query.trim()) return accounts
    const term = query.toLowerCase()
    return accounts.filter((account) => {
      const codeMatch = account.code.toLowerCase().includes(term)
      const nameMatch = account.name.toLowerCase().includes(term)
      const fullMatch = `${account.code} — ${account.name}`.toLowerCase().includes(term)
      const classMatch = (accountClassificationLabels[account.classification] ?? '')
        .toLowerCase()
        .includes(term)
      return codeMatch || nameMatch || fullMatch || classMatch
    })
  }, [accounts, query])

  // Reset highlight index when results change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps keyboard selection valid after the result list changes.
    setHighlightedIndex(0)
  }, [filteredAccounts.length])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        listRef.current &&
        !listRef.current.contains(target)
      ) {
        setOpen(false)
        if (selectedAccount) {
          setQuery(`${selectedAccount.code} — ${selectedAccount.name}`)
        } else {
          setQuery('')
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [selectedAccount])

  const selectAccount = (account: Account) => {
    onChange(account.id)
    setQuery(`${account.code} — ${account.name}`)
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    setQuery('')
    setOpen(true)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault()
        setOpen(true)
        updatePosition()
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightedIndex((prev) =>
        prev < filteredAccounts.length - 1 ? prev + 1 : prev
      )
      scrollHighlightedIntoView(highlightedIndex + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
      scrollHighlightedIntoView(highlightedIndex - 1)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const account = filteredAccounts[highlightedIndex]
      if (account) {
        selectAccount(account)
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      if (selectedAccount) {
        setQuery(`${selectedAccount.code} — ${selectedAccount.name}`)
      }
    } else if (e.key === 'Tab') {
      const account = filteredAccounts[highlightedIndex]
      if (account && open) {
        selectAccount(account)
      }
      setOpen(false)
    }
  }

  const scrollHighlightedIntoView = (index: number) => {
    const list = listRef.current
    if (!list) return
    const item = list.children[index] as HTMLElement
    if (item) {
      item.scrollIntoView({ block: 'nearest' })
    }
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          ref={inputRef}
          type="text"
          value={query}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            setOpen(true)
            updatePosition()
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
            updatePosition()
            if (!e.target.value) {
              onChange('')
            }
          }}
          onKeyDown={handleKeyDown}
          className={`h-9 w-full rounded-md border bg-white pl-2.5 pr-14 text-xs shadow-xs outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:focus:border-slate-600 ${
            error ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200'
          } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {query && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={handleClear}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <X className="size-3" />
            </button>
          )}
          <button
            type="button"
            tabIndex={-1}
            disabled={disabled}
            onClick={() => {
              if (!disabled) {
                const nextOpen = !open
                setOpen(nextOpen)
                if (nextOpen) {
                  updatePosition()
                  inputRef.current?.focus()
                }
              }
            }}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <ChevronsUpDown className="size-3.5" />
          </button>
        </div>
      </div>

      {/* DROPDOWN OPTIONS LIST RENDERED VIA PORTAL TO PREVENT CLIPPING */}
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={listRef}
            style={{
              position: 'fixed',
              top: `${dropdownPosition.top}px`,
              left: `${dropdownPosition.left}px`,
              width: `${dropdownPosition.width}px`,
              zIndex: 99999,
            }}
            className="max-h-60 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 text-xs shadow-xl dark:border-slate-800 dark:bg-slate-900"
          >
            {filteredAccounts.length === 0 ? (
              <div className="p-3 text-center text-slate-400">
                No matching accounts found.
              </div>
            ) : (
              filteredAccounts.map((account, index) => {
                const isSelected = account.id === value
                const isHighlighted = index === highlightedIndex

                return (
                  <div
                    key={account.id}
                    onMouseDown={(e) => {
                      e.preventDefault() // Prevent blur before selection
                      selectAccount(account)
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`flex cursor-pointer items-center justify-between gap-2 rounded-md px-2.5 py-2 transition-colors ${
                      isHighlighted
                        ? 'bg-slate-100 dark:bg-slate-800'
                        : isSelected
                        ? 'bg-primary/5 text-primary'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                        {account.code}
                      </span>
                      <span className="truncate text-slate-700 dark:text-slate-300">
                        {account.name}
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <ClassificationPill classification={account.classification} />
                      {isSelected && <Check className="size-3.5 text-primary" />}
                    </div>
                  </div>
                )
              })
            )}
          </div>,
          document.body
        )}
    </div>
  )
}

function ClassificationPill({ classification }: { classification: AccountClassification }) {
  switch (classification) {
    case 0:
      return (
        <span className="inline-flex rounded bg-emerald-50 px-1.5 py-0.2 text-[10px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          Asset
        </span>
      )
    case 1:
      return (
        <span className="inline-flex rounded bg-amber-50 px-1.5 py-0.2 text-[10px] font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          Liab
        </span>
      )
    case 2:
      return (
        <span className="inline-flex rounded bg-purple-50 px-1.5 py-0.2 text-[10px] font-medium text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
          Equity
        </span>
      )
    case 3:
      return (
        <span className="inline-flex rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
          Rev
        </span>
      )
    case 4:
      return (
        <span className="inline-flex rounded bg-rose-50 px-1.5 py-0.2 text-[10px] font-medium text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
          Exp
        </span>
      )
    case 5:
      return (
        <span className="inline-flex rounded bg-cyan-50 px-1.5 py-0.2 text-[10px] font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
          Contra
        </span>
      )
    default:
      return null
  }
}
