import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { RouteErrorBoundary } from './RouteErrorBoundary'

let mockError: unknown = null
let mockIsRouteErrorResponse = false

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useRouteError: () => mockError,
    isRouteErrorResponse: () => mockIsRouteErrorResponse,
  }
})

describe('RouteErrorBoundary', () => {
  beforeEach(() => {
    mockError = null
    mockIsRouteErrorResponse = false
  })

  it('renders NotFoundPage when error is a 404 route error response', () => {
    mockError = { status: 404, statusText: 'Not Found', data: 'No route matches' }
    mockIsRouteErrorResponse = true

    render(
      <MemoryRouter>
        <RouteErrorBoundary />
      </MemoryRouter>
    )

    expect(screen.getByText(/Page Not Found/i)).toBeInTheDocument()
    expect(screen.getByText(/Error 404/i)).toBeInTheDocument()
  })

  it('renders generic Application Error when error is an instance of Error', () => {
    mockError = new Error('Database connection failed')
    mockIsRouteErrorResponse = false

    render(
      <MemoryRouter>
        <RouteErrorBoundary />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Application Error/i })).toBeInTheDocument()
    expect(screen.getAllByText(/Database connection failed/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByRole('button', { name: /Reload Page/i })).toBeInTheDocument()
  })

  it('renders status and message when error is a 500 route error response', () => {
    mockError = {
      status: 500,
      statusText: 'Internal Server Error',
      data: { message: 'Server unavailable' },
    }
    mockIsRouteErrorResponse = true

    render(
      <MemoryRouter>
        <RouteErrorBoundary />
      </MemoryRouter>
    )

    expect(screen.getByText(/500 Internal Server Error/i)).toBeInTheDocument()
    expect(screen.getByText(/Server unavailable/i)).toBeInTheDocument()
  })
})
