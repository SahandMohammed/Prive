import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalesLineType } from '@/features/sales'
import { PosRefundReceiptPage } from './PosRefundReceiptPage'
import { PosRefundReason, type PosRefund } from '../types/pos.types'

const refund: PosRefund = {
  id: 'refund-1',
  documentNumber: 'REF-000001',
  posSaleId: 'sale-1',
  posSaleDocumentNumber: 'POS-000001',
  salesInvoiceId: 'invoice-1',
  salesInvoiceDocumentNumber: 'SI-000001',
  branchId: 'branch',
  branchCode: 'MAIN',
  branchName: 'Main',
  posSessionId: 'session',
  posSessionNumber: 'SES-1',
  customerId: null,
  customerName: null,
  reason: PosRefundReason.ProductReturned,
  notes: 'Unopened return',
  isVoid: false,
  status: 0,
  totalRefundBase: 15_000,
  receivableReversalBase: 5_000,
  cashRefundBase: 10_000,
  baseCurrencyId: 'iqd',
  baseCurrencyCode: 'IQD',
  createdByUserId: 'manager',
  createdByUsername: 'manager',
  approvedByUserId: 'manager',
  approvedByUsername: 'manager',
  createdAtUtc: '2026-09-13T12:00:00Z',
  postedAtUtc: '2026-09-13T12:00:00Z',
  journalEntryId: 'journal',
  lines: [
    {
      id: 'line',
      originalSalesInvoiceLineId: 'original',
      lineType: SalesLineType.Product,
      description: 'Shampoo',
      unitCode: 'PC',
      professionalName: null,
      quantity: 1,
      baseQuantity: 1,
      refundAmountBase: 15_000,
      restockProduct: true,
      originalUnitCostBase: 10,
      stockMovementIds: ['movement'],
    },
  ],
  tenders: [
    {
      id: 'tender',
      sequence: 1,
      moneyAccountId: 'usd-account',
      moneyAccountCode: 'CASH-USD',
      moneyAccountName: 'USD Cash',
      currencyId: 'usd',
      currencyCode: 'USD',
      amount: 8,
      exchangeRate: 1_250,
      baseAmount: 10_000,
      moneyLedgerEntryId: 'ledger',
    },
  ],
}

vi.mock('../hooks/usePos', () => ({
  usePosRefund: () => ({ data: refund, isPending: false, isError: false, error: null }),
}))

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { role: 'Manager' } }),
  hasCapability: () => true,
}))

vi.mock('@/features/business', () => ({ useCurrentBusiness: () => ({ data: undefined }), useBranches: () => ({ data: undefined }) }))

afterEach(cleanup)

describe('PosRefundReceiptPage', () => {
  it('renders audit, inventory, AR, physical currency, and refund-time FX snapshots', () => {
    render(
      <MemoryRouter initialEntries={['/pos/refunds/refund-1']}>
        <Routes>
          <Route path="/pos/refunds/:id" element={<PosRefundReceiptPage />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getAllByText('REF-000001').length).toBeGreaterThan(0)
    expect(screen.getByText('Restocked')).toBeInTheDocument()
    expect(screen.getByText(/Refund-time rate: 1 USD = 1,250 IQD/)).toBeInTheDocument()
    expect(screen.getByText('Receivable reduction')).toBeInTheDocument()
    expect(screen.getByText('Physical payout')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Original sale/ })).toHaveAttribute(
      'href',
      '/pos/sales/sale-1'
    )
  })
})
