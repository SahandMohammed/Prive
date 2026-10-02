import type { ReactNode } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from './AppLayout'

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { username: 'owner' } }),
  hasCapability: () => false,
}))

vi.mock('@/features/business', () => ({
  BranchSelector: () => <div>Branch selector</div>,
  BranchWorkspace: ({ children }: { children: ReactNode }) => (
    <div data-testid="branch-workspace">{children}</div>
  ),
  resetBranchSelection: vi.fn(),
}))

vi.mock('@/features/finance', () => ({
  DollarRatePopover: () => <div>Dollar rate control</div>,
}))

vi.mock('@/lib/theme', () => ({
  useThemeStore: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}))

vi.mock('@/lib/i18n', () => ({
  changeAppLanguage: vi.fn(),
  isRtlLanguage: () => false,
  languages: {
    en: { code: 'en', nativeName: 'English' },
    ckb: { code: 'ckb', nativeName: 'کوردی' },
    ar: { code: 'ar', nativeName: 'العربية' },
  },
}))

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
  it('renders the POS workspace without the ERP shell', () => {
    mount('/pos')

    expect(screen.queryByText('ERP sidebar')).not.toBeInTheDocument()
    expect(screen.queryByText('Dollar rate control')).not.toBeInTheDocument()
    expect(screen.getByTestId('branch-workspace')).toContainElement(screen.getByText('Route content'))
  })

  it('keeps the ERP shell on POS receipt routes', () => {
    mount('/pos/sales/invoice-1')

    expect(screen.getByText('ERP sidebar')).toBeInTheDocument()
    expect(screen.getByText('Dollar rate control')).toBeInTheDocument()
    expect(screen.getByTestId('branch-workspace')).toContainElement(screen.getByText('Route content'))
  })
})
