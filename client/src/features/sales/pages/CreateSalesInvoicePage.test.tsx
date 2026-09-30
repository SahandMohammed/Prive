import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CreateSalesInvoicePage } from './CreateSalesInvoicePage'

const mockCurrentUser = vi.hoisted(() => ({ role: 'SuperAdmin' }))

const mockExistingInvoice = vi.hoisted(() => ({
  id: 'inv-123',
  documentNumber: 'SINV-2026-0042',
  customerId: 'cust-1',
  customerName: 'Sarah Jenkins',
  invoiceDate: '2026-09-28',
  branchId: 'branch-1',
  branchName: 'Main Atelier',
  warehouseId: 'wh-1',
  warehouseName: 'Central Storage',
  currencyId: 'curr-usd',
  currencyCode: 'USD',
  exchangeRate: 1500,
  baseCurrencyId: 'curr-iqd',
  baseCurrencyCode: 'IQD',
  total: 250,
  subtotal: 250,
  baseTotal: 375000,
  status: 1,
  paymentStatus: 2, // Paid
  notes: 'VIP customer consultation',
  createdByUserId: 'user-1',
  createdByUsername: 'manager',
  createdAtUtc: '2026-09-28T10:00:00Z',
  updatedAtUtc: '2026-09-28T10:00:00Z',
  postedAtUtc: '2026-09-28T10:00:00Z',
  lines: [
    {
      id: 'line-1',
      lineType: 0, // Service
      serviceId: 'srv-1',
      serviceName: 'Full Hair Coloring',
      productId: null,
      productName: null,
      unitOfMeasureId: null,
      unitOfMeasureName: null,
      sku: null,
      unitCode: null,
      quantity: 1,
      unitPrice: 150,
      lineSubtotal: 150,
      lineAmount: 150,
      baseUnitPrice: 225000,
      baseLineAmount: 225000,
      isPriceOverridden: false,
      conversionOperation: null,
      conversionFactor: 1,
      description: 'Luxe balayage and tone',
    },
    {
      id: 'line-2',
      lineType: 1, // Product
      serviceId: null,
      serviceName: null,
      productId: 'prod-1',
      productName: 'Argan Hair Oil 100ml',
      unitOfMeasureId: 'uom-1',
      unitOfMeasureName: 'Bottle',
      sku: 'OIL-100',
      unitCode: 'BTL',
      quantity: 2,
      unitPrice: 50,
      lineSubtotal: 100,
      lineAmount: 100,
      baseUnitPrice: 75000,
      baseLineAmount: 150000,
      isPriceOverridden: false,
      conversionOperation: 0,
      conversionFactor: 1,
      description: null,
    },
  ],
  posContext: null,
  journalEntryId: 'je-123',
  collectedAmount: 250,
  receivableReductionAmount: 0,
  outstandingAmount: 0,
  overpaidAmount: 0,
  payments: [],
  stockMovementIds: [],
}))

const mockAuditHistory = vi.hoisted(() => [
  {
    id: 'aud-1',
    action: 'Created',
    changedByUserId: 'user-1',
    changedByUsername: 'manager',
    changedAtUtc: '2026-09-28T10:00:00Z',
    reason: 'Initial sale creation',
    beforeState: null,
    afterState: { total: 250 },
  },
])

let currentInvoiceData: unknown = null
const mockCreateMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  error: null,
  reset: vi.fn(),
}))
const mockUpdateMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  error: null,
  reset: vi.fn(),
}))
const mockDeleteMutation = vi.hoisted(() => ({
  mutate: vi.fn(),
  isPending: false,
  error: null,
  reset: vi.fn(),
}))

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { role: mockCurrentUser.role } }),
  hasCapability: () => true,
}))

