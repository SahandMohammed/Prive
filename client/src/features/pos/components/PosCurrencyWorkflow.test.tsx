import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MoneyAccountType } from '@/features/finance'
import { CheckoutDialog } from './CheckoutDialog'
import { OpenSessionScreen } from './OpenSessionScreen'
import { PosReceiptPage } from '../pages/PosReceiptPage'
import { PosCatalogItemType, PosPaymentMode, PosSaleStatus } from '../types/pos.types'
import type { PosCartLine, PosSale, PosSetup } from '../types/pos.types'

const hooks = vi.hoisted(() => ({
  complete: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null },
  open: { mutate: vi.fn(), isPending: false, error: null },
  saleQuery: { data: undefined as PosSale | undefined, isPending: false, isError: false, error: null },
}))

vi.mock('../hooks/usePos', () => ({
  useCompletePosSale: () => hooks.complete,
  useOpenPosSession: () => hooks.open,
  usePosSale: () => hooks.saleQuery,
}))

const ids = {
  branch: '11111111-1111-4111-8111-111111111111',
  register: '22222222-2222-4222-8222-222222222222',
  iqd: '33333333-3333-4333-8333-333333333333',
  usd: '44444444-4444-4444-8444-444444444444',
  iqdAccount: '55555555-5555-4555-8555-555555555555',
  usdAccount: '66666666-6666-4666-8666-666666666666',
}

const setup: PosSetup = {
  baseCurrencyId: ids.iqd,
  baseCurrencyCode: 'IQD',
  branches: [{ id: ids.branch, code: 'MAIN', name: 'Main', isMainBranch: true }],
  warehouses: [],
  categories: [],
  professionals: [],
  moneyAccounts: [
    {
      id: ids.iqdAccount,
      code: 'CASHIER-MAIN-IQD',
      name: 'IQD Cash',
      type: MoneyAccountType.Cashbox,
      branchId: ids.branch,
      currencyId: ids.iqd,
      currencyCode: 'IQD',
      balance: 0,
      currentExchangeRate: 1,
    },
    {
      id: ids.usdAccount,
      code: 'CASHIER-MAIN-USD',
      name: 'USD Cash',
      type: MoneyAccountType.Cashbox,
      branchId: ids.branch,
      currencyId: ids.usd,
      currencyCode: 'USD',
      balance: 0,
      currentExchangeRate: null,
    },
  ],
}

const cart: PosCartLine[] = [{
  item: {
    itemType: PosCatalogItemType.Service,
    id: '77777777-7777-4777-8777-777777777777',
    name: 'Service',
    categoryId: '88888888-8888-4888-8888-888888888888',
    categoryName: 'Services',
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
  professionalUserId: '',
}]

beforeEach(() => {
  vi.clearAllMocks()
  hooks.saleQuery.data = undefined
})
afterEach(cleanup)

describe('POS currency availability', () => {
  it('keeps a rate-missing USD account visible but disabled at checkout', async () => {
    render(
      <CheckoutDialog
        open
        setup={setup}
        branchId={ids.branch}
        sessionId="99999999-9999-4999-8999-999999999999"
        warehouseId=""
        customerId={null}
        cart={cart}
        onOpenChange={vi.fn()}
        onCompleted={vi.fn()}
      />
    )

    const usdOption = await screen.findByRole('option', {
      name: /CASHIER-MAIN-USD.*USD.*Rate missing/,
    })
    expect(usdOption).toBeDisabled()
    expect(screen.getByRole('option', { name: /CASHIER-MAIN-IQD.*IQD/ })).toBeEnabled()
  })

  it('opens an IQD session while explaining that USD is unavailable', async () => {
    render(
      <OpenSessionScreen
        setup={setup}
        branch={setup.branches[0]}
        registers={[{
          id: ids.register,
          code: 'MAIN',
          name: 'Main POS',
          branchId: ids.branch,
          isActive: true,
        }]}
        cashier="cashier"
        onExit={vi.fn()}
      />
    )

    expect(screen.getByText(/USD cash is unavailable because its rate to IQD is missing/)).toBeInTheDocument()
    expect(screen.getAllByRole('spinbutton')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))
    await waitFor(() => expect(hooks.open.mutate).toHaveBeenCalledWith({
      registerId: ids.register,
      openingCounts: [{ currencyId: ids.iqd, amount: 0 }],
      notes: null,
    }))
  })
})

describe('POS receipt currency snapshots', () => {
  it('renders the persisted USD rate and base equivalent unambiguously', () => {
    hooks.saleQuery.data = receiptSale()
    render(
      <MemoryRouter initialEntries={['/pos/sales/sale-1']}>
        <Routes>
          <Route path="/pos/sales/:id" element={<PosReceiptPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText('Rate: 1 USD = 1,300 IQD')).toBeInTheDocument()
    expect(screen.getByText('Equivalent: 13,000 IQD')).toBeInTheDocument()
    expect(screen.getByText('Total received')).toBeInTheDocument()
  })
})

function receiptSale(): PosSale {
  return {
    id: 'sale-1',
    documentNumber: 'POS-000001',
    status: PosSaleStatus.Completed,
    posSessionId: 'session-1',
    salesInvoiceId: 'invoice-1',
    customerId: null,
    customerName: null,
    branchId: ids.branch,
    branchCode: 'MAIN',
    branchName: 'Main',
    warehouseId: null,
    warehouseCode: null,
    warehouseName: null,
    baseCurrencyId: ids.iqd,
    baseCurrencyCode: 'IQD',
    subtotal: 25_000,
    total: 25_000,
    tenderedBaseAmount: 25_000,
    changeBaseAmount: 0,
    settledBaseAmount: 25_000,
    outstandingBaseAmount: 0,
    paymentMode: PosPaymentMode.Paid,
    cashierUserId: 'cashier-1',
    cashierUsername: 'cashier',
    completedAtUtc: '2026-09-13T13:00:00Z',
    journalEntryId: 'journal-1',
    stockMovementIds: [],
    lines: [],
    tenders: [
      {
        id: 'tender-usd',
        sequence: 1,
        moneyAccountId: ids.usdAccount,
        moneyAccountCode: 'CASHIER-MAIN-USD',
        moneyAccountName: 'USD Cash',
        currencyId: ids.usd,
        currencyCode: 'USD',
        tenderedAmount: 10,
        exchangeRate: 1_300,
        baseAmount: 13_000,
        moneyLedgerEntryId: 'ledger-usd',
      },
      {
        id: 'tender-iqd',
        sequence: 2,
        moneyAccountId: ids.iqdAccount,
        moneyAccountCode: 'CASHIER-MAIN-IQD',
        moneyAccountName: 'IQD Cash',
        currencyId: ids.iqd,
        currencyCode: 'IQD',
        tenderedAmount: 12_000,
        exchangeRate: 1,
        baseAmount: 12_000,
        moneyLedgerEntryId: 'ledger-iqd',
      },
    ],
    change: null,
  }
}
