import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalesInvoiceItemsTable } from './SalesInvoiceItemsTable'
import { SalesInvoicePaymentStatus, SalesLineType } from '../types/sales.types'
import type { SalesInvoice, SalesInvoiceFormValues } from '../types/sales.types'
import type { Currency } from '@/features/business'

const mockCurrencyUSD: Currency = {
  id: 'curr-usd',
  code: 'USD',
  name: 'US Dollar',
  symbol: '$',
  decimalPlaces: 2,
  isActive: true,
}

const mockReadOnlyInvoice: SalesInvoice = {
  id: 'inv-1',
  documentNumber: 'SINV-2026-0001',
  customerId: 'cust-1',
  customerName: 'Sarah Jenkins',
  invoiceDate: '2026-09-28',
  branchId: 'branch-1',
  branchCode: 'MAIN',
  branchName: 'Main Atelier',
  warehouseId: 'wh-1',
  warehouseCode: 'CENTRAL',
  warehouseName: 'Central Storage',
  currencyId: 'curr-usd',
  currencyCode: 'USD',
  exchangeRate: 1500,
  baseCurrencyId: 'curr-iqd',
  baseCurrencyCode: 'IQD',
  subtotal: 300,
  total: 300,
  baseTotal: 450000,
  status: 1,
  paymentStatus: SalesInvoicePaymentStatus.Paid,
  notes: 'VIP guest',
  createdByUserId: 'user-1',
  createdByUsername: 'manager',
  createdAtUtc: '2026-09-28T10:00:00Z',
  updatedAtUtc: '2026-09-28T10:00:00Z',
  postedAtUtc: '2026-09-28T10:00:00Z',
  journalEntryId: 'je-1',
  collectedAmount: 300,
  receivableReductionAmount: 0,
  outstandingAmount: 0,
  overpaidAmount: 0,
  payments: [],
  stockMovementIds: [],
  posContext: null,
  lines: [
    {
      id: 'line-1',
      lineType: SalesLineType.Service,
      serviceId: 'srv-1',
      serviceName: 'HydraFacial Deluxe',
      productId: null,
      productName: null,
      sku: null,
      unitOfMeasureId: null,
      unitCode: null,
      professionalId: null,
      professionalName: null,
      description: '60-minute deep rejuvenation',
      quantity: 1,
      unitPrice: 200,
      lineSubtotal: 200,
      lineAmount: 200,
      baseUnitPrice: 300000,
      baseLineAmount: 300000,
      isPriceOverridden: false,
      conversionOperation: null,
      conversionFactor: 1,
      baseQuantity: 1,
    },
    {
      id: 'line-2',
      lineType: SalesLineType.Product,
      serviceId: null,
      serviceName: null,
      productId: 'prod-1',
      productName: 'Rose Glow Serum 50ml',
      sku: 'ROSE-50',
      unitOfMeasureId: 'uom-1',
      unitCode: 'BTL',
      professionalId: null,
      professionalName: null,
      description: null,
      quantity: 2,
      unitPrice: 50,
      lineSubtotal: 100,
      lineAmount: 100,
      baseUnitPrice: 75000,
      baseLineAmount: 150000,
      isPriceOverridden: false,
      conversionOperation: 0,
      conversionFactor: 1,
      baseQuantity: 2,
    },
  ],
}