vi.mock('@/features/business', () => ({
  useBranches: () => ({
    data: { data: [{ id: 'branch-1', name: 'Main Atelier' }] },
  }),
  useCurrencies: () => ({
    data: {
      data: [
        { id: 'curr-usd', code: 'USD', name: 'US Dollar', symbol: '$' },
        { id: 'curr-iqd', code: 'IQD', name: 'Iraqi Dinar', symbol: 'IQD' },
      ],
    },
  }),
  useCurrentBusiness: () => ({
    data: { id: 'biz-1', baseCurrencyId: 'curr-iqd' },
  }),
  getSelectedBranchId: () => 'branch-1',
}))

vi.mock('@/features/contacts', () => ({
  useContacts: () => ({
    data: { data: [{ id: 'cust-1', name: 'Sarah Jenkins', phone: '+123456789' }] },
  }),
}))

vi.mock('@/features/finance', () => ({
  useEffectiveExchangeRate: () => ({
    data: { rate: 1500 },
  }),
}))

vi.mock('@/features/inventory', () => ({
  useProducts: () => ({
    data: {
      data: [
        {
          id: 'prod-1',
          name: 'Argan Hair Oil 100ml',
          sku: 'OIL-100',
          baseUnitPrice: 75000,
          inventoryUnitOfMeasureId: 'uom-1',
          unitsOfMeasure: [{ unitOfMeasureId: 'uom-1', name: 'Bottle', conversionFactor: 1, conversionOperation: 0 }],
        },
      ],
    },
  }),
  useStockBalances: () => ({
    data: {
      data: [{ productId: 'prod-1', warehouseId: 'wh-1', quantityOnHand: 25 }],
    },
  }),
  useWarehouses: () => ({
    data: {
      data: [{ id: 'wh-1', name: 'Central Storage', branchId: 'branch-1', isActive: true }],
    },
  }),
  productUnitOptions: () => [{ id: 'uom-1', label: 'Bottle', factor: 1, operation: 0 }],
  convertBasePriceToUnitPrice: (price: number) => price,
  convertUnitPriceToBasePrice: (price: number) => price,
  convertToBaseQuantity: (qty: number) => qty,
}))

vi.mock('../hooks/useSales', () => ({
  useSalesInvoice: () => ({
    data: currentInvoiceData,
    isPending: false,
    isError: false,
    error: null,
  }),
  useSalesInvoiceHistory: () => ({
    data: mockAuditHistory,
    isPending: false,
    isError: false,
    error: null,
  }),
  useServices: () => ({
    data: {
      data: [{ id: 'srv-1', name: 'Full Hair Coloring', durationMinutes: 120, basePrice: 225000 }],
    },
  }),
  useSalesItems: () => ({
    data: {
      data: [
        { id: 'srv-1', name: 'Full Hair Coloring', type: 0, basePrice: 225000, durationMinutes: 120, isActive: true },
        { id: 'prod-1', name: 'Argan Hair Oil 100ml', type: 1, basePrice: 75000, sku: 'OIL-100', isActive: true },
      ],
    },
  }),
  useCreateActiveSalesInvoice: () => mockCreateMutation,
  useUpdateActiveSalesInvoice: () => mockUpdateMutation,
  useDeleteActiveSalesInvoice: () => mockDeleteMutation,
}))

