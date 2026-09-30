import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AddSalesItemModal } from './AddSalesItemModal'
import { SalesLineType } from '../types/sales.types'
import type { SalesCatalogItem } from '../types/sales.types'

const mockCatalogItems: SalesCatalogItem[] = [
  {
    id: 'srv-1',
    name: 'Balayage & Hair Gloss',
    type: SalesLineType.Service,
    basePrice: 180,
    categoryId: 'cat-hair',
    categoryName: 'Hair Styling',
    durationMinutes: 90,
    isActive: true,
  },
  {
    id: 'srv-2',
    name: 'Classic Spa Pedicure',
    type: SalesLineType.Service,
    basePrice: 65,
    categoryId: 'cat-nail',
    categoryName: 'Nail Care',
    durationMinutes: 45,
    isActive: true,
  },
  {
    id: 'prod-1',
    name: 'Keratin Repair Shampoo 250ml',
    type: SalesLineType.Product,
    sku: 'KER-250',
    basePrice: 40,
    categoryId: 'cat-hair',
    categoryName: 'Hair Styling',
    unitOfMeasureId: 'uom-btl',
    unitCode: 'BTL',
    availableQuantity: 15,
    isActive: true,
  },
  {
    id: 'prod-2',
    name: 'Cuticle Revitalizing Oil',
    type: SalesLineType.Product,
    sku: 'OIL-15',
    basePrice: 25,
    categoryId: 'cat-nail',
    categoryName: 'Nail Care',
    unitOfMeasureId: 'uom-pc',
    unitCode: 'PCS',
    availableQuantity: 8,
    isActive: true,
  },
]

