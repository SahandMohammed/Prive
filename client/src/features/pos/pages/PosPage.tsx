import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useCurrentUser } from '@/features/auth'
import { useBranchSelectionStore } from '@/features/business'
import { CheckoutDialog } from '../components/CheckoutDialog'
import { CloseSessionScreen } from '../components/CloseSessionScreen'
import { OpenSessionScreen } from '../components/OpenSessionScreen'
import { PosCart } from '../components/PosCart'
import { PosCatalogGrid } from '../components/PosCatalogGrid'
import { PosCategoryNav } from '../components/PosCategoryNav'
import { PosTopBar } from '../components/PosTopBar'
import { SaleCompleteDialog } from '../components/SaleCompleteDialog'
import { SessionClosedScreen } from '../components/SessionClosedScreen'
import { XReportDialog } from '../components/XReportDialog'
import {
  useActivePosSession,
  usePosCatalog,
  usePosRegisters,
  usePosSetup,
} from '../hooks/usePos'
import { addCatalogItemToCart, posCartTotal } from '../lib/posCart'
import { PosCatalogItemType } from '../types/pos.types'
import type {
  PosCartLine,
  PosCatalogItem,
  PosCategory,
  PosCustomer,
  PosSale,
  PosSession,
  PosSetup,
  PosZReport,
} from '../types/pos.types'

export function PosPage() {
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const selectedBranchId = useBranchSelectionStore((state) => state.branchId) ?? ''
  const setupQuery = usePosSetup()
  const registersQuery = usePosRegisters()
  const sessionQuery = useActivePosSession()
  const [closedReport, setClosedReport] = useState<PosZReport | null>(null)
  const setup = setupQuery.data
  const selectedBranch = setup?.branches.find((branch) => branch.id === selectedBranchId) ?? setup?.branches[0]

  if (setupQuery.isPending || registersQuery.isPending || sessionQuery.isPending) {
    return <FullState>Loading POS session…</FullState>
  }

  if (setupQuery.isError || registersQuery.isError || sessionQuery.isError || !setup) {
    const message = setupQuery.error?.message ?? registersQuery.error?.message ?? sessionQuery.error?.message
    return (
      <div className="grid h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="font-semibold text-destructive">POS setup is unavailable.</p>
          <p className="mt-1 text-sm text-muted-foreground">{message ?? 'Refresh the page or return to the ERP workspace.'}</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/dashboard')}>Exit POS</Button>
        </div>
      </div>
    )
  }

  if (closedReport) {
    return <SessionClosedScreen report={closedReport} onNewSession={() => setClosedReport(null)} />
  }

  if (!sessionQuery.data) {
    return (
      <OpenSessionScreen
        setup={setup}
        branch={selectedBranch}
        registers={registersQuery.data ?? []}
        cashier={user?.username ?? 'Cashier'}
        onExit={() => navigate('/dashboard')}
      />
    )
  }

  return (
    <PosWorkspace
      setup={setup}
      session={sessionQuery.data}
      selectedBranchId={selectedBranchId}
      cashier={user?.username ?? sessionQuery.data.cashierUsername}
      onSessionClosed={setClosedReport}
      onExit={() => navigate('/dashboard')}
      onHistory={() => navigate('/pos/sessions')}
    />
  )
}

