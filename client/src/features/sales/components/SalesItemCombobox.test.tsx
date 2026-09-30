import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SalesItemCombobox } from './SalesItemCombobox'
import { SalesLineType } from '../types/sales.types'
import type { SalesCatalogItem } from '../types/sales.types'

const mockCatalogItems: SalesCatalogItem[] = [
  {
    id: 'srv-1',
    name: 'Balayage & Tone',
    type: SalesLineType.Service,
    basePrice: 150000,
    categoryId: 'cat-1',
    categoryName: 'Hair',
    durationMinutes: 90,
    isActive: true,
    unitConversions: [],
  },
  {
    id: 'srv-2',
    name: 'Signature Manicure',
    type: SalesLineType.Service,
    basePrice: 35000,
    categoryId: 'cat-2',
    categoryName: 'Nails',
    durationMinutes: 45,
    isActive: true,
    unitConversions: [],
  },
  {
    id: 'prod-1',
    name: 'Argan Hair Oil 100ml',
    type: SalesLineType.Product,
    basePrice: 50000,
    categoryId: 'cat-3',
    categoryName: 'Retail',
    sku: 'ARGAN-100',
    unitOfMeasureId: 'uom-1',
    unitCode: 'BTL',
    unitName: 'Bottle',
    isActive: true,
    unitConversions: [],
  },
  {
    id: 'prod-2',
    name: 'Rose Water Mist 200ml',
    type: SalesLineType.Product,
    basePrice: 25000,
    categoryId: 'cat-3',
    categoryName: 'Retail',
    sku: 'ROSE-200',
    unitOfMeasureId: 'uom-1',
    unitCode: 'BTL',
    unitName: 'Bottle',
    isActive: true,
    unitConversions: [],
  },
]

describe('SalesItemCombobox', () => {
  afterEach(() => cleanup())

  it('renders input with placeholder when no item is selected', () => {
    render(
      <SalesItemCombobox
        items={mockCatalogItems}
        onSelect={vi.fn()}
        placeholder="Search service or product..."
      />
    )

    const input = screen.getByRole('combobox')
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Search service or product...')
  })

  it('opens floating dropdown with curated suggestions on focus or click', () => {
    render(
      <SalesItemCombobox
        items={mockCatalogItems}
        onSelect={vi.fn()}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.getByText('Balayage & Tone')).toBeInTheDocument()
    expect(screen.getByText('Argan Hair Oil 100ml')).toBeInTheDocument()
  })

  it('filters items in real time across services and products when typing', () => {
    render(
      <SalesItemCombobox
        items={mockCatalogItems}
        onSelect={vi.fn()}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'Argan' } })

    expect(screen.getByText('Argan Hair Oil 100ml')).toBeInTheDocument()
    expect(screen.queryByText('Balayage & Tone')).not.toBeInTheDocument()
  })

  it('filters items by SKU when typing a product SKU', () => {
    render(
      <SalesItemCombobox
        items={mockCatalogItems}
        onSelect={vi.fn()}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: 'ROSE-200' } })

    expect(screen.getByText('Rose Water Mist 200ml')).toBeInTheDocument()
    expect(screen.queryByText('Signature Manicure')).not.toBeInTheDocument()
  })

  it('calls onSelect with item data when an option is clicked', () => {
    const onSelect = vi.fn()
    render(
      <SalesItemCombobox
        items={mockCatalogItems}
        onSelect={onSelect}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    const option = screen.getByText('Balayage & Tone')
    fireEvent.click(option)

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'srv-1',
        name: 'Balayage & Tone',
        type: SalesLineType.Service,
        basePrice: 150000,
      })
    )
  })

  it('supports keyboard navigation and Enter to select', () => {
    const onSelect = vi.fn()
    render(
      <SalesItemCombobox
        items={mockCatalogItems}
        onSelect={onSelect}
      />
    )

    const input = screen.getByRole('combobox')
    fireEvent.focus(input)

    // Down arrow to move highlight to item 1
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    // Press Enter to select
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('shows clear button and invokes onClear when cleared', () => {
    const onClear = vi.fn()
    render(
      <SalesItemCombobox
        items={mockCatalogItems}
        value="srv-1"
        lineType={SalesLineType.Service}
        onSelect={vi.fn()}
        onClear={onClear}
      />
    )

    const clearBtn = screen.getByRole('button', { name: /clear selection/i })
    expect(clearBtn).toBeInTheDocument()

    fireEvent.click(clearBtn)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
