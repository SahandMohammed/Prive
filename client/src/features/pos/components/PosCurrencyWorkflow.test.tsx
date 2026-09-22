import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MoneyAccountType } from '@/features/finance'
import { CheckoutDialog } from './CheckoutDialog'
import { OpenSessionScreen } from './OpenSessionScreen'
import { PosReceiptPage } from '../pages/PosReceiptPage'
import { PosCatalogItemType, PosPaymentMode, PosSaleStatus } from '../types/pos.types'
import type { PosCartLine, PosSale, PosSession, PosSetup } from '../types/pos.types'

const hooks = vi.hoisted(() => ({
  complete: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null },
  open: { mutate: vi.fn(), isPending: false, error: null },
  saleQuery: { data: undefined as PosSale | undefined, isPending: false, isError: false, error: null },
  activeSession: undefined as PosSession | null | undefined,
  setup: undefined as PosSetup | undefined,
  role: 'Cashier',
}))

vi.mock('../hooks/usePos', () => ({
  useCompletePosSale: () => hooks.complete,
  useOpenPosSession: () => hooks.open,
  usePosSale: () => hooks.saleQuery,
  useActivePosSession: () => ({ data: hooks.activeSession }),
  usePosSetup: () => ({ data: hooks.setup }),
}))

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { role: hooks.role } }),
  hasCapability: (role: string, capability: string) =>
    ['SuperAdmin', 'Owner', 'Manager'].includes(role)
    && ['salesTrace', 'inventoryTrace', 'financeTrace', 'accountingTrace', 'managePos', 'manageDollarRate'].includes(capability),
}))

vi.mock('@/features/business', () => ({ useCurrentBusiness: () => ({ data: undefined }), useBranches: () => ({ data: undefined }) }))

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
  hooks.activeSession = null
  hooks.setup = setup
  hooks.role = 'Cashier'
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
          hasOpenSession: false,
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
    }, expect.objectContaining({
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    })))
  })

  it('offers only registers that do not already have an open session', () => {
    render(
      <OpenSessionScreen
        setup={setup}
        branch={setup.branches[0]}
        registers={[
          {
            id: ids.register,
            code: 'BUSY',
            name: 'Busy POS',
            branchId: ids.branch,
            isActive: true,
            hasOpenSession: true,
          },
          {
            id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            code: 'FREE',
            name: 'Free POS',
            branchId: ids.branch,
            isActive: true,
            hasOpenSession: false,
          },
        ]}
        cashier="cashier"
        onExit={vi.fn()}
      />
    )

    expect(screen.queryByRole('option', { name: /BUSY.*Busy POS/ })).not.toBeInTheDocument()
    expect(screen.getByRole('option', { name: /FREE.*Free POS/ })).toBeEnabled()
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

  it('lets cashiers view refund status without showing posting actions', () => {
    hooks.saleQuery.data = receiptSale()
    render(<MemoryRouter initialEntries={['/pos/sales/sale-1']}><Routes><Route path="/pos/sales/:id" element={<PosReceiptPage />} /></Routes></MemoryRouter>)
    expect(screen.getByText('Not refunded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
    expect(screen.getByText(/requires a Manager, Owner, or SuperAdmin/)).toBeInTheDocument()
  })

  it('requires an open session before management refund buttons are enabled', () => {
    hooks.role = 'Manager'
    hooks.saleQuery.data = receiptSale()
    const { rerender } = render(<MemoryRouter initialEntries={['/pos/sales/sale-1']}><Routes><Route path="/pos/sales/:id" element={<PosReceiptPage />} /></Routes></MemoryRouter>)
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
    expect(screen.getByText(/Open a POS session/)).toBeInTheDocument()

    hooks.activeSession = activeSession()
    rerender(<MemoryRouter initialEntries={['/pos/sales/sale-1']}><Routes><Route path="/pos/sales/:id" element={<PosReceiptPage />} /></Routes></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Refund' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Void remaining' })).toBeInTheDocument()
  })

  it('does not offer another refund after the sale is fully reversed', () => {
    hooks.role = 'Owner'
    hooks.activeSession = activeSession()
    hooks.saleQuery.data = {
      ...receiptSale(), refundedBaseAmount: 25_000, remainingRefundableBaseAmount: 0,
      netSaleBaseAmount: 0, refundStatus: 2,
    }
    render(<MemoryRouter initialEntries={['/pos/sales/sale-1']}><Routes><Route path="/pos/sales/:id" element={<PosReceiptPage />} /></Routes></MemoryRouter>)
    expect(screen.getByText('Fully refunded')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Refund' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Void remaining' })).not.toBeInTheDocument()
  })
})

function activeSession(): PosSession {
  return {
    id: 'session-1', sessionNumber: 'SES-1', branchId: ids.branch, branchCode: 'MAIN', branchName: 'Main',
    registerId: ids.register, registerCode: 'MAIN', registerName: 'Main POS', cashierUserId: 'manager-1',
    cashierUsername: 'manager', status: 0, openedAtUtc: '2026-09-13T12:00:00Z', closedAtUtc: null,
    closedByUserId: null, closedByUsername: null, openingNotes: null, closingNotes: null, openingCounts: [],
  }
}

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
    refundedBaseAmount: 0,
    remainingRefundableBaseAmount: 25_000,
    netSaleBaseAmount: 25_000,
    refundStatus: 0,
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
    refunds: [],
  }
}
