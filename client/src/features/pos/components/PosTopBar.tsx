import { useEffect, useState } from 'react'
import { LogOut, Store, Wifi, WifiOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import type { PosBranch, PosWarehouse } from '../types/pos.types'

export function PosTopBar({
  branch,
  warehouses,
  warehouseId,
  operator,
  onWarehouseChange,
  onExit,
}: {
  branch: PosBranch | undefined
  warehouses: PosWarehouse[]
  warehouseId: string
  operator: string
  onWarehouseChange: (warehouseId: string) => void
  onExit: () => void
}) {
  const { t } = useTranslation(['pos', 'common'])
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' || navigator.onLine)

  useEffect(() => {
    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
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
          <p className="font-semibold tracking-tight">{t('pos:topBar.appName')}</p>
          <p className="truncate text-xs text-muted-foreground">
            {branch ? `${branch.code} — ${branch.name}` : t('common:selectedBranch', 'Selected branch')}
          </p>
        </div>
      </div>

      <div className="ms-auto flex min-w-0 items-center gap-2">
        {warehouses.length > 1 ? (
          <select
            aria-label={t('pos:topBar.warehouse')}
            value={warehouseId}
            onChange={(event) => onWarehouseChange(event.target.value)}
            className="hidden h-9 max-w-52 rounded-lg border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-ring xl:block"
          >
            {warehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.code} — {warehouse.name}</option>
            ))}
          </select>
        ) : warehouses[0] ? (
          <span className="hidden max-w-48 truncate rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground xl:inline">
            {warehouses[0].code} — {warehouses[0].name}
          </span>
        ) : null}

        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground lg:flex">
          {online ? <Wifi className="size-3.5" /> : <WifiOff className="size-3.5 text-destructive" />}
          <span>{online ? t('pos:topBar.online') : t('pos:topBar.offline')}</span>
        </div>
        <div className="hidden max-w-32 truncate rounded-full bg-muted px-3 py-1.5 text-xs font-medium lg:block">
          {operator}
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={onExit} title={t('pos:topBar.exitPos')}>
          <LogOut className="size-4 rtl:rotate-180" />
        </Button>
      </div>
    </header>
  )
}
