import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { NotFoundPage } from './NotFoundPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('NotFoundPage', () => {
  it('renders 404 header, badge, and descriptive message', () => {
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    expect(screen.getByText(/Error 404/i)).toBeInTheDocument()
    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument()
    expect(
      screen.getByText(/The page or resource you are looking for does not exist/i)
    ).toBeInTheDocument()
  })

  it('navigates to dashboard when "Go to Dashboard" button is clicked', () => {
    mockNavigate.mockClear()
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const dashboardBtn = screen.getByRole('button', { name: /Go to Dashboard/i })
    fireEvent.click(dashboardBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
  })

  it('renders quick navigation links and navigates when clicked', () => {
    mockNavigate.mockClear()
    render(
      <MemoryRouter>
        <NotFoundPage />
      </MemoryRouter>
    )

    const posBtn = screen.getByRole('button', { name: /POS Terminal/i })
    expect(posBtn).toBeInTheDocument()
    fireEvent.click(posBtn)

    expect(mockNavigate).toHaveBeenCalledWith('/pos')
  })

  it('renders correctly in standalone mode', () => {
    render(
      <MemoryRouter>
        <NotFoundPage standalone />
      </MemoryRouter>
    )

    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument()
  })
})
