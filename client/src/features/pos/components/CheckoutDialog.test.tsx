import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MoneyAccountType } from '@/features/finance'
import { CheckoutDialog } from './CheckoutDialog'
import { PosCatalogItemType, PosPaymentMode } from '../types/pos.types'
import type { PosCartLine, PosCustomer, PosMoneyAccount, PosProfessional, PosSetup } from '../types/pos.types'

const hooks = vi.hoisted(() => ({
  complete: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null },
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
  session: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
}

const professional: PosProfessional = { id: ids.professional, username: 'Daban' }
const customer: PosCustomer = { id: ids.customer, name: 'Ahmed Mohammed', primaryPhoneNumber: null }

const iqdCashbox: PosMoneyAccount = {
  id: ids.iqdCashbox,
  code: 'CASH-IQD',
  name: 'Reception Cashbox',
  type: MoneyAccountType.Cashbox,
  branchId: ids.branch,
  currencyId: ids.baseCurrency,
  currencyCode: 'IQD',
  balance: 0,
  currentExchangeRate: 1,
}

const usdCashbox: PosMoneyAccount = {
  id: ids.usdCashbox,
  code: 'CASH-USD',
  name: 'Dollar Cashbox',
  type: MoneyAccountType.Cashbox,
  branchId: ids.branch,
  currencyId: ids.usdCurrency,
  currencyCode: 'USD',
  balance: 0,
  currentExchangeRate: 1_300,
}

const setup: PosSetup = {
  baseCurrencyId: ids.baseCurrency,
  baseCurrencyCode: 'IQD',
  branches: [],
  warehouses: [],
  categories: [],
  professionals: [professional],
  moneyAccounts: [iqdCashbox],
}

const serviceCart: PosCartLine[] = [{
  item: {
    itemType: PosCatalogItemType.Service,
    id: ids.service,
    name: 'Haircut',
    categoryId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
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

const productCart: PosCartLine[] = [{
  ...serviceCart[0],
  item: {
    ...serviceCart[0].item,
    itemType: PosCatalogItemType.Product,
    id: ids.product,
    name: 'Shampoo',
    unitOfMeasureId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    unitName: 'Piece',
    unitCode: 'PC',
    availableQuantity: 10,
  },
  unitOfMeasureId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
}]

function renderCheckout(overrides: Partial<React.ComponentProps<typeof CheckoutDialog>> = {}) {
  const props: React.ComponentProps<typeof CheckoutDialog> = {
    open: true,
    setup,
    branchId: ids.branch,
    sessionId: ids.session,
    warehouseId: '',
    customer: null,
    professional,
    cart: serviceCart,
    rememberedReceivingCashboxId: null,
    onReceivingCashboxChange: vi.fn(),
    onOpenChange: vi.fn(),
    onBack: vi.fn(),
    onCompleted: vi.fn(),
    ...overrides,
  }
  return render(<CheckoutDialog {...props} />)
}

async function setReceivedAmount(value: string) {
  const input = screen.getByLabelText('Amount received')
  fireEvent.change(input, { target: { value } })
  await waitFor(() => expect(input).toHaveValue(Number(value)))
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe('POS touch checkout', () => {
  it('preselects a sole valid Cashbox, keeps Paid available for Walk-in, and submits one tender', async () => {
    renderCheckout()

    await waitFor(() => expect(screen.getByLabelText('Cashbox')).toHaveValue(ids.iqdCashbox))
    await setReceivedAmount('25000')
    const save = screen.getByRole('button', { name: /Save Paid Sale/ })
    expect(save).toBeEnabled()
    fireEvent.click(save)

    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledTimes(1))
    expect(hooks.complete.mutate.mock.calls[0][0]).toMatchObject({
      customerId: null,
      paymentMode: PosPaymentMode.Paid,
      tenders: [{ moneyAccountId: ids.iqdCashbox, amount: 25_000 }],
      change: null,
      lines: [{ serviceId: ids.service, professionalUserId: ids.professional }],
    })
  })

  it('maps product lines to a null professional even when the sale has a selected Master', async () => {
    renderCheckout({ cart: productCart })

    await setReceivedAmount('25000')
    fireEvent.click(screen.getByRole('button', { name: /Save Paid Sale/ }))

    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledTimes(1))
    expect(hooks.complete.mutate.mock.calls[0][0].lines).toEqual([expect.objectContaining({
      productId: ids.product,
      professionalUserId: null,
    })])
  })

  it('maps Unpaid to Credit without a tender or change, and requires a customer', async () => {
    const onBack = vi.fn()
    renderCheckout({ customer, onBack })

    fireEvent.click(screen.getByRole('button', { name: /Unpaid/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Unpaid Sale' }))

    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledTimes(1))
    expect(hooks.complete.mutate.mock.calls[0][0]).toMatchObject({
      customerId: ids.customer,
      paymentMode: PosPaymentMode.Credit,
      tenders: [],
      change: null,
    })

    cleanup()
    renderCheckout({ onBack })
    fireEvent.click(screen.getByRole('button', { name: /Unpaid/ }))
    expect(screen.getByText('Customer required')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save Unpaid Sale' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Back to sale' }))
    expect(onBack).toHaveBeenCalled()
  })

  it('remembers an explicitly selected receiving Cashbox and restores a valid remembered Cashbox', async () => {
    const onReceivingCashboxChange = vi.fn()
    const multiCashboxSetup = { ...setup, moneyAccounts: [iqdCashbox, usdCashbox] }
    renderCheckout({ setup: multiCashboxSetup, onReceivingCashboxChange })

    await waitFor(() => expect(screen.getByLabelText('Cashbox')).toHaveValue(''))
    fireEvent.change(screen.getByLabelText('Cashbox'), { target: { value: ids.usdCashbox } })
    expect(onReceivingCashboxChange).toHaveBeenCalledWith(ids.usdCashbox)

    cleanup()
    renderCheckout({ setup: multiCashboxSetup, rememberedReceivingCashboxId: ids.usdCashbox })
    await waitFor(() => expect(screen.getByLabelText('Cashbox')).toHaveValue(ids.usdCashbox))
  })

  it('uses common bills and the keypad against the same amount field', async () => {
    renderCheckout()

    await waitFor(() => expect(screen.getByLabelText('Cashbox')).toHaveValue(ids.iqdCashbox))
    fireEvent.click(screen.getByRole('button', { name: '25,000' }))
    fireEvent.click(screen.getByRole('button', { name: '25,000' }))
    expect(screen.getByLabelText('Amount received')).toHaveValue(50_000)
    fireEvent.click(screen.getByRole('button', { name: 'Clear amount' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keypad 2' }))
    fireEvent.click(screen.getByRole('button', { name: 'Keypad 5' }))
    expect(screen.getByLabelText('Amount received')).toHaveValue(25)
    fireEvent.click(screen.getByRole('button', { name: 'Backspace amount' }))
    expect(screen.getByLabelText('Amount received')).toHaveValue(2)
  })

  it('uses the existing four-decimal FX helpers for Exact without bill-denomination rounding', async () => {
    renderCheckout({ setup: { ...setup, moneyAccounts: [iqdCashbox, usdCashbox] } })

    fireEvent.change(screen.getByLabelText('Cashbox'), { target: { value: ids.usdCashbox } })
    fireEvent.click(screen.getByRole('button', { name: /Exact/ }))
    expect(screen.getByLabelText('Amount received')).toHaveValue(19.2308)
    expect(screen.getByText('25,000.04 IQD')).toBeInTheDocument()
  })

  it('shows only Cashboxes in the receiving-account selector', async () => {
    const bankAccount: PosMoneyAccount = {
      ...iqdCashbox,
      id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
      code: 'BANK-IQD',
      name: 'Bank account',
      type: MoneyAccountType.Bank,
    }
    renderCheckout({ setup: { ...setup, moneyAccounts: [iqdCashbox, bankAccount] } })

    await waitFor(() => expect(screen.getByLabelText('Cashbox')).toHaveValue(ids.iqdCashbox))
    expect(screen.queryByRole('option', { name: /BANK-IQD/ })).not.toBeInTheDocument()
  })

  it('returns foreign-currency overpayment from an IQD Cashbox', async () => {
    renderCheckout({ setup: { ...setup, moneyAccounts: [iqdCashbox, usdCashbox] } })

    await waitFor(() => expect(screen.getByLabelText('Cashbox')).toHaveValue(''))
    fireEvent.change(screen.getByLabelText('Cashbox'), { target: { value: ids.usdCashbox } })
    await setReceivedAmount('20')
    await waitFor(() => expect(screen.getByLabelText('IQD Cashbox for change')).toHaveValue(ids.iqdCashbox))
    expect(screen.getByText('Change to customer')).toBeInTheDocument()
    expect(screen.getByText('1,000 IQD')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Save Paid Sale/ }))

    await waitFor(() => expect(hooks.complete.mutate).toHaveBeenCalledTimes(1))
    expect(hooks.complete.mutate.mock.calls[0][0]).toMatchObject({
      tenders: [{ moneyAccountId: ids.usdCashbox, amount: 20 }],
      change: { moneyAccountId: ids.iqdCashbox, amount: 1_000 },
    })
  })

  it('blocks foreign-currency overpayment when no IQD Cashbox can return change', async () => {
    renderCheckout({ setup: { ...setup, moneyAccounts: [usdCashbox] } })

    await waitFor(() => expect(screen.getByLabelText('Cashbox')).toHaveValue(ids.usdCashbox))
    await setReceivedAmount('20')
    expect(screen.getByText(/IQD Cashbox is required to return change/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Save Paid Sale/ })).toBeDisabled()
  })
})
