import { describe, expect, it } from 'vitest'
import { addCatalogItemToCart, posCartLineTotal, posCartTotal } from './posCart'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCatalogItem } from '../types/pos.types'

const product: PosCatalogItem = {
  itemType: PosCatalogItemType.Product,
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Premium Beard Oil',
  categoryId: '22222222-2222-4222-8222-222222222222',
  categoryName: 'Beard Care',
  unitPriceBase: 22_000,
  sku: 'BEARD-OIL',
  barcode: null,
  unitOfMeasureId: '33333333-3333-4333-8333-333333333333',
  unitName: 'Piece',
  unitCode: 'PCS',
  availableQuantity: 2,
  imageReference: null,
  unitConversions: [],
}

const service: PosCatalogItem = {
  ...product,
  itemType: PosCatalogItemType.Service,
  id: '44444444-4444-4444-8444-444444444444',
  name: 'Classic Haircut',
  categoryName: 'Hair & Styling',
  unitPriceBase: 25_000,
  sku: null,
  unitOfMeasureId: null,
  unitName: null,
  unitCode: null,
  availableQuantity: null,
}

describe('POS cart behavior', () => {
  it('increments an existing product instead of creating a duplicate line', () => {
    const once = addCatalogItemToCart([], product)
    const twice = addCatalogItemToCart(once, product)

    expect(twice).toHaveLength(1)
    expect(twice[0].quantity).toBe(2)
  })

  it('does not increase product quantity beyond available base stock', () => {
    const once = addCatalogItemToCart([], product)
    const twice = addCatalogItemToCart(once, product)
    const thirdAttempt = addCatalogItemToCart(twice, product)

    expect(thirdAttempt).toEqual(twice)
    expect(thirdAttempt[0].quantity).toBe(2)
  })

  it('does not add an out-of-stock product', () => {
    expect(addCatalogItemToCart([], { ...product, availableQuantity: 0 })).toEqual([])
  })

  it('keeps services as one line and increments their quantity', () => {
    const once = addCatalogItemToCart([], service)
    const twice = addCatalogItemToCart(once, service)

    expect(twice).toHaveLength(1)
    expect(twice[0].quantity).toBe(2)
    expect(posCartTotal(twice)).toBe(50_000)
  })

  it('rounds every cart line before summing the sale total like the backend', () => {
    const first = addCatalogItemToCart([], { ...service, id: '55555555-5555-4555-8555-555555555555', unitPriceBase: 0.33335 })
    const second = addCatalogItemToCart([], { ...service, id: '66666666-6666-4666-8666-666666666666', unitPriceBase: 0.33335 })
    const cart = [...first, ...second]

    expect(posCartLineTotal(cart[0])).toBe(0.3334)
    expect(posCartLineTotal(cart[1])).toBe(0.3334)
    expect(posCartTotal(cart)).toBe(0.6668)
  })
})
