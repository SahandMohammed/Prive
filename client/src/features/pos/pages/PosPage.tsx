import { useDeferredValue, useMemo, useState } from 'react'
import { ShoppingCart } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { useCurrentUser } from '@/features/auth'
import { useBranchSelectionStore } from '@/features/business'
import { formatNumber } from '@/lib/i18n'
import { CheckoutDialog } from '../components/CheckoutDialog'
import { PosCart } from '../components/PosCart'
import { PosCatalogGrid } from '../components/PosCatalogGrid'
import { PosCategoryNav } from '../components/PosCategoryNav'
import { ProfessionalSelectionDialog } from '../components/ProfessionalSelectionDialog'
import { PosTopBar } from '../components/PosTopBar'
import { SaleCompleteDialog } from '../components/SaleCompleteDialog'
import { usePosCatalog, usePosSetup } from '../hooks/usePos'
import { addCatalogItemToCart, posCartTotal } from '../lib/posCart'
import { PosCatalogItemType } from '../types/pos.types'
import type {
  PosCartLine,
  PosCatalogItem,
  PosCategory,
  PosCustomer,
  PosSale,
  PosSetup,
} from '../types/pos.types'

export function PosPage() {
  const { t } = useTranslation(['pos', 'common'])
  const navigate = useNavigate()
  const { data: user } = useCurrentUser()
  const selectedBranchId = useBranchSelectionStore((state) => state.branchId) ?? ''
  const setupQuery = usePosSetup()
  const setup = setupQuery.data
  const selectedBranch = setup?.branches.find((branch) => branch.id === selectedBranchId) ?? setup?.branches[0]

  if (setupQuery.isPending) {
    return <FullState>{t('common:status.loading', { defaultValue: 'Loading…' })}</FullState>
  }

  if (setupQuery.isError || !setup || !selectedBranch) {
    const message = setupQuery.error?.message
    return (
      <div className="grid h-screen place-items-center bg-background p-6 text-center">
        <div>
          <p className="font-semibold text-destructive">{t('pos:setupUnavailable')}</p>
          <p className="mt-1 text-sm text-muted-foreground">{message ?? t('pos:setupUnavailableDesc')}</p>
          <Button className="mt-4" variant="outline" onClick={() => navigate('/')}>{t('common:actions.back', { defaultValue: 'Back' })}</Button>
        </div>
      </div>
    )
  }

  return (
    <PosWorkspace
      key={selectedBranch.id}
      setup={setup}
      selectedBranchId={selectedBranch.id}
      operator={user?.username ?? 'Operator'}
      onExit={() => navigate('/')}
    />
  )
}

