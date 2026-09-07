import { useEffect, useState } from 'react'
import { Clock3, LogOut, Store, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PosBranch, PosWarehouse } from '../types/pos.types'

export function PosTopBar({
  branch,
  warehouses,
  warehouseId,
  cashier,
  onWarehouseChange,
  onExit,
}: {
  branch: PosBranch | undefined
  warehouses: PosWarehouse[]
  warehouseId: string
  cashier: string
  onWarehouseChange: (warehouseId: string) => void
  onExit: () => void
}) {
  const [now, setNow] = useState(() => new Date())
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30_000)
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-card px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background">
          <Store className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-semibold tracking-tight">PRIVÉ POS</p>
            <span className="hidden text-xs text-muted-foreground sm:inline">Checkout workspace</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {branch ? `${branch.code} — ${branch.name}` : 'Selected branch'}
          </p>
        </div>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        {warehouses.length > 1 ? (
          <select
            aria-label="Product warehouse"
            value={warehouseId}
            onChange={(event) => onWarehouseChange(event.target.value)}
            className="hidden h-9 max-w-52 rounded-lg border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-ring lg:block"
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        ) : warehouses[0] ? (
          <span className="hidden max-w-48 truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground lg:inline">
            {warehouses[0].code} — {warehouses[0].name}
          </span>
        ) : null}

        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5 text-destructive" />}
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Clock3 className="size-3.5" />
          <span>{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="hidden max-w-36 truncate rounded-full bg-muted px-3 py-1.5 text-xs font-medium md:block">
          {cashier}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onExit}>
          <LogOut className="size-4" />
          <span className="hidden sm:inline">Exit POS</span>
        </Button>
      </div>
    </header>
  )
}
