import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProfessionalsPage } from './ProfessionalsPage'

vi.mock('@/features/business', () => ({
  useAllBranches: () => ({
    isLoading: false,
    data: { data: [{ id: '11111111-1111-4111-8111-111111111111', code: 'MAIN', name: 'Main', isActive: true }] },
  }),
}))

vi.mock('../hooks/useProfessionals', () => ({
  useProfessionals: () => ({
    isLoading: false,
    isError: false,
    data: { data: [], meta: { totalCount: 0 } },
  }),
  useProfessionalUserOptions: () => ({ isLoading: false, data: { data: [] } }),
  useSaveProfessional: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
  useSetProfessionalActive: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
  useDeleteProfessional: () => ({ isPending: false, isError: false, mutate: vi.fn() }),
}))

describe('ProfessionalsPage', () => {
  it('renders the empty state and opens a validated create form', () => {
    render(<ProfessionalsPage />)

    expect(screen.getByText('No professionals found.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /add professional/i }))
    expect(screen.getByRole('dialog')).toHaveTextContent('Add professional')
    expect(screen.getByText('POS branches')).toBeInTheDocument()
  })
})
