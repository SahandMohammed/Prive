import { convertToBaseQuantity } from '@/features/inventory'
import type { UnitConvertibleProduct } from '@/features/inventory'
import { posLineAmount, roundPosMoney } from './posMoney'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCartLine, PosCatalogItem } from '../types/pos.types'

export function addCatalogItemToCart(cart: PosCartLine[], item: PosCatalogItem): PosCartLine[] {
  const existingIndex = cart.findIndex(
    (line) => line.item.itemType === item.itemType && line.item.id === item.id
  )

  if (existingIndex >= 0) {
    const existing = cart[existingIndex]
    const nextQuantity = existing.quantity + 1
    if (item.itemType === PosCatalogItemType.Product) {
      const baseQuantity = convertToBaseQuantity(
        asUnitProduct(item),
        existing.unitOfMeasureId,
        nextQuantity
      )
      if (baseQuantity === null || baseQuantity > (item.availableQuantity ?? 0)) return cart
    }
    return cart.map((line, index) =>
      index === existingIndex ? { ...line, quantity: nextQuantity } : line
    )
  }

  if (item.itemType === PosCatalogItemType.Product && (item.availableQuantity ?? 0) <= 0)
    return cart

  return [
    ...cart,
    {
      item,
      quantity: 1,
      unitOfMeasureId: item.unitOfMeasureId ?? '',
      unitPriceBase: item.unitPriceBase,
    },
  ]
}

export function posCartLineTotal(line: PosCartLine): number {
  return posLineAmount(line.unitPriceBase, line.quantity)
}

export function posCartTotal(cart: PosCartLine[]): number {
  return roundPosMoney(
    cart.reduce((sum, line) => sum + posCartLineTotal(line), 0)
  )
}

function asUnitProduct(item: PosCatalogItem): UnitConvertibleProduct {
  return {
    unitOfMeasureId: item.unitOfMeasureId ?? '',
    unitName: item.unitName ?? '',
    unitCode: item.unitCode ?? '',
    unitConversions: item.unitConversions,
  }
}
