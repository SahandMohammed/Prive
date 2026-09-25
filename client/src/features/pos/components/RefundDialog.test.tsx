import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MoneyAccountType } from '@/features/finance'
import { SalesLineType } from '@/features/sales'
import { RefundDialog } from './RefundDialog'
import type { PosRefundability, PosSession, PosSetup } from '../types/pos.types'

const state = vi.hoisted(() => ({
  post: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as Error | null },
  void: { mutate: vi.fn(), reset: vi.fn(), isPending: false, error: null as Error | null },
  refundability: null as PosRefundability | null,
}))

vi.mock('../hooks/usePos', () => ({
  usePosRefundability: () => ({ data: state.refundability, isPending: false, isError: false, error: null }),
  usePostPosRefund: () => state.post,
  useVoidPosSale: () => state.void,
}))

const id = (digit: string) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`
const ids = { branch: id('1'), base: id('2'), usd: id('3'), baseAccount: id('4'), usdAccount: id('5'), service: id('6'), product: id('7') }
const setup: PosSetup = {
  baseCurrencyId: ids.base, baseCurrencyCode: 'IQD', branches: [], warehouses: [], categories: [], professionals: [],
  moneyAccounts: [
    { id: ids.baseAccount, code: 'CASH-IQD', name: 'IQD Cash', type: MoneyAccountType.Cashbox, branchId: ids.branch, currencyId: ids.base, currencyCode: 'IQD', balance: 100_000, currentExchangeRate: 1 },
    { id: ids.usdAccount, code: 'CASH-USD', name: 'USD Cash', type: MoneyAccountType.Cashbox, branchId: ids.branch, currencyId: ids.usd, currencyCode: 'USD', balance: 100, currentExchangeRate: null },
  ],
}
const session: PosSession = {
  id: id('8'), sessionNumber: 'SES-1', branchId: ids.branch, branchCode: 'MAIN', branchName: 'Main', registerId: id('9'), registerCode: 'POS', registerName: 'POS', cashierUserId: id('a'), cashierUsername: 'manager', status: 0, openedAtUtc: '2026-09-13T12:00:00Z', closedAtUtc: null, closedByUserId: null, closedByUsername: null, openingNotes: null, closingNotes: null, openingCounts: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  state.post.error = null
  state.void.error = null
  state.refundability = refundability()
})
afterEach(cleanup)

describe('RefundDialog', () => {
  it('selects every remaining line for a full void and preserves the product restock choice', async () => {
    render(<RefundDialog saleId="sale" session={session} setup={setup} mode="void" open onOpenChange={vi.fn()} onCompleted={vi.fn()} />)
    await waitFor(() => expect(screen.getByLabelText('Select Haircut')).toBeChecked())
    expect(screen.getByLabelText('Select Shampoo')).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Restock product' })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Post void reversal' })).toBeEnabled()
  })

  it('enforces current account availability and notes when a product is not restocked', async () => {
    render(<RefundDialog saleId="sale" session={session} setup={setup} mode="refund" open onOpenChange={vi.fn()} onCompleted={vi.fn()} />)
    fireEvent.click(await screen.findByLabelText('Select Shampoo'))
    const quantities = screen.getAllByRole('spinbutton')
    fireEvent.change(quantities[1], { target: { value: '1' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Restock product' }))
    fireEvent.click(await screen.findByRole('button', { name: /Exact base payout/ }))
    expect(screen.getByRole('option', { name: /CASH-USD.*rate missing/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Post refund' })).toBeDisabled()
    fireEvent.change(screen.getByPlaceholderText('Operational context for the audit trail'), { target: { value: 'Opened product cannot be resold' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Post refund' })).toBeEnabled())
  })

  it('renders a posting API error without losing the refund form', () => {
    state.post.error = new Error('Another refund changed the remaining quantity')
    render(<RefundDialog saleId="sale" session={session} setup={setup} mode="refund" open onOpenChange={vi.fn()} onCompleted={vi.fn()} />)
    expect(screen.getByText('Another refund changed the remaining quantity')).toBeInTheDocument()
    expect(screen.getByText('Refund lines')).toBeInTheDocument()
  })
})

function refundability(): PosRefundability {
  return {
    posSaleId: 'sale', posSaleDocumentNumber: 'POS-1', salesInvoiceId: 'invoice', salesInvoiceDocumentNumber: 'SI-1', branchId: ids.branch, customerId: null, customerName: null, warehouseId: id('b'), completedAtUtc: '2026-09-13T11:00:00Z', cashierUsername: 'cashier', originalTotalBase: 45_000, refundedBaseAmount: 5_000, remainingRefundableBaseAmount: 40_000, currentOutstandingBaseAmount: 0, refundStatus: 1, baseCurrencyId: ids.base, baseCurrencyCode: 'IQD', refunds: [],
    lines: [
      { salesInvoiceLineId: ids.service, lineType: SalesLineType.Service, description: 'Haircut', sku: null, unitCode: null, professionalName: 'sara', originalQuantity: 1, refundedQuantity: 0, refundableQuantity: 1, originalLineAmountBase: 25_000, refundedAmountBase: 0, refundableAmountBase: 25_000, canRestock: false },
      { salesInvoiceLineId: ids.product, lineType: SalesLineType.Product, description: 'Shampoo', sku: 'SH', unitCode: 'PC', professionalName: null, originalQuantity: 2, refundedQuantity: 1, refundableQuantity: 1, originalLineAmountBase: 20_000, refundedAmountBase: 5_000, refundableAmountBase: 15_000, canRestock: true },
    ],
  }
}