describe('AddSalesItemModal', () => {
  afterEach(() => cleanup())

  it('renders modal with items, search input, filter pills, and table columns when open', () => {
    render(
      <AddSalesItemModal
        open={true}
        onOpenChange={vi.fn()}
        onAddItems={vi.fn()}
        items={mockCatalogItems}
        currencyCode="USD"
        currencyDecimals={2}
      />
    )

    expect(screen.getByRole('heading', { name: /add items to invoice/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/search service, product, sku\.\.\./i)).toBeInTheDocument()

    // Filter pills
    expect(screen.getByRole('button', { name: /all \(4\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /services \(2\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /products \(2\)/i })).toBeInTheDocument()

    // Table rows
    expect(screen.getByText('Balayage & Hair Gloss')).toBeInTheDocument()
    expect(screen.getByText('Classic Spa Pedicure')).toBeInTheDocument()
    expect(screen.getByText('Keratin Repair Shampoo 250ml')).toBeInTheDocument()
    expect(screen.getByText('Cuticle Revitalizing Oil')).toBeInTheDocument()
  })

  it('filters items by type when clicking filter buttons', () => {
    render(
      <AddSalesItemModal
        open={true}
        onOpenChange={vi.fn()}
        onAddItems={vi.fn()}
        items={mockCatalogItems}
        currencyCode="USD"
      />
    )

    // Filter to Services only
    fireEvent.click(screen.getByRole('button', { name: /services \(2\)/i }))
    expect(screen.getByText('Balayage & Hair Gloss')).toBeInTheDocument()
    expect(screen.getByText('Classic Spa Pedicure')).toBeInTheDocument()
    expect(screen.queryByText('Keratin Repair Shampoo 250ml')).not.toBeInTheDocument()
    expect(screen.queryByText('Cuticle Revitalizing Oil')).not.toBeInTheDocument()

    // Filter to Products only
    fireEvent.click(screen.getByRole('button', { name: /products \(2\)/i }))
    expect(screen.queryByText('Balayage & Hair Gloss')).not.toBeInTheDocument()
    expect(screen.queryByText('Classic Spa Pedicure')).not.toBeInTheDocument()
    expect(screen.getByText('Keratin Repair Shampoo 250ml')).toBeInTheDocument()
    expect(screen.getByText('Cuticle Revitalizing Oil')).toBeInTheDocument()

    // Return to All
    fireEvent.click(screen.getByRole('button', { name: /all \(4\)/i }))
    expect(screen.getByText('Balayage & Hair Gloss')).toBeInTheDocument()
    expect(screen.getByText('Keratin Repair Shampoo 250ml')).toBeInTheDocument()
  })

  it('filters items by search query (name or SKU)', () => {
    render(
      <AddSalesItemModal
        open={true}
        onOpenChange={vi.fn()}
        onAddItems={vi.fn()}
        items={mockCatalogItems}
        currencyCode="USD"
      />
    )

    const searchInput = screen.getByPlaceholderText(/search service, product, sku\.\.\./i)
    fireEvent.change(searchInput, { target: { value: 'OIL-15' } })

    expect(screen.getByText('Cuticle Revitalizing Oil')).toBeInTheDocument()
    expect(screen.queryByText('Balayage & Hair Gloss')).not.toBeInTheDocument()
    expect(screen.queryByText('Keratin Repair Shampoo 250ml')).not.toBeInTheDocument()

    // Clear search
    const clearBtn = screen.getByRole('button', { name: /clear search/i })
    fireEvent.click(clearBtn)
    expect(screen.getByText('Balayage & Hair Gloss')).toBeInTheDocument()
  })

  it('filters items by category dropdown', () => {
    render(
      <AddSalesItemModal
        open={true}
        onOpenChange={vi.fn()}
        onAddItems={vi.fn()}
        items={mockCatalogItems}
        currencyCode="USD"
      />
    )

    const categorySelect = screen.getByRole('combobox', { name: /filter by category/i })
    fireEvent.change(categorySelect, { target: { value: 'Nail Care' } })

    expect(screen.getByText('Classic Spa Pedicure')).toBeInTheDocument()
    expect(screen.getByText('Cuticle Revitalizing Oil')).toBeInTheDocument()
    expect(screen.queryByText('Balayage & Hair Gloss')).not.toBeInTheDocument()
  })

  it('handles multi-item selection and adds them on confirm', () => {
    const onAddItems = vi.fn()
    const onOpenChange = vi.fn()

    render(
      <AddSalesItemModal
        open={true}
        onOpenChange={onOpenChange}
        onAddItems={onAddItems}
        items={mockCatalogItems}
        currencyCode="USD"
      />
    )

    // Initially 0 items selected and button is disabled
    const addBtn = screen.getByRole('button', { name: /add items/i })
    expect(addBtn).toBeDisabled()

    // Select first service and first product
    const serviceCheckbox = screen.getByRole('checkbox', { name: /select balayage & hair gloss/i })
    fireEvent.click(serviceCheckbox)

    const productCheckbox = screen.getByRole('checkbox', { name: /select keratin repair shampoo 250ml/i })
    fireEvent.click(productCheckbox)

    expect(screen.getByText('2 items selected')).toBeInTheDocument()

    const confirmBtn = screen.getByRole('button', { name: /add 2 items/i })
    expect(confirmBtn).not.toBeDisabled()

    fireEvent.click(confirmBtn)

    expect(onAddItems).toHaveBeenCalledTimes(1)
    expect(onAddItems).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: 'srv-1', name: 'Balayage & Hair Gloss' }),
        expect.objectContaining({ id: 'prod-1', name: 'Keratin Repair Shampoo 250ml' }),
      ])
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('supports Select All visible items toggle', () => {
    render(
      <AddSalesItemModal
        open={true}
        onOpenChange={vi.fn()}
        onAddItems={vi.fn()}
        items={mockCatalogItems}
        currencyCode="USD"
      />
    )

    const selectAllCheckbox = screen.getByRole('checkbox', { name: /select all visible items/i })
    expect(selectAllCheckbox).not.toBeChecked()

    // Select all visible (4 items)
    fireEvent.click(selectAllCheckbox)
    expect(screen.getByText('4 items selected')).toBeInTheDocument()

    // Deselect all
    fireEvent.click(selectAllCheckbox)
    expect(screen.getByText('0 items selected')).toBeInTheDocument()
  })
})
