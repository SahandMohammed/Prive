import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SalesInvoicesPage } from './SalesInvoicesPage'

const mockCurrentUser = vi.hoisted(() => ({ role: 'SuperAdmin' }))
const mockInvoiceQuery = vi.hoisted(() => ({
  data: {
    data: [
      {
        id: 'inv-1',
        documentNumber: 'SINV-2026-0001',
        customerId: 'cust-1',
        customerName: 'Sarah Jenkins',
        invoiceDate: '2026-09-28',
        branchId: 'branch-1',
        branchName: 'Main Atelier',
        warehouseId: 'wh-1',
        warehouseName: 'Central Storage',
        currencyId: 'curr-usd',
        currencyCode: 'USD',
        total: 250,
        baseTotal: 375000,
        status: 1,
        createdByUserId: 'user-1',
        createdByUsername: 'manager',
        createdAtUtc: '2026-09-28T10:00:00Z',
        updatedAtUtc: '2026-09-28T10:00:00Z',
        postedAtUtc: '2026-09-28T10:00:00Z',
      },
      {
        id: 'inv-2',
        documentNumber: 'SINV-2026-0002',
        customerId: null,
        customerName: null,
        invoiceDate: '2026-09-27',
        branchId: 'branch-1',
        branchName: 'Main Atelier',
        warehouseId: null,
        warehouseName: null,
        currencyId: 'curr-iqd',
        currencyCode: 'IQD',
        total: 120000,
        baseTotal: 120000,
        status: 1,
        createdByUserId: 'user-2',
        createdByUsername: 'cashier',
        createdAtUtc: '2026-09-27T14:00:00Z',
        updatedAtUtc: '2026-09-27T14:00:00Z',
        postedAtUtc: '2026-09-27T14:00:00Z',
      },
    ],
    meta: {
      page: 1,
      pageSize: 20,
      totalCount: 2,
      totalPages: 1,
    },
  },
  isPending: false,
  isError: false,
  error: null,
}))

const mockDeleteMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
}))

let lastInvoiceFilters: Record<string, unknown> = {}

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { role: mockCurrentUser.role } }),
  hasCapability: () => true,
}))

vi.mock('@/features/business', () => ({
  useBranches: () => ({
    data: {
      data: [{ id: 'branch-1', name: 'Main Atelier' }],
    },
  }),
  useCurrencies: () => ({
    data: {
      data: [
        { id: 'curr-usd', code: 'USD', name: 'US Dollar' },
        { id: 'curr-iqd', code: 'IQD', name: 'Iraqi Dinar' },
      ],
    },
  }),
}))

vi.mock('@/features/contacts', () => ({
  useContacts: () => ({
    data: {
      data: [{ id: 'cust-1', name: 'Sarah Jenkins' }],
    },
  }),
}))

vi.mock('../hooks/useSales', () => ({
  useSalesInvoices: (filters: Record<string, unknown>) => {
    lastInvoiceFilters = filters
    return mockInvoiceQuery
  },
  useDeleteActiveSalesInvoice: () => mockDeleteMutation,
}))

function renderComponent() {
  return render(
    <MemoryRouter>
      <SalesInvoicesPage />
    </MemoryRouter>
  )
}

describe('SalesInvoicesPage', () => {
  beforeEach(() => {
    lastInvoiceFilters = {}
    vi.clearAllMocks()
  })

  afterEach(() => cleanup())

  it('renders page header, count badge, and new invoice button', () => {
    renderComponent()

    expect(screen.getByRole('heading', { level: 1, name: /sales invoices/i })).toBeInTheDocument()
    expect(screen.getByText('2 invoices')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /new sales invoice/i })).toBeInTheDocument()
  })

  it('renders sales invoice rows with customer, date, amount, and walk-in indicator', () => {
    renderComponent()

    expect(screen.getByText('SINV-2026-0001')).toBeInTheDocument()
    expect(screen.getAllByText('Sarah Jenkins').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('SINV-2026-0002')).toBeInTheDocument()
    expect(screen.getByText(/walk-in customer/i)).toBeInTheDocument()
    expect(screen.getByText(/250 USD/)).toBeInTheDocument()
    expect(screen.getByText(/120,000 IQD/)).toBeInTheDocument()
  })

  it('provides sortable column headers with correct default sorting', () => {
    renderComponent()

    // Default sorting is date desc
    expect(lastInvoiceFilters.sortBy).toBe('date')
    expect(lastInvoiceFilters.sortDescending).toBe(true)

    // Click Document header to sort by document
    const docHeader = screen.getByRole('button', { name: /document/i })
    fireEvent.click(docHeader)

    expect(lastInvoiceFilters.sortBy).toBe('document')
    expect(lastInvoiceFilters.sortDescending).toBe(false)

    // Click Document header again to toggle to descending
    fireEvent.click(docHeader)
    expect(lastInvoiceFilters.sortBy).toBe('document')
    expect(lastInvoiceFilters.sortDescending).toBe(true)
  })

  it('supports filtering by search and displaying active filter chips', () => {
    renderComponent()

    const searchInput = screen.getByPlaceholderText(/search document # or customer/i)
    fireEvent.change(searchInput, { target: { value: 'Sarah' } })

    expect(lastInvoiceFilters.search).toBe('Sarah')
    expect(screen.getByText('Search: "Sarah"')).toBeInTheDocument()

    // Remove search filter via chip
    const removeSearchBtn = screen.getByRole('button', { name: /remove filter search: "sarah"/i })
    fireEvent.click(removeSearchBtn)

    expect(lastInvoiceFilters.search).toBeUndefined()
  })

  it('supports date presets and updates filter criteria', () => {
    renderComponent()

    const datePresetSelect = screen.getByLabelText(/date preset filter/i)
    fireEvent.change(datePresetSelect, { target: { value: 'today' } })

    expect(lastInvoiceFilters.fromDate).toBeDefined()
    expect(lastInvoiceFilters.toDate).toBeDefined()
    expect(screen.getByText(/date: today/i)).toBeInTheDocument()
  })

  it('toggles secondary advanced filters panel for branch, currency, and custom dates', () => {
    renderComponent()

    expect(screen.queryByLabelText(/branch filter/i)).not.toBeInTheDocument()

    const filtersBtn = screen.getByRole('button', { name: /toggle secondary filters/i })
    fireEvent.click(filtersBtn)

    expect(screen.getByLabelText(/branch filter/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/currency filter/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/from date/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/to date/i)).toBeInTheDocument()
  })

  it('renders row action buttons: primary view, edit button, and more actions dropdown', () => {
    renderComponent()

    const viewLinks = screen.getAllByRole('link', { name: /view invoice/i })
    expect(viewLinks.length).toBe(2)
    expect(viewLinks[0]).toHaveAttribute('href', '/sales/invoices/inv-1')

    const editLinks = screen.getAllByRole('link', { name: /edit invoice/i })
    expect(editLinks.length).toBe(2)
    expect(editLinks[0]).toHaveAttribute('href', '/sales/invoices/inv-1?edit=true')

    const actionDropdowns = screen.getAllByRole('button', { name: /actions for invoice/i })
    expect(actionDropdowns.length).toBe(2)
  })

  it('clears all filters when Reset button is clicked', () => {
    renderComponent()

    const searchInput = screen.getByPlaceholderText(/search document # or customer/i)
    fireEvent.change(searchInput, { target: { value: 'SINV' } })

    const resetBtn = screen.getByRole('button', { name: /reset/i })
    fireEvent.click(resetBtn)

    expect(lastInvoiceFilters.search).toBeUndefined()
  })
})
