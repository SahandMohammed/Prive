import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { posApi } from '../api/pos.api'
import { PosSessionStatus } from '../types/pos.types'
import type { PosSession, PosSetup } from '../types/pos.types'
import { PosSessionsPage } from './PosSessionsPage'

vi.mock('@/features/auth', () => ({
  useCurrentUser: () => ({ data: { role: 'Owner', username: 'owner' } }),
}))

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

const meta = (page = 1, pageSize = 20, totalCount = 1) => ({
  page,
  pageSize,
  totalCount,
  totalPages: Math.max(1, Math.ceil(totalCount / pageSize)),
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

const sessionSummary = {
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

const zReport = {
  id: 'report-1',
  reportNumber: 'Z-000001',
  posSessionId: 'session-closed',
  sessionNumber: 'SES-000000',
  registerId: register.id,
  registerCode: register.code,
  registerName: register.name,
  cashierUserId: 'user-1',
  cashierUsername: 'owner',
  openedAtUtc: '2026-09-20T08:00:00Z',
  closedAtUtc: '2026-09-20T17:00:00Z',
  saleCount: 10,
  grossSalesBase: 250_000,
  refundCount: 1,
  refundTotalBase: 25_000,
  netSalesBase: 225_000,
  varianceBase: 0,
  baseCurrencyCode: 'IQD',
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
          <Route path="/pos/z-reports/:id" element={<div>Z report route</div>} />
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
    if (url === '' || url === '/pos/workspace') return workspaceWindow as unknown as Window
    return null
  })
  vi.mocked(posApi.setup).mockResolvedValue(setup)
  vi.mocked(posApi.registers).mockResolvedValue([register])
  vi.mocked(posApi.activeSession).mockResolvedValue(null)
  vi.mocked(posApi.openSession).mockResolvedValue(currentSession())
  vi.mocked(posApi.sessions).mockResolvedValue({ data: [sessionSummary], meta: meta() })
  vi.mocked(posApi.zReports).mockResolvedValue({ data: [zReport], meta: meta() })
})

afterEach(() => {
  vi.restoreAllMocks()
  cleanup()
})

