import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MoneyAccountType } from '@/features/finance'
import { CheckoutDialog } from './CheckoutDialog'
import { PosCatalogItemType, PosPaymentMode } from '../types/pos.types'
import type {
  PosCartLine,
  PosCustomer,
  PosMoneyAccount,
  PosProfessional,
  PosSetup,
} from '../types/pos.types'

const hooks = vi.hoisted(() => ({
  complete: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as Error | null },
}))

vi.mock('../hooks/usePos', () => ({ useCompletePosSale: () => hooks.complete }))

const ids = {
  branch: '11111111-1111-4111-8111-111111111111',
  baseCurrency: '22222222-2222-4222-8222-222222222222',
  usdCurrency: '33333333-3333-4333-8333-333333333333',
  iqdCashbox: '44444444-4444-4444-8444-444444444444',
  usdCashbox: '55555555-5555-4555-8555-555555555555',
  service: '66666666-6666-4666-8666-666666666666',
  product: '77777777-7777-4777-8777-777777777777',
  professional: '88888888-8888-4888-8888-888888888888',
  customer: '99999999-9999-4999-8999-999999999999',
}

const professional: PosProfessional = { id: ids.professional, name: 'Daban' }
const customer: PosCustomer = { id: ids.customer, name: 'Ahmed Mohammed', primaryPhoneNumber: null }

const iqdCashbox: PosMoneyAccount = {
  id: ids.iqdCashbox,
  code: 'MAIN-CASH-IQD',
  name: 'Reception IQD Cashbox',
  type: MoneyAccountType.Cashbox,
  branchId: ids.branch,
  currencyId: ids.baseCurrency,
  currencyCode: 'IQD',
  currencyDecimalPlaces: 0,
  balance: 0,
  currentExchangeRate: 1,
}

const usdCashbox: PosMoneyAccount = {
  id: ids.usdCashbox,
  code: 'MAIN-CASH-USD',
  name: 'Reception USD Cashbox',
  type: MoneyAccountType.Cashbox,
  branchId: ids.branch,
  currencyId: ids.usdCurrency,
  currencyCode: 'USD',
  currencyDecimalPlaces: 2,
  balance: 0,
  currentExchangeRate: 1_310,
}

const setup: PosSetup = {
  baseCurrencyId: ids.baseCurrency,
  baseCurrencyCode: 'IQD',
  branches: [],
  warehouses: [],
  categories: [],
  professionals: [professional],
  moneyAccounts: [iqdCashbox, usdCashbox],
}

