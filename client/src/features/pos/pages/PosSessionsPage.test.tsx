import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { posApi } from '../api/pos.api'
import { PosSessionStatus } from '../types/pos.types'
import type { PosSession, PosSetup } from '../types/pos.types'
import { PosSessionsPage } from './PosSessionsPage'

vi.mock('@/features/auth', () => ({ useCurrentUser: () => ({ data: { role: 'Owner', username: 'owner' } }) }))
vi.mock('../api/pos.api', () => ({
  posApi: {
    setup: vi.fn(),
    registers: vi.fn(),
    activeSession: vi.fn(),
    openSession: vi.fn(),
    sessions: vi.fn(),
    zReports: vi.fn(),
    createRegister: vi.fn(),
    updateRegister: vi.fn(),
  },
}))

const setup: PosSetup = {
  baseCurrencyId: '33333333-3333-4333-8333-333333333333',
  baseCurrencyCode: 'IQD',
  branches: [{
    id: '11111111-1111-4111-8111-111111111111',
    code: 'MAIN',
    name: 'Main',
    isMainBranch: true,
  }],
  warehouses: [],
  categories: [],
  professionals: [],
  moneyAccounts: [],
}

const register = {
  id: '22222222-2222-4222-8222-222222222222',
  code: 'RECEPTION',
  name: 'Reception POS',
  branchId: setup.branches[0].id,
  isActive: true,
  hasOpenSession: false,
}

const meta = (page = 1, pageSize = 20, totalCount = 61) => ({
  page,
  pageSize,
  totalCount,
  totalPages: Math.ceil(totalCount / pageSize),
  hasPreviousPage: page > 1,
  hasNextPage: page * pageSize < totalCount,
})

function currentSession(): PosSession {
  return {
    id: 'session-1',
    sessionNumber: 'SES-000001',
    branchId: setup.branches[0].id,
    branchCode: 'MAIN',
    branchName: 'Main',
    registerId: register.id,
    registerCode: register.code,
    registerName: register.name,
    cashierUserId: 'user-1',
    cashierUsername: 'owner',
    status: PosSessionStatus.Open,
    openedAtUtc: '2026-09-21T08:00:00Z',
    closedAtUtc: null,
    closedByUserId: null,
    closedByUsername: null,
    openingNotes: null,
    closingNotes: null,
    openingCounts: [],
  }
}

function currentSessionSummary() {
  return {
    id: 'session-1',
    sessionNumber: 'SES-000001',
    registerId: register.id,
    registerCode: register.code,
    registerName: register.name,
    cashierUserId: 'user-1',
    cashierUsername: 'owner',
    status: PosSessionStatus.Open,
    openedAtUtc: '2026-09-21T08:00:00Z',
    closedAtUtc: null,
    saleCount: 3,
    grossSalesBase: 75_000,
    varianceBase: 0,
    baseCurrencyCode: 'IQD',
  }
}

