import { Banknote, Minus, Package, Plus, ShoppingCart, Trash2, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { convertBasePriceToUnitPrice, convertToBaseQuantity, productUnitOptions } from '@/features/inventory'
import type { UnitConvertibleProduct } from '@/features/inventory'
import { cn } from '@/lib/utils'
import { CustomerPicker } from './CustomerPicker'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCartLine, PosCustomer, PosSetup } from '../types/pos.types'

export function PosCart({
  cart,
  setup,
  customer,
  warehouseSelected,
  className,
  onCartChange,
  onCustomerChange,
  onCheckout,
}: {
  cart: PosCartLine[]
  setup: PosSetup
  customer: PosCustomer | null
  warehouseSelected: boolean
  className?: string
  onCartChange: (cart: PosCartLine[]) => void
  onCustomerChange: (customer: PosCustomer | null) => void
  onCheckout: () => void
}) {
  const total = cart.reduce((sum, line) => sum + line.unitPriceBase * line.quantity, 0)
  const hasProduct = cart.some((line) => line.item.itemType === PosCatalogItemType.Product)
  const canCheckout =
    cart.length > 0 &&
    (!hasProduct || warehouseSelected) &&
    setup.moneyAccounts.length > 0

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      onCartChange(cart.filter((_, currentIndex) => currentIndex !== index))
      return
    }
    const line = cart[index]
    if (line.item.itemType === PosCatalogItemType.Product) {
      const baseQuantity = convertToBaseQuantity(asUnitProduct(line.item), line.unitOfMeasureId, quantity)
      if (baseQuantity === null || baseQuantity > (line.item.availableQuantity ?? 0)) return
    }
    onCartChange(cart.map((item, currentIndex) => currentIndex === index ? { ...item, quantity } : item))
  }

  return (
    <aside className={cn('flex min-h-0 flex-col bg-card', className)}>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <ShoppingCart className="size-4" />
        <h2 className="font-semibold">Current sale</h2>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-medium">{cart.length}</span>
      </div>

      <div className="shrink-0 p-3">
        <CustomerPicker customer={customer} onChange={onCustomerChange} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {cart.length === 0 ? (
          <div className="grid h-full min-h-48 place-items-center rounded-xl border border-dashed p-6 text-center">
            <div>
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-muted">
                <ShoppingCart className="size-5 text-muted-foreground" />
              </div>
              <p className="mt-3 text-sm font-semibold">No items yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Choose a service or product to start a sale.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {cart.map((line, index) => {
              const isProduct = line.item.itemType === PosCatalogItemType.Product
              const product = asUnitProduct(line.item)
              const nextBaseQuantity = isProduct
                ? convertToBaseQuantity(product, line.unitOfMeasureId, line.quantity + 1)
                : null
              const cannotIncrease =
                isProduct &&
                (nextBaseQuantity === null || nextBaseQuantity > (line.item.availableQuantity ?? 0))

              return (
                <div key={`${line.item.itemType}-${line.item.id}`} className="rounded-xl border bg-background p-3">
                  <div className="flex items-start gap-2">
                    <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
                      {isProduct ? <Package className="size-4" /> : <UserRound className="size-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{line.item.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {isProduct ? 'Product' : 'Service'} · {amount(line.unitPriceBase)} {setup.baseCurrencyCode}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Remove ${line.item.name}`}
                      onClick={() => updateQuantity(index, 0)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>

                  {!isProduct && (
                    <select
                      aria-label={`Professional for ${line.item.name}`}
                      value={line.professionalUserId}
                      onChange={(event) => onCartChange(cart.map((item, currentIndex) => currentIndex === index ? { ...item, professionalUserId: event.target.value } : item))}
                      className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">No Professional assigned</option>
                      {setup.professionals.map((professional) => (
                        <option key={professional.id} value={professional.id}>{professional.username}</option>
                      ))}
                    </select>
                  )}

                  {isProduct && (
                    <select
                      aria-label={`Unit for ${line.item.name}`}
                      value={line.unitOfMeasureId}
                      onChange={(event) => {
                        const unitPrice = convertBasePriceToUnitPrice(product, event.target.value, line.item.unitPriceBase)
                        const baseQuantity = convertToBaseQuantity(product, event.target.value, line.quantity)
                        if (unitPrice === null || baseQuantity === null || baseQuantity > (line.item.availableQuantity ?? 0)) return
                        onCartChange(cart.map((item, currentIndex) => currentIndex === index ? { ...item, unitOfMeasureId: event.target.value, unitPriceBase: round4(unitPrice) } : item))
                      }}
                      className="mt-2 h-8 w-full rounded-md border bg-background px-2 text-xs outline-none focus:ring-2 focus:ring-ring"
                    >
                      {productUnitOptions(product).map((unit) => (
                        <option key={unit.id} value={unit.id}>{unit.code} — {unit.name}</option>
                      ))}
                    </select>
                  )}

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="outline" size="icon-xs" onClick={() => updateQuantity(index, line.quantity - 1)}>
                        <Minus className="size-3.5" />
                      </Button>
                      <span className="min-w-8 text-center font-mono text-sm">{line.quantity}</span>
                      <Button type="button" variant="outline" size="icon-xs" disabled={cannotIncrease} onClick={() => updateQuantity(index, line.quantity + 1)}>
                        <Plus className="size-3.5" />
                      </Button>
                    </div>
                    <span className="font-mono text-sm font-bold">{amount(line.unitPriceBase * line.quantity)}</span>
                  </div>

                  {isProduct && (
                    <p className="mt-1.5 text-right text-[10px] text-muted-foreground">
                      Base quantity {amount(convertToBaseQuantity(product, line.unitOfMeasureId, line.quantity) ?? 0)} {line.item.unitCode}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="shrink-0 border-t bg-card p-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Subtotal</span>
            <span className="font-mono text-foreground">{amount(total)} {setup.baseCurrencyCode}</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            <span className="text-sm font-semibold">Total</span>
            <span className="font-mono text-xl font-bold">{amount(total)} {setup.baseCurrencyCode}</span>
          </div>
        </div>
        <Button type="button" className="mt-4 h-12 w-full text-sm font-semibold" disabled={!canCheckout} onClick={onCheckout}>
          <Banknote className="size-4" />
          Checkout · {amount(total)} {setup.baseCurrencyCode}
        </Button>
        {setup.moneyAccounts.length === 0 ? (
          <p className="mt-2 text-center text-[11px] text-destructive">No operable Money Account is available for this branch.</p>
        ) : hasProduct && !warehouseSelected ? (
          <p className="mt-2 text-center text-[11px] text-destructive">Select a warehouse before selling products.</p>
        ) : (
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Stock, rates, permissions and balances are revalidated on completion.</p>
        )}
      </div>
    </aside>
  )
}

function asUnitProduct(item: PosCartLine['item']): UnitConvertibleProduct {
  return {
    unitOfMeasureId: item.unitOfMeasureId ?? '',
    unitName: item.unitName ?? '',
    unitCode: item.unitCode ?? '',
    unitConversions: item.unitConversions,
  }
}

const amount = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 4 })
const round4 = (value: number) => Math.round((value + Number.EPSILON) * 10_000) / 10_000