const serviceCart: PosCartLine[] = [{
  item: {
    itemType: PosCatalogItemType.Service,
    id: ids.service,
    name: 'Haircut',
    categoryId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    categoryName: 'Hair',
    unitPriceBase: 30_000,
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
  unitPriceBase: 30_000,
}]

const productCart: PosCartLine[] = [{
  ...serviceCart[0],
  item: {
    ...serviceCart[0].item,
    itemType: PosCatalogItemType.Product,
    id: ids.product,
    name: 'Shampoo',
    unitOfMeasureId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    unitName: 'Piece',
    unitCode: 'PC',
    availableQuantity: 10,
  },
  unitOfMeasureId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
}]

function renderCheckout(overrides: Partial<React.ComponentProps<typeof CheckoutDialog>> = {}) {
  const props: React.ComponentProps<typeof CheckoutDialog> = {
    open: true,
    setup,
    branchId: ids.branch,
    warehouseId: '',
    customer: null,
    professional,
    cart: serviceCart,
    onOpenChange: vi.fn(),
    onBack: vi.fn(),
    onCompleted: vi.fn(),
    ...overrides,
  }
  return render(<CheckoutDialog {...props} />)
}

function enter(currencyCode: string, value: string) {
  const input = screen.getByLabelText(`${currencyCode} amount`)
  fireEvent.change(input, { target: { value } })
  return input
}

beforeEach(() => {
  vi.clearAllMocks()
  hooks.complete.error = null
})
afterEach(cleanup)

describe('POS dual-currency touch checkout', () => {
  it('renders the branch-operable IQD/USD collection accounts', () => {
    renderCheckout()

    expect(screen.getByLabelText('IQD amount')).toHaveAttribute('step', '1')
    expect(screen.getByLabelText('USD amount')).toHaveAttribute('step', '0.01')
    expect(screen.getByText('IQD · MAIN-CASH-IQD')).toBeInTheDocument()
    expect(screen.getByText('USD · MAIN-CASH-USD')).toBeInTheDocument()
    expect(screen.queryByLabelText('Cashbox')).not.toBeInTheDocument()
  })

  it('omits zero fields and maps IQD-only and USD-only collections', async () => {
    renderCheckout()
    enter('IQD', '30000')
    fireEvent.click(screen.getByRole('button', { name: /Save Paid Sale/ }))
    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledOnce())
    expect(hooks.complete.mutate.mock.calls[0][0]).toMatchObject({
      collections: [{ moneyAccountId: ids.iqdCashbox, amount: 30_000 }],
      change: null,
      paymentMode: PosPaymentMode.Paid,
    })

    cleanup()
    vi.clearAllMocks()
    renderCheckout()
    enter('USD', '23')
    fireEvent.click(screen.getByRole('button', { name: /Save Paid Sale/ }))
    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledOnce())
    expect(hooks.complete.mutate.mock.calls[0][0]).toMatchObject({
      collections: [{ moneyAccountId: ids.usdCashbox, amount: 23 }],
      change: { moneyAccountId: ids.iqdCashbox, amount: 130 },
    })
  })

  it('creates two independent collection lines when both native amount fields are positive', async () => {
    renderCheckout()
    enter('IQD', '10000')
    enter('USD', '15.27')
    fireEvent.click(screen.getByRole('button', { name: /Save Paid Sale/ }))

    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledOnce())
    expect(hooks.complete.mutate.mock.calls[0][0]).toMatchObject({
      collections: [
        { moneyAccountId: ids.iqdCashbox, amount: 10_000 },
        { moneyAccountId: ids.usdCashbox, amount: 15.27 },
      ],
      change: { moneyAccountId: ids.iqdCashbox, amount: 3.7 },
    })
  })

  it('uses bill helpers and directs the single keypad to the last active form field', () => {
    renderCheckout()

    fireEvent.click(screen.getByRole('button', { name: '25K' }))
    fireEvent.click(screen.getByRole('button', { name: '10K' }))
    expect(screen.getByLabelText('IQD amount')).toHaveValue(35_000)

    fireEvent.focus(screen.getByLabelText('USD amount'))
    fireEvent.click(screen.getByRole('button', { name: '$5' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keypad 2' }))
    expect(screen.getByLabelText('USD amount')).toHaveValue(52)
    expect(screen.getByLabelText('IQD amount')).toHaveValue(35_000)
    fireEvent.click(screen.getByRole('button', { name: 'Backspace amount' }))
    expect(screen.getByLabelText('USD amount')).toHaveValue(5)
  })

  it('calculates Exact from the remaining balance and rounds up to visible USD precision', () => {
    renderCheckout()
    enter('IQD', '10000')
    fireEvent.focus(screen.getByLabelText('USD amount'))
    fireEvent.click(screen.getByRole('button', { name: 'Exact remaining · USD' }))

    expect(screen.getByLabelText('USD amount')).toHaveValue(15.27)
    expect(screen.getByText('30,003.7 IQD')).toBeInTheDocument()
    expect(screen.getByText('3.7 IQD')).toBeInTheDocument()
    expect(screen.getByText('From MAIN-CASH-IQD')).toBeInTheDocument()
  })

  it('sets Exact to zero when the other field already settles or overpays the sale', () => {
    renderCheckout()
    enter('IQD', '30001')
    enter('USD', '5')
    fireEvent.focus(screen.getByLabelText('USD amount'))
    fireEvent.click(screen.getByRole('button', { name: 'Exact remaining · USD' }))
    expect(screen.getByLabelText('USD amount')).toHaveValue(0)
  })

  it('keeps entered native amounts after a stale-FX server rejection and recomputes the preview', () => {
    const view = renderCheckout()
    enter('IQD', '10000')
    enter('USD', '15.27')
    hooks.complete.error = new Error('Recorded change must equal 156.4 IQD.')

    view.rerender(<CheckoutDialog
      open
      setup={{ ...setup, moneyAccounts: [iqdCashbox, { ...usdCashbox, currentExchangeRate: 1_320 }] }}
      branchId={ids.branch}
      warehouseId=""
      customer={null}
      professional={professional}
      cart={serviceCart}
      onOpenChange={vi.fn()}
      onBack={vi.fn()}
      onCompleted={vi.fn()}
    />)

    expect(screen.getByLabelText('IQD amount')).toHaveValue(10_000)
    expect(screen.getByLabelText('USD amount')).toHaveValue(15.27)
    expect(screen.getByText('30,156.4 IQD')).toBeInTheDocument()
    expect(screen.getByText('Recorded change must equal 156.4 IQD.')).toBeInTheDocument()
  })

  it('blocks change when the branch has no base-currency Cashbox', () => {
    renderCheckout({ setup: { ...setup, moneyAccounts: [usdCashbox] } })
    enter('USD', '23')
    expect(screen.getByText('No operable IQD Cashbox is available to return change.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save Paid Sale/ })).toBeDisabled()
  })

  it('keeps Credit behavior and product-professional mapping unchanged', async () => {
    renderCheckout({ customer, cart: productCart })
    fireEvent.click(screen.getByRole('button', { name: /Credit/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Credit Sale' }))

    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledOnce())
    expect(hooks.complete.mutate.mock.calls[0][0]).toMatchObject({
      customerId: ids.customer,
      paymentMode: PosPaymentMode.Credit,
      collections: [],
      change: null,
      lines: [{ productId: ids.product, professionalId: null }],
    })
  })
})