function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/pos']}>
        <Routes>
          <Route path="/pos" element={<PosSessionsPage />} />
          <Route path="/pos/workspace" element={<div>POS workspace route</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

let workspaceWindow: {
  opener: Window | null
  location: { href: string }
  close: ReturnType<typeof vi.fn>
}

beforeEach(() => {
  vi.resetAllMocks()
  workspaceWindow = {
    opener: window,
    location: { href: '' },
    close: vi.fn(),
  }
  vi.spyOn(window, 'open').mockImplementation((url) => {
    if (url === '') return workspaceWindow as unknown as Window
    return { opener: window } as Window
  })
  vi.mocked(posApi.setup).mockResolvedValue(setup)
  vi.mocked(posApi.registers).mockResolvedValue([register])
  vi.mocked(posApi.activeSession).mockResolvedValue(null)
  vi.mocked(posApi.openSession).mockResolvedValue(currentSession())
  vi.mocked(posApi.sessions).mockImplementation(async (filters) => ({
    data: [],
    meta: meta(filters.page, filters.pageSize),
  }))
  vi.mocked(posApi.zReports).mockImplementation(async (filters) => ({
    data: [],
    meta: meta(filters.page, filters.pageSize),
  }))
})
afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('POS session dashboard', () => {
  it('pages sessions and Z reports independently and resets the session page when filtering', async () => {
    mount()
    const sessions = within(screen.getByRole('region', { name: 'Session history' }))
    const reports = within(screen.getByRole('region', { name: 'Z reports' }))
    fireEvent.click(await sessions.findByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(posApi.sessions).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
      status: undefined,
    }))
    expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 })
    fireEvent.click(await reports.findByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Session status' }), {
      target: { value: String(PosSessionStatus.Closed) },
    })
    await waitFor(() => expect(posApi.sessions).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      status: PosSessionStatus.Closed,
    }))
    expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 })
  })

  it('keeps session creation inside the app page until the opening form is submitted', async () => {
    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'Create New Session' }))

    expect(screen.getByText('Open POS Session')).toBeInTheDocument()
    expect(window.open).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))

    await waitFor(() => expect(posApi.openSession).toHaveBeenCalledWith({
      registerId: register.id,
      openingCounts: [],
      notes: null,
    }))

    expect(window.open).toHaveBeenCalledWith('', '_blank')
    await waitFor(() => expect(workspaceWindow.location.href).toBe('/pos/workspace'))
    expect(workspaceWindow.opener).toBeNull()
    expect(screen.queryByText('Open POS Session')).not.toBeInTheDocument()
  })

  it('falls back to the same-tab workspace after creation when popups are blocked', async () => {
    vi.mocked(window.open).mockReturnValue(null)
    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'Create New Session' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))

    expect(await screen.findByText('POS workspace route')).toBeInTheDocument()
  })

  it('closes the prepared tab when opening the session fails', async () => {
    vi.mocked(posApi.openSession).mockRejectedValue(new Error('Register was taken'))
    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'Create New Session' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))

    await waitFor(() => expect(workspaceWindow.close).toHaveBeenCalled())
    expect(await screen.findByText('Register was taken')).toBeInTheDocument()
  })

  it('continues the signed-in users current session in a new workspace tab', async () => {
    vi.mocked(posApi.activeSession).mockResolvedValue(currentSession())
    vi.mocked(posApi.sessions).mockResolvedValue({
      data: [currentSessionSummary()],
      meta: meta(1, 20, 1),
    })
    mount()

    expect(await screen.findByText(/Your current session is SES-000001 on RECEPTION/)).toBeInTheDocument()
    const sessions = within(screen.getByRole('region', { name: 'Session history' }))
    expect(sessions.getByText('Open · Yours')).toBeInTheDocument()

    fireEvent.click(sessions.getByRole('button', { name: 'Continue' }))
    expect(window.open).toHaveBeenCalledWith('/pos/workspace', '_blank')
    expect(screen.queryByText('POS workspace route')).not.toBeInTheDocument()
  })

  it('shows setup and session request failures instead of silently disabling creation', async () => {
    vi.mocked(posApi.setup).mockRejectedValue(new Error('POS setup unavailable'))
    mount()
    expect(await screen.findByText('POS setup unavailable')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create New Session' })).toBeDisabled()
  })

  it('marks occupied registers as in use and prevents deactivation', async () => {
    vi.mocked(posApi.registers).mockResolvedValue([{
      ...register,
      hasOpenSession: true,
    }])
    mount()

    const registers = within(screen.getByRole('region', { name: 'POS registers' }))
    expect(await registers.findByText('Active · In use')).toBeInTheDocument()
    expect(registers.getByRole('button', { name: 'Deactivate' })).toBeDisabled()
  })

  it('validates register creation and refreshes registers after saving', async () => {
    vi.mocked(posApi.createRegister).mockResolvedValue({
      ...register,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'DESK',
      name: 'Front desk',
    })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Add Register' }))
    expect(await screen.findByText('Register code is required')).toBeInTheDocument()
    expect(posApi.createRegister).not.toHaveBeenCalled()

    fireEvent.change(screen.getByPlaceholderText('Code · RECEPTION'), { target: { value: 'DESK' } })
    fireEvent.change(screen.getByPlaceholderText('Register name · Reception POS'), {
      target: { value: 'Front desk' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add Register' }))

    await waitFor(() => expect(posApi.createRegister).toHaveBeenCalledWith(
      { code: 'DESK', name: 'Front desk' },
      expect.anything(),
    ))
    await waitFor(() => expect(posApi.registers).toHaveBeenCalledTimes(2))
  })
})
