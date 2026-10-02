import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CustomerPicker } from './CustomerPicker'
import type { PosCustomer } from '../types/pos.types'

const { usePosCustomers } = vi.hoisted(() => ({ usePosCustomers: vi.fn() }))

vi.mock('../hooks/usePos', () => ({ usePosCustomers }))

const customers: PosCustomer[] = [
  { id: 'customer-1', name: 'Ava Johnson', primaryPhoneNumber: '555 0101' },
  { id: 'customer-2', name: 'Noah Williams', primaryPhoneNumber: null },
]

beforeEach(() => {
  usePosCustomers.mockReturnValue({
    data: { data: customers },
    isPending: false,
    isError: false,
  })
})

afterEach(cleanup)

describe('CustomerPicker', () => {
  it('defaults to Walk-in customer and offers customer suggestions', () => {
    render(<CustomerPicker customer={null} onChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: 'Customer' })
    expect(input).toHaveValue('Walk-in')

    fireEvent.focus(input)

    expect(screen.getByRole('option', { name: 'Walk-in' })).toHaveAttribute(
      'aria-selected',
      'true'
    )
    expect(screen.getByRole('option', { name: /Ava Johnson.*555 0101/ })).toBeInTheDocument()
  })

  it('selects a suggestion with the keyboard', () => {
    const onChange = vi.fn()
    render(<CustomerPicker customer={null} onChange={onChange} />)

    const input = screen.getByRole('combobox', { name: 'Customer' })
    fireEvent.focus(input)
    fireEvent.keyDown(input, { key: 'ArrowDown' })
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith(customers[0])
  })

  it('searches for typed customer names or phone numbers', async () => {
    render(<CustomerPicker customer={null} onChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: 'Customer' })
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: '555' } })

    await waitFor(() => {
      expect(usePosCustomers).toHaveBeenLastCalledWith({
        page: 1,
        pageSize: 20,
        search: '555',
      })
    })
  })
})