function PosWorkspace({
  setup,
  selectedBranchId,
  operator,
  onExit,
}: {
  setup: PosSetup
  selectedBranchId: string
  operator: string
  onExit: () => void
}) {
  const { t } = useTranslation(['pos', 'common'])
  const [selectedWarehouseId, setWarehouseId] = useState('')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [itemType, setItemType] = useState<'' | PosCatalogItemType>('')
  const [categoryId, setCategoryId] = useState('')
  const [page, setPage] = useState(1)
  const [cart, setCart] = useState<PosCartLine[]>([])
  const [customer, setCustomer] = useState<PosCustomer | null>(null)
  const [checkoutStage, setCheckoutStage] = useState<'professional' | 'payment' | null>(null)
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(null)
  const [mobileCartOpen, setMobileCartOpen] = useState(false)
  const [completedSale, setCompletedSale] = useState<PosSale | null>(null)

  const branchWarehouses = useMemo(
    () => setup.warehouses.filter((warehouse) => warehouse.branchId === selectedBranchId),
    [selectedBranchId, setup.warehouses]
  )
  const selectedBranch = setup.branches.find((branch) => branch.id === selectedBranchId) ?? setup.branches[0]

  const warehouseId = branchWarehouses.some((warehouse) => warehouse.id === selectedWarehouseId)
    ? selectedWarehouseId
    : branchWarehouses[0]?.id ?? ''

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
  const cartHasServices = cart.some((line) => line.item.itemType === PosCatalogItemType.Service)
  const selectedProfessional = setup.professionals.find((professional) => professional.id === selectedProfessionalId) ?? null

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
    setSelectedProfessionalId(null)
    setCheckoutStage(null)
    setPage(1)
  }

  const changeCart = (nextCart: PosCartLine[]) => {
    setCart(nextCart)
    if (!nextCart.some((line) => line.item.itemType === PosCatalogItemType.Service)) {
      setSelectedProfessionalId(null)
    }
  }

  const startCheckout = () => {
    setCheckoutStage(cartHasServices ? 'professional' : 'payment')
  }

  const completeSale = (sale: PosSale) => {
    setCart([])
    setCustomer(null)
    setSelectedProfessionalId(null)
    setCheckoutStage(null)
    setMobileCartOpen(false)
    setCompletedSale(sale)
  }

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-hidden bg-muted/20">
      <PosTopBar
        branch={selectedBranch}
        warehouses={branchWarehouses}
        warehouseId={warehouseId}
        operator={operator}
        onWarehouseChange={changeWarehouse}
        onExit={onExit}
      />

      {branchWarehouses.length > 1 && (
        <div className="shrink-0 border-b bg-card px-3 py-2 xl:hidden">
          <select
            aria-label={t('pos:topBar.warehouse')}
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
        <aside className="hidden w-56 shrink-0 flex-col border-e bg-card lg:flex">
          <div className="shrink-0 border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('pos:catalog')}</p>
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
          className="hidden w-[390px] shrink-0 border-s xl:flex"
          cart={cart}
          setup={setup}
          customer={customer}
          warehouseSelected={Boolean(warehouseId)}
          onCartChange={changeCart}
          onCustomerChange={setCustomer}
          onCheckout={startCheckout}
        />
      </div>

      <Button type="button" className="fixed bottom-4 end-4 z-40 h-12 rounded-full px-5 shadow-lg xl:hidden" onClick={() => setMobileCartOpen(true)}>
        <ShoppingCart className="size-4" />
        {t('pos:cart.title')} {cart.length > 0 ? `(${cart.length}) · ${amount(total)} ${setup.baseCurrencyCode}` : ''}
      </Button>

      <Dialog open={mobileCartOpen} onOpenChange={setMobileCartOpen}>
        <DialogContent className="h-[100dvh] max-h-none w-screen max-w-none rounded-none p-0 sm:h-[92vh] sm:max-w-lg sm:rounded-xl">
          <PosCart
            className="h-full"
            cart={cart}
            setup={setup}
            customer={customer}
            warehouseSelected={Boolean(warehouseId)}
            onCartChange={changeCart}
            onCustomerChange={setCustomer}
            onCheckout={() => { setMobileCartOpen(false); startCheckout() }}
          />
        </DialogContent>
      </Dialog>

      <ProfessionalSelectionDialog
        open={checkoutStage === 'professional'}
        professionals={setup.professionals}
        selectedProfessionalId={selectedProfessionalId}
        onSelect={setSelectedProfessionalId}
        onContinue={() => setCheckoutStage('payment')}
        onOpenChange={(open) => { if (!open) setCheckoutStage(null) }}
      />

      <CheckoutDialog
        open={checkoutStage === 'payment'}
        setup={setup}
        branchId={selectedBranchId}
        warehouseId={warehouseId}
        customer={customer}
        professional={cartHasServices ? selectedProfessional : null}
        cart={cart}
        onOpenChange={(open) => { if (!open) setCheckoutStage(null) }}
        onBack={() => setCheckoutStage(cartHasServices ? 'professional' : null)}
        onCompleted={completeSale}
      />

      <SaleCompleteDialog sale={completedSale} onNewSale={() => setCompletedSale(null)} />
    </div>
  )
}

function FullState({ children }: { children: React.ReactNode }) {
  return <div className="grid h-screen place-items-center bg-background text-sm text-muted-foreground">{children}</div>
}

const amount = (value: number) => formatNumber(value, { maximumFractionDigits: 4 })
