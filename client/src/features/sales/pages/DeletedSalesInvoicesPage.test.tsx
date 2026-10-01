import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { DeletedSalesInvoicesPage } from './DeletedSalesInvoicesPage'

vi.mock('../hooks/useSales', () => ({
  useDeletedSalesInvoices: () => ({
    data: {
      data: [{
        id: 'invoice-1',
        documentNumber: 'POS-000001',
        invoiceDate: '2026-10-01',
        branchId: 'branch-1',
        branchName: 'Main',
        customerId: 'customer-1',
        customerName: 'Ahmed',
        total: 25_000,
        baseTotal: 25_000,
        postedAtUtc: '2026-10-01T09:00:00Z',
        deletedAtUtc: '2026-10-01T10:00:00Z',
        deletedByUserId: 'user-1',
        deletedByUsername: 'owner',
        deleteReason: 'Duplicate checkout',
        isPosSale: true,
      }],
      meta: { page: 1, pageSize: 20, totalCount: 1, totalPages: 1 },
    },
    isPending: false,
    isError: false,
    error: null,
  }),
  useSalesInvoiceHistory: () => ({
    data: [{
      id: 'activity-1',
      source: 'POS Settlement',
      action: 'corrected',
      reason: 'Correct tender',
      changedByUserId: 'user-1',
      changedByUsername: 'owner',
      changedAtUtc: '2026-10-01T09:30:00Z',
      beforeState: null,
      afterState: null,
    }],
    isPending: false,
    isError: false,
    error: null,
  }),
}))

describe('DeletedSalesInvoicesPage', () => {
  it('shows the history source label for POS settlement activity', () => {
    render(<MemoryRouter><DeletedSalesInvoicesPage /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: 'History' }))

    expect(screen.getByText('POS Settlement')).toBeInTheDocument()
    expect(screen.getByText(/Correct tender/)).toBeInTheDocument()
  })
})
