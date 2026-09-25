import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { PosCart } from './PosCart'
import { PosCatalogItemType } from '../types/pos.types'
import type { PosCartLine, PosSetup } from '../types/pos.types'

vi.mock('./CustomerPicker', () => ({
  CustomerPicker: () => <div>Walk-in customer</div>,
}))

const setup: PosSetup = {
  baseCurrencyId: '11111111-1111-4111-8111-111111111111',
  baseCurrencyCode: 'IQD',
  branches: [],
  warehouses: [],
  categories: [],
  professionals: [{ id: '22222222-2222-4222-8222-222222222222', username: 'Daban' }],
  moneyAccounts: [],
}

const cart: PosCartLine[] = [{
  item: {
    itemType: PosCatalogItemType.Service,
    id: '33333333-3333-4333-8333-333333333333',
    name: 'Haircut',
    categoryId: '44444444-4444-4444-8444-444444444444',
    categoryName: 'Hair',
    unitPriceBase: 25_000,
    sku: null,
    barcode: null,
    unitOfMeasureId: null,
    unitName: null,
    unitCode: null,
    availableQuantity: null,
    imageReference: null,
    unitConversions: [],
  },
  quantity: 1,
  unitOfMeasureId: '',
  unitPriceBase: 25_000,
}]

afterEach(cleanup)

describe('PosCart', () => {
  it('keeps service cards free of per-line Master controls', () => {
    render(
      <PosCart
        cart={cart}
        setup={setup}
        customer={null}
        warehouseSelected
        onCartChange={vi.fn()}
        onCustomerChange={vi.fn()}
        onCheckout={vi.fn()}
      />
    )

    expect(screen.getByText('Haircut')).toBeInTheDocument()
    expect(screen.queryByLabelText('Professional for Haircut')).not.toBeInTheDocument()
    expect(screen.queryByText('No Professional assigned')).not.toBeInTheDocument()
  })
})
