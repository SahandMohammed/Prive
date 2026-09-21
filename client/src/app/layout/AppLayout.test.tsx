import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { username: 'owner' } }),
}))

vi.mock('@/features/business', () => ({
  BranchSelector: () => <div>Branch selector</div>,
  BranchWorkspace: ({ children }: { children: ReactNode }) => (
    <div data-testid="branch-workspace">{children}</div>
  ),
  resetBranchSelection: vi.fn(),
}))

vi.mock('@/lib/theme', () => ({
  useThemeStore: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))

vi.mock('@/lib/i18n', () => ({ changeAppLanguage: vi.fn() }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}))

vi.mock('./Sidebar', () => ({ Sidebar: () => <nav>ERP sidebar</nav> }))

function mount(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="*" element={<div>Route content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

afterEach(cleanup)

describe('AppLayout POS routes', () => {
  it('keeps the ERP shell on the POS session dashboard', () => {
    mount('/pos')

    expect(screen.getByText('ERP sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('branch-workspace')).toContainElement(screen.getByText('Route content'))
  })

  it('renders the POS workspace without the ERP shell', () => {
    mount('/pos/workspace')

    expect(screen.queryByText('ERP sidebar')).not.toBeInTheDocument()
    expect(screen.getByTestId('branch-workspace')).toContainElement(screen.getByText('Route content'))
  })
})