describe('POS session management UX', () => {
  it('uses tabs and renders sessions in the shared table pattern', async () => {
    mount()

    expect(await screen.findByRole('tab', { name: 'Sessions' })).toHaveAttribute('data-active')
    expect(screen.getByRole('tab', { name: 'Registers' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Z Reports' })).toBeInTheDocument()

    const sessions = within(screen.getByRole('region', { name: 'Session history' }))
    const table = sessions.getByRole('table')
    expect(within(table).getByRole('columnheader', { name: 'Session' })).toBeInTheDocument()
    expect(within(table).getByRole('columnheader', { name: 'Register' })).toBeInTheDocument()
    expect(await within(table).findByText('SES-000001')).toBeInTheDocument()
    expect(within(table).getByText('Reception POS')).toBeInTheDocument()
  })

  it('keeps register management on its own tab and uses a table instead of cards', async () => {
    mount()

    fireEvent.click(await screen.findByRole('tab', { name: 'Registers' }))

    const registers = within(await screen.findByRole('region', { name: 'POS registers' }))
    expect(registers.getByRole('table')).toBeInTheDocument()
    expect(registers.getByRole('columnheader', { name: 'Code' })).toBeInTheDocument()
    expect(registers.getByRole('columnheader', { name: 'Availability' })).toBeInTheDocument()
    expect(registers.getByText('Available')).toBeInTheDocument()
    expect(registers.getByRole('button', { name: 'Add register' })).toBeInTheDocument()
  })

  it('opens register creation in a dialog and refreshes the register list after saving', async () => {
    vi.mocked(posApi.createRegister).mockResolvedValue({
      ...register,
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      code: 'DESK',
      name: 'Front desk',
    })
    mount()

    fireEvent.click(await screen.findByRole('tab', { name: 'Registers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Add register' }))

    expect(screen.getByRole('dialog', { name: 'Add POS register' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Add register' }))
    expect(await screen.findByText('Register code is required')).toBeInTheDocument()
    expect(screen.getByText('Register name is required')).toBeInTheDocument()
    expect(posApi.createRegister).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText(/Register code/), { target: { value: 'DESK' } })
    fireEvent.change(screen.getByLabelText(/Register name/), { target: { value: 'Front desk' } })
    fireEvent.click(screen.getByRole('button', { name: 'Add register' }))

    await waitFor(() => expect(posApi.createRegister).toHaveBeenCalledWith(
      { code: 'DESK', name: 'Front desk' },
      expect.anything(),
    ))
    await waitFor(() => expect(posApi.registers).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Add POS register' })).not.toBeInTheDocument())
  })

  it('puts Z reports on their own tab and uses the shared table presentation', async () => {
    mount()

    fireEvent.click(await screen.findByRole('tab', { name: 'Z Reports' }))

    const reports = within(await screen.findByRole('region', { name: 'Z reports' }))
    expect(reports.getByRole('table')).toBeInTheDocument()
    expect(await reports.findByText('Z-000001')).toBeInTheDocument()
    expect(reports.getByText('225,000 IQD')).toBeInTheDocument()
    fireEvent.click(reports.getByRole('button', { name: 'View Z-000001' }))
    expect(await screen.findByText('Z report route')).toBeInTheDocument()
  })

  it('filters session status without affecting the other management tabs', async () => {
    mount()
    const sessions = within(screen.getByRole('region', { name: 'Session history' }))

    fireEvent.change(sessions.getByRole('combobox', { name: 'Session status' }), {
      target: { value: String(PosSessionStatus.Closed) },
    })

    await waitFor(() => expect(posApi.sessions).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      status: PosSessionStatus.Closed,
    }))
  })

  it('pages sessions and Z reports independently and resets only the changed list', async () => {
    vi.mocked(posApi.sessions).mockImplementation(async (filters) => ({
      data: [sessionSummary],
      meta: meta(filters.page, filters.pageSize, 61),
    }))
    vi.mocked(posApi.zReports).mockImplementation(async (filters) => ({
      data: [zReport],
      meta: meta(filters.page, filters.pageSize, 61),
    }))
    mount()

    let sessions = within(screen.getByRole('region', { name: 'Session history' }))
    fireEvent.click(await sessions.findByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(posApi.sessions).toHaveBeenLastCalledWith({
      page: 2,
      pageSize: 20,
      status: undefined,
    }))
    expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 })

    fireEvent.click(screen.getByRole('tab', { name: 'Z Reports' }))
    const reports = within(await screen.findByRole('region', { name: 'Z reports' }))
    fireEvent.click(await reports.findByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }))

    fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }))
    sessions = within(await screen.findByRole('region', { name: 'Session history' }))
    fireEvent.change(sessions.getByRole('combobox', { name: 'Session status' }), {
      target: { value: String(PosSessionStatus.Closed) },
    })
    await waitFor(() => expect(posApi.sessions).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      status: PosSessionStatus.Closed,
    }))
    expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 })

    fireEvent.click(screen.getByRole('tab', { name: 'Z Reports' }))
    fireEvent.change(within(await screen.findByRole('region', { name: 'Z reports' }))
      .getByRole('combobox', { name: 'Rows per page:' }), { target: { value: '50' } })
    await waitFor(() => expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 1, pageSize: 50 }))
  })

  it('renders loading and empty list states', async () => {
    vi.mocked(posApi.sessions).mockImplementation(() => new Promise(() => {}))
    vi.mocked(posApi.zReports).mockImplementation(() => new Promise(() => {}))
    mount()

    expect(screen.getByText('Loading sessions…')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Z Reports' }))
    expect(screen.getByText('Loading Z Reports…')).toBeInTheDocument()

    cleanup()
    vi.mocked(posApi.sessions).mockResolvedValue({ data: [], meta: meta(1, 20, 0) })
    vi.mocked(posApi.zReports).mockResolvedValue({ data: [], meta: meta(1, 20, 0) })
    mount()

    expect(await screen.findByText('No sessions found. Create a new session to start selling.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Z Reports' }))
    expect(await screen.findByText('No Z Reports yet.')).toBeInTheDocument()
  })

  it('renders register, session, and report request failures', async () => {
    vi.mocked(posApi.registers).mockRejectedValue(new Error('Registers unavailable'))
    vi.mocked(posApi.sessions).mockRejectedValue(new Error('Sessions unavailable'))
    vi.mocked(posApi.zReports).mockRejectedValue(new Error('Reports unavailable'))
    mount()

    expect(await screen.findByText('Sessions unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Registers' }))
    expect(within(await screen.findByRole('region', { name: 'POS registers' }))
      .getByText('Registers unavailable')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Z Reports' }))
    expect(within(await screen.findByRole('region', { name: 'Z reports' }))
      .getByText('Reports unavailable')).toBeInTheDocument()
  })

  it('keeps session creation in the ERP page until the opening form is submitted', async () => {
    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'Create new session' }))
    expect(screen.getByRole('dialog', { name: 'Open POS Session' })).toBeInTheDocument()
    expect(window.open).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))

    await waitFor(() => expect(posApi.openSession).toHaveBeenCalledWith({
      registerId: register.id,
      openingCounts: [],
      notes: null,
    }, expect.anything()))

    expect(window.open).toHaveBeenCalledWith('', '_blank')
    await waitFor(() => expect(workspaceWindow.location.href).toBe('/pos/workspace'))
    expect(workspaceWindow.opener).toBeNull()
  })

  it('closes the prepared workspace when session validation fails', async () => {
    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'Create new session' }))
    fireEvent.change(screen.getByLabelText('Register'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))

    await waitFor(() => expect(workspaceWindow.close).toHaveBeenCalledOnce())
    expect(posApi.openSession).not.toHaveBeenCalled()
  })

  it('closes the prepared workspace when session creation fails', async () => {
    vi.mocked(posApi.openSession).mockRejectedValue(new Error('Session creation failed'))
    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'Create new session' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))

    await waitFor(() => expect(workspaceWindow.close).toHaveBeenCalledOnce())
    expect(await screen.findByText('Session creation failed')).toBeInTheDocument()
  })

  it('falls back to the current tab when the workspace popup is blocked', async () => {
    vi.mocked(window.open).mockReturnValue(null)
    mount()

    fireEvent.click(await screen.findByRole('button', { name: 'Create new session' }))
    fireEvent.click(screen.getByRole('button', { name: 'Open Session' }))

    expect(await screen.findByText('POS workspace route')).toBeInTheDocument()
  })

  it('continues the current users session in a dedicated workspace tab', async () => {
    vi.mocked(posApi.activeSession).mockResolvedValue(currentSession())
    mount()

    expect(await screen.findByText('Session SES-000001 is open')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Open workspace' }))

    expect(window.open).toHaveBeenCalledWith('/pos/workspace', '_blank')
    expect(workspaceWindow.opener).toBeNull()
  })

  it('marks occupied registers as in use and prevents deactivation', async () => {
    vi.mocked(posApi.registers).mockResolvedValue([{ ...register, hasOpenSession: true }])
    mount()

    fireEvent.click(await screen.findByRole('tab', { name: 'Registers' }))
    const registers = within(await screen.findByRole('region', { name: 'POS registers' }))

    expect(registers.getByText('In use')).toBeInTheDocument()
    expect(registers.getByRole('button', { name: 'Deactivate' })).toBeDisabled()
  })
})