function PosWorkspace({
  setup,
  session,
  selectedBranchId,
  cashier,
  onSessionClosed,
  onExit,
  onHistory,
}: {
  setup: PosSetup
  session: PosSession
  selectedBranchId: string
  cashier: string
  onSessionClosed: (report: PosZReport) => void
  onExit: () => void
  onHistory: () => void
}) {
  const [warehouseId, setWarehouseId] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [itemType, setItemType] = useState<'' | PosCatalogItemType>('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [customer, setCustomer] = useState<PosCustomer | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [completedSale, setCompletedSale] = useState<PosSale | null>(null)
  const [xReportOpen, setXReportOpen] = useState(false)
  const [closing, setClosing] = useState(false)

  const branchWarehouses = useMemo(
    () => setup.warehouses.filter((warehouse) => warehouse.branchId === selectedBranchId),
    [selectedBranchId, setup.warehouses]
  )
  const selectedBranch = setup.branches.find((branch) => branch.id === selectedBranchId) ?? setup.branches[0]

  useEffect(() => {
    setWarehouseId((current) =>
      branchWarehouses.some((warehouse) => warehouse.id === current)
        ? current
        : branchWarehouses[0]?.id ?? ''
    )
  }, [branchWarehouses])

  useEffect(() => {
    setCart([])
    setCustomer(null)
    setPage(1)
    setCheckoutOpen(false)
    setMobileCartOpen(false)
  }, [selectedBranchId, session.id])

  const catalogQuery = usePosCatalog({
    page,
    pageSize: 32,
    search: deferredSearch.trim() || undefined,
    itemType: itemType === '' ? undefined : itemType,
    categoryId: categoryId || undefined,
    warehouseId: warehouseId || undefined,
  })
  const items = catalogQuery.data?.data ?? []
  const total = posCartTotal(cart)

  const chooseType = (type: '' | PosCatalogItemType) => {
    setItemType(type)
    setCategoryId('')
    setPage(1)
  }

  const chooseCategory = (category: PosCategory) => {
    setItemType(category.itemType)
    setCategoryId(category.id)
    setPage(1)
  }

  const changeWarehouse = (nextWarehouseId: string) => {
    if (nextWarehouseId === warehouseId) return
    setWarehouseId(nextWarehouseId)
    setCart([])
    setPage(1)
  }

  const completeSale = (sale: PosSale) => {
    setCart([])
    setCustomer(null)
    setMobileCartOpen(false)
    setCompletedSale(sale)
  }

  if (closing) {
    return (
      <CloseSessionScreen
        session={session}
        onCancel={() => setClosing(false)}
        onClosed={(report) => {
          setCart([])
          setCustomer(null)
          setCheckoutOpen(false)
          setMobileCartOpen(false)
          setCompletedSale(null)
          onSessionClosed(report)
        }}
      />
    )
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-muted/20">
      <PosTopBar
        branch={selectedBranch}
        session={session}
        warehouses={branchWarehouses}
        warehouseId={warehouseId}
        cashier={cashier}
        onWarehouseChange={changeWarehouse}
        onXReport={() => setXReportOpen(true)}
        onCloseSession={() => setClosing(true)}
        onHistory={onHistory}
        onExit={onExit}
      />

      {branchWarehouses.length > 1 && (
        <div className="shrink-0 border-b bg-card px-3 py-2 xl:hidden">
          <select
            aria-label="Product warehouse"
            value={warehouseId}
            onChange={(event) => changeWarehouse(event.target.value)}
            className="h-9 w-full rounded-lg border bg-background px-3 text-xs font-medium outline-none focus:ring-2 focus:ring-ring"
          >
            {branchWarehouses.map((warehouse) => (
              <option key={warehouse.id} value={warehouse.id}>{warehouse.code} — {warehouse.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="hidden w-56 shrink-0 flex-col border-r bg-card lg:flex">
          <div className="shrink-0 border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Catalog</p>
          </div>
          <div className="min-h-0 flex-1">
            <PosCategoryNav
              categories={setup.categories}
              itemType={itemType}
              categoryId={categoryId}
              onTypeChange={chooseType}
              onCategoryChange={chooseCategory}
            />
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="shrink-0 border-b bg-card p-2 lg:hidden">
            <PosCategoryNav
              horizontal
              categories={setup.categories}
              itemType={itemType}
              categoryId={categoryId}
              onTypeChange={chooseType}
              onCategoryChange={chooseCategory}
            />
          </div>
          <PosCatalogGrid
            items={items}
            baseCurrencyCode={setup.baseCurrencyCode}
            search={search}
            warehouseSelected={Boolean(warehouseId)}
            loading={catalogQuery.isPending}
            errorMessage={catalogQuery.isError ? catalogQuery.error.message : undefined}
            meta={catalogQuery.data?.meta}
            onSearchChange={(value) => { setSearch(value); setPage(1) }}
            onAdd={(item: PosCatalogItem) => setCart((current) => addCatalogItemToCart(current, item))}
            onPreviousPage={() => setPage((value) => Math.max(1, value - 1))}
            onNextPage={() => setPage((value) => value + 1)}
          />
        </main>

        <PosCart
          className="hidden w-[390px] shrink-0 border-l xl:flex"
          cart={cart}
          setup={setup}
          customer={customer}
          warehouseSelected={Boolean(warehouseId)}
          onCartChange={setCart}
          onCustomerChange={setCustomer}
          onCheckout={() => setCheckoutOpen(true)}
        />
      </div>

      <Button type="button" className="fixed bottom-4 right-4 z-40 h-12 rounded-full px-5 shadow-lg xl:hidden" onClick={() => setMobileCartOpen(true)}>
        <ShoppingCart className="size-4" />
        Cart {cart.length > 0 ? `(${cart.length}) · ${amount(total)} ${setup.baseCurrencyCode}` : ''}
      </Button>

      <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <DialogContent className="h-[100dvh] max-h-none w-screen max-w-none rounded-none p-0 sm:h-[92vh] sm:max-w-lg sm:rounded-xl">
          <PosCart
            className="h-full"
            cart={cart}
            setup={setup}
            customer={customer}
            warehouseSelected={Boolean(warehouseId)}
            onCartChange={setCart}
            onCustomerChange={setCustomer}
            onCheckout={() => { setMobileCartOpen(false); setCheckoutOpen(true) }}
          />
        </DialogContent>
      </Dialog>

      <CheckoutDialog
        open={checkoutOpen}
        setup={setup}
        branchId={selectedBranchId}
        sessionId={session.id}
        warehouseId={warehouseId}
        customerId={customer?.id ?? null}
        cart={cart}
        onOpenChange={setCheckoutOpen}
        onCompleted={completeSale}
      />

      <XReportDialog sessionId={session.id} open={xReportOpen} onOpenChange={setXReportOpen} />
      <SaleCompleteDialog sale={completedSale} onNewSale={() => setCompletedSale(null)} />
    </div>
  )
}

function FullState({ children }: { children: React.ReactNode }) {
  return <div className="grid h-screen place-items-center bg-background text-sm text-muted-foreground">{children}</div>
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