function renderPage(initialEntries = ['/sales/invoices/new']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/sales/invoices/new" element={<CreateSalesInvoicePage />} />
        <Route path="/sales/invoices/:id" element={<CreateSalesInvoicePage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('CreateSalesInvoicePage', () => {
  beforeEach(() => {
    currentInvoiceData = null
    vi.clearAllMocks()
  })

  afterEach(() => cleanup())

  describe('New Invoice Mode', () => {
    it('renders new invoice layout with full-width modern styling and without edit warning', () => {
      renderPage(['/sales/invoices/new'])

      expect(screen.getByRole('heading', { level: 1, name: /new sales invoice/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save invoice/i })).toBeInTheDocument()
      expect(screen.queryByText(/editing a posted invoice/i)).not.toBeInTheDocument()
    })

    it('initializes with a default empty line and allows adding more lines', () => {
      renderPage(['/sales/invoices/new'])

      // Line 1 is always present by default on new invoice
      expect(screen.getByRole('combobox', { name: /service for line 1/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /remove line 1/i })).toBeInTheDocument()

      const addLineBtn = screen.getByRole('button', { name: /add line/i })
      expect(addLineBtn).toBeInTheDocument()

      fireEvent.click(addLineBtn)
      // Second line is now added
      expect(screen.getByRole('combobox', { name: /service for line 2/i })).toBeInTheDocument()
    })

    it('supports selecting items from Add Items modal and inserts them into the invoice', () => {
      renderPage(['/sales/invoices/new'])

      const addItemsBtn = screen.getByRole('button', { name: /add items/i })
      expect(addItemsBtn).toBeInTheDocument()

      fireEvent.click(addItemsBtn)

      // Modal appears
      expect(screen.getByRole('heading', { name: /add items to invoice/i })).toBeInTheDocument()
      expect(screen.getByText('Full Hair Coloring')).toBeInTheDocument()
      expect(screen.getByText('Argan Hair Oil 100ml')).toBeInTheDocument()

      // Select both items
      fireEvent.click(screen.getByRole('checkbox', { name: /select full hair coloring/i }))
      fireEvent.click(screen.getByRole('checkbox', { name: /select argan hair oil 100ml/i }))

      // Click Add 2 items
      fireEvent.click(screen.getByRole('button', { name: /add 2 items/i }))

      // Both items are now populated in the invoice lines
      expect(screen.getByRole('combobox', { name: /service for line 1/i })).toHaveValue('Full Hair Coloring')
      expect(screen.getByRole('combobox', { name: /product for line 2/i })).toHaveValue('Argan Hair Oil 100ml (OIL-100)')
    })
  })

  describe('Existing Invoice Read-Only Mode', () => {
    beforeEach(() => {
      currentInvoiceData = mockExistingInvoice
    })

    it('displays invoice document number, status badge, and clean read-only items table', () => {
      renderPage(['/sales/invoices/inv-123'])

      expect(screen.getByRole('heading', { level: 1, name: 'SINV-2026-0042' })).toBeInTheDocument()
      expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1)
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument()

      // Read-only presentation: items table contains descriptions and amounts without input controls
      expect(screen.getByText('Full Hair Coloring')).toBeInTheDocument()
      expect(screen.getByText(/Argan Hair Oil 100ml/)).toBeInTheDocument()
      expect(screen.getByText('Luxe balayage and tone')).toBeInTheDocument()

      // Should not have the amber edit warning banner
      expect(screen.queryByText(/editing a posted invoice/i)).not.toBeInTheDocument()
    })

    it('opens audit history modal when History button is clicked', () => {
      renderPage(['/sales/invoices/inv-123'])

      const historyBtn = screen.getByRole('button', { name: /history/i })
      fireEvent.click(historyBtn)

      // Audit History dialog should open
      expect(screen.getByRole('heading', { name: /audit history/i })).toBeInTheDocument()
      expect(screen.getByText('Initial sale creation')).toBeInTheDocument()
      expect(screen.getByText('manager')).toBeInTheDocument()
    })

    it('enters edit mode when clicking Edit button', () => {
      renderPage(['/sales/invoices/inv-123'])

      const editBtn = screen.getByRole('button', { name: /edit/i })
      fireEvent.click(editBtn)

      // Header indicates Editing
      expect(screen.getByText('Editing')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()

      // Still no amber warning banner
      expect(screen.queryByText(/editing a posted invoice/i)).not.toBeInTheDocument()
    })
  })

  describe('Existing Invoice Direct Edit URL (?edit=true)', () => {
    beforeEach(() => {
      currentInvoiceData = mockExistingInvoice
    })

    it('directly enters edit mode when edit=true in query parameters', () => {
      renderPage(['/sales/invoices/inv-123?edit=true'])

      expect(screen.getByText('Editing')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
      expect(screen.queryByText(/editing a posted invoice/i)).not.toBeInTheDocument()
    })
  })
})
