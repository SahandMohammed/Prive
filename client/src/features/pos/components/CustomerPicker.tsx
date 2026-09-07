import { useDeferredValue, useMemo, useState } from 'react'
import { Search, UserRound, X } from 'lucide-react'
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
  const [search, setSearch] = useState('')
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

  return (
    <div className="space-y-2 rounded-xl border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-background">
            <UserRound className="size-4 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Customer</p>
            <p className="truncate text-sm font-semibold">{customer?.name ?? 'Walk-in customer'}</p>
          </div>
        </div>
        {customer && (
          <Button type="button" variant="ghost" size="icon-xs" onClick={() => onChange(null)} aria-label="Clear customer">
            <X className="size-3.5" />
          </Button>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search customer or phone"
          className="h-9 pl-8 text-xs"
        />
      </div>
      <select
        aria-label="Select customer"
        value={customer?.id ?? ''}
        onChange={(event) => {
          const next = customers.find((item) => item.id === event.target.value) ?? null
          onChange(next)
        }}
        className="h-9 w-full rounded-md border bg-background px-2.5 text-xs outline-none focus:ring-2 focus:ring-ring"
      >
        <option value="">Walk-in · no customer</option>
        {customers.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}{item.primaryPhoneNumber ? ` · ${item.primaryPhoneNumber}` : ''}
          </option>
        ))}
      </select>
      {query.isError && <p className="text-[11px] text-destructive">{query.error.message}</p>}
    </div>
  )
}
