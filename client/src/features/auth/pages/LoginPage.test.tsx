import { render, screen, fireEvent } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LoginPage } from './LoginPage'

const mockToggleTheme = vi.fn()
vi.mock('@/lib/theme', () => ({
  useThemeStore: () => ({
    theme: 'light',
    toggleTheme: mockToggleTheme,
  }),
}))

function renderLoginPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the cover image on the left panel with correct asset path', () => {
    renderLoginPage()

    const coverImages = screen.getAllByRole('img', { name: /Privé Grooming Lounge Pattern Canvas/i })
    expect(coverImages.length).toBeGreaterThan(0)
    expect(coverImages[0]).toHaveAttribute('src', '/assets/images/cover.png')
  })

  it('renders Privé wordmark branding', () => {
    renderLoginPage()

    const wordmarks = screen.getAllByAltText(/^Privé Grooming Lounge$/i)
    expect(wordmarks.length).toBeGreaterThan(0)
    expect(wordmarks[0]).toHaveAttribute('src', '/assets/images/Wordmark.png')
  })

  it('renders the login form with username, password, and sign in button', () => {
    renderLoginPage()

    expect(screen.getByLabelText(/^username$/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sign in to Privé/i })).toBeInTheDocument()
  })

  it('toggles password visibility when the eye button is clicked', () => {
    renderLoginPage()

    const passwordInput = screen.getByLabelText(/^password$/i)
    expect(passwordInput).toHaveAttribute('type', 'password')

    const toggleBtn = screen.getByRole('button', { name: /Show password/i })
    fireEvent.click(toggleBtn)

    expect(passwordInput).toHaveAttribute('type', 'text')

    const hideBtn = screen.getByRole('button', { name: /Hide password/i })
    fireEvent.click(hideBtn)

    expect(passwordInput).toHaveAttribute('type', 'password')
  })

  it('renders LogicBloom copyright and system attribution', () => {
    renderLoginPage()

    const logicBloomLogo = screen.getByAltText(/LogicBloom/i)
    expect(logicBloomLogo).toBeInTheDocument()
    expect(logicBloomLogo).toHaveAttribute('src', '/assets/images/LogicBloom.png')

    expect(screen.getByText(/System copyrighted to/i)).toBeInTheDocument()
    expect(screen.getByText(/LogicBloom\. All rights reserved\./i)).toBeInTheDocument()
  })

  it('triggers theme toggle when clicking the theme switch button', () => {
    renderLoginPage()

    const themeButton = screen.getByRole('button', { name: /Toggle color theme/i })
    expect(themeButton).toBeInTheDocument()

    fireEvent.click(themeButton)
    expect(mockToggleTheme).toHaveBeenCalledTimes(1)
  })
})
