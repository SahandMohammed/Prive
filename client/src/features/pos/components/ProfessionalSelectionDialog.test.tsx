import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ProfessionalSelectionDialog } from './ProfessionalSelectionDialog'

const professionals = [
  { id: '11111111-1111-4111-8111-111111111111', username: 'Daban' },
  { id: '22222222-2222-4222-8222-222222222222', username: 'Mohammed' },
]

afterEach(cleanup)

describe('ProfessionalSelectionDialog', () => {
  it('requires a Master before continuing and restores the prior selection', () => {
    const onSelect = vi.fn()
    const onContinue = vi.fn()
    render(
      <ProfessionalSelectionDialog
        open
        professionals={professionals}
        selectedProfessionalId={professionals[0].id}
        onSelect={onSelect}
        onContinue={onContinue}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /Daban/ })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: /Mohammed/ }))
    expect(onSelect).toHaveBeenCalledWith(professionals[1].id)
  })

  it('blocks service checkout when no Master is available', () => {
    render(
      <ProfessionalSelectionDialog
        open
        professionals={[]}
        selectedProfessionalId={null}
        onSelect={vi.fn()}
        onContinue={vi.fn()}
        onOpenChange={vi.fn()}
      />
    )

    expect(screen.getByText(/No eligible Masters are available/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
  })
})
