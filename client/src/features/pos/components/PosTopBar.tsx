import { useEffect, useState } from 'react'
import { Clock3, FileText, History, LogOut, Store, Wifi, WifiOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PosBranch, PosSession, PosWarehouse } from '../types/pos.types'

export function PosTopBar({
  branch,
  session,
  warehouses,
  warehouseId,
  cashier,
  onWarehouseChange,
  onXReport,
  onCloseSession,
  onHistory,
  onExit,
}: {
  branch: PosBranch | undefined
  session: PosSession
  warehouses: PosWarehouse[]
  warehouseId: string
  cashier: string
  onWarehouseChange: (warehouseId: string) => void
  onXReport: () => void
  onCloseSession: () => void
  onHistory: () => void
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
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b bg-card px-3 py-2 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground text-background">
          <Store className="size-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <p className="font-semibold tracking-tight">PRIVÉ POS</p>
            <span className="hidden text-xs text-muted-foreground sm:inline">{session.sessionNumber}</span>
          </div>
          <p className="truncate text-xs text-muted-foreground">
            {branch ? `${branch.code} — ${branch.name}` : 'Selected branch'} · {session.registerCode}
          </p>
        </div>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {warehouses.length > 1 ? (
          <select
            aria-label="Product warehouse"
            value={warehouseId}
            onChange={(event) => onWarehouseChange(event.target.value)}
            className="hidden h-9 max-w-52 rounded-lg border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-ring xl:block"
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>
                {warehouse.code} — {warehouse.name}
              </option>
            ))}
          </select>
        ) : warehouses[0] ? (
          <span className="hidden max-w-48 truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground xl:inline">
            {warehouses[0].code} — {warehouses[0].name}
          </span>
        ) : null}

        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5 text-destructive" />}
          <span>{online ? 'Online' : 'Offline'}</span>
        </div>
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground md:flex">
          <Clock3 className="size-3.5" />
          <span>{duration(session.openedAtUtc, now)}</span>
        </div>
        <div className="hidden max-w-32 truncate rounded-full bg-muted px-3 py-1.5 text-xs font-medium lg:block">
          {cashier}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={onHistory} title="POS session history">
          <History className="size-4" />
          <span className="hidden 2xl:inline">History</span>
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onXReport}>
          <FileText className="size-4" />
          <span className="hidden sm:inline">X Report</span>
        </Button>
        <Button type="button" size="sm" onClick={onCloseSession}>
          <span className="hidden sm:inline">Close Session</span>
          <span className="sm:hidden">Close</span>
        </Button>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onExit} title="Exit POS">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  )
}

function duration(openedAtUtc: string, now: Date) {
  const elapsed = Math.max(0, now.getTime() - new Date(openedAtUtc).getTime())
  const hours = Math.floor(elapsed / 3_600_000)
  const minutes = Math.floor((elapsed % 3_600_000) / 60_000)
  return `${hours}h ${minutes}m`
}