describe('SalesInvoiceItemsTable', () => {
  afterEach(() => cleanup())

  describe('Read-Only Mode', () => {
    it('renders clean tabular layout with correct column headers, badges, and formatted values', () => {
      render(
        <SalesInvoiceItemsTable
          isReadOnly={true}
          invoice={mockReadOnlyInvoice}
          selectedCurrency={mockCurrencyUSD}
        />
      )

      // Column Headers
      expect(screen.getByRole('columnheader', { name: '#' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Item' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Description' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Unit' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Qty' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Unit Price' })).toBeInTheDocument()
      expect(screen.getByRole('columnheader', { name: 'Total' })).toBeInTheDocument()

      // Line items content
      expect(screen.getByText('HydraFacial Deluxe')).toBeInTheDocument()
      expect(screen.getByText('60-minute deep rejuvenation')).toBeInTheDocument()

      expect(screen.getByText('Rose Glow Serum 50ml (ROSE-50)')).toBeInTheDocument()
      expect(screen.getByText('BTL')).toBeInTheDocument()

      // Financial totals in footer
      expect(screen.getByText('Grand Total')).toBeInTheDocument()
      expect(screen.getAllByText('300.00 USD').length).toBeGreaterThanOrEqual(1)
    })

    it('displays empty state when read-only invoice has no lines', () => {
      render(
        <SalesInvoiceItemsTable
          isReadOnly={true}
          invoice={{ ...mockReadOnlyInvoice, lines: [] }}
          selectedCurrency={mockCurrencyUSD}
        />
      )

      expect(screen.getByText(/no items recorded on this invoice/i)).toBeInTheDocument()
    })
  })

  describe('Editable Mode', () => {
    it('displays empty state illustration and quick action buttons when fields array is empty', () => {
      const onAddService = vi.fn()
      const onAddProduct = vi.fn()

      render(
        <SalesInvoiceItemsTable
          isReadOnly={false}
          fields={[]}
          lines={[]}
          onAddService={onAddService}
          onAddProduct={onAddProduct}
          selectedCurrency={mockCurrencyUSD}
        />
      )

      expect(screen.getByText(/no items added yet/i)).toBeInTheDocument()
      const addServiceButtons = screen.getAllByRole('button', { name: /add service/i })
      expect(addServiceButtons.length).toBeGreaterThanOrEqual(1)

      fireEvent.click(addServiceButtons[0])
      expect(onAddService).toHaveBeenCalledTimes(1)
    })

    it('renders aligned spreadsheet controls for existing lines and handles removals', () => {
      const onRemoveLine = vi.fn()
      const onChangeLineType = vi.fn()

      const mockFields = [
        {
          id: 'field-1',
          lineType: SalesLineType.Service,
          serviceId: 'srv-1',
          productId: '',
          unitOfMeasureId: '',
          description: 'Consultation',
          quantity: 1,
          unitPrice: 100,
          unitPriceBase: 150000,
          useMasterPrice: true,
        },
      ]

      const mockLines: SalesInvoiceFormValues['lines'] = [
        {
          lineType: SalesLineType.Service,
          serviceId: 'srv-1',
          productId: '',
          unitOfMeasureId: '',
          description: 'Consultation',
          quantity: 1,
          unitPrice: 100,
          unitPriceBase: 150000,
          useMasterPrice: true,
        },
      ]

      render(
        <SalesInvoiceItemsTable
          isReadOnly={false}
          fields={mockFields}
          lines={mockLines}
          onRemoveLine={onRemoveLine}
          onChangeLineType={onChangeLineType}
          selectedCurrency={mockCurrencyUSD}
          subtotal={100}
        />
      )

      // Verified accessibility labels for row 1
      expect(screen.getByRole('combobox', { name: 'Service for line 1' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Quantity for line 1' })).toBeInTheDocument()
      expect(screen.getByRole('spinbutton', { name: 'Unit price for line 1' })).toBeInTheDocument()

      const removeBtn = screen.getByRole('button', { name: 'Remove line 1' })
      expect(removeBtn).toBeInTheDocument()
      fireEvent.click(removeBtn)
      expect(onRemoveLine).toHaveBeenCalledWith(0)
    })

    it('renders Add line button when onAddLine is provided', () => {
      const onAddLine = vi.fn()

      render(
        <SalesInvoiceItemsTable
          isReadOnly={false}
          fields={[]}
          lines={[]}
          onAddLine={onAddLine}
          selectedCurrency={mockCurrencyUSD}
        />
      )

      const addLineButtons = screen.getAllByRole('button', { name: /add line/i })
      expect(addLineButtons.length).toBeGreaterThanOrEqual(1)

      fireEvent.click(addLineButtons[0])
      expect(onAddLine).toHaveBeenCalledTimes(1)
    })

    it('opens Add items modal when clicking Add items button', () => {
      const onAddMultipleItems = vi.fn()

      render(
        <SalesInvoiceItemsTable
          isReadOnly={false}
          fields={[]}
          lines={[]}
          onAddMultipleItems={onAddMultipleItems}
          catalogItems={[
            {
              id: 'srv-1',
              name: 'Hair Spa Detox',
              type: SalesLineType.Service,
              basePrice: 120,
              categoryId: 'c-1',
              categoryName: 'Hair',
              isActive: true,
            },
          ]}
          selectedCurrency={mockCurrencyUSD}
        />
      )

      const addItemsButtons = screen.getAllByRole('button', { name: /add items/i })
      expect(addItemsButtons.length).toBeGreaterThanOrEqual(1)

      // Open the modal
      fireEvent.click(addItemsButtons[0])

      // Add Item modal should now be visible
      expect(screen.getByRole('heading', { name: /add items to invoice/i })).toBeInTheDocument()
      expect(screen.getByText('Hair Spa Detox')).toBeInTheDocument()

      // Select item and confirm
      fireEvent.click(screen.getByRole('checkbox', { name: /select hair spa detox/i }))
      fireEvent.click(screen.getByRole('button', { name: /add 1 item/i }))

      expect(onAddMultipleItems).toHaveBeenCalledTimes(1)
      expect(onAddMultipleItems).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'srv-1', name: 'Hair Spa Detox' }),
      ])
    })
  })
})
