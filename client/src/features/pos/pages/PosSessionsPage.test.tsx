import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { posApi } from '../api/pos.api'
import { PosSessionStatus } from '../types/pos.types'
import { PosSessionsPage } from './PosSessionsPage'

vi.mock('@/features/auth', () => ({ useCurrentUser: () => ({ data: { role: 'Owner' } }) }))
vi.mock('../api/pos.api', () => ({
  posApi: {
    registers: vi.fn(), sessions: vi.fn(), zReports: vi.fn(), createRegister: vi.fn(), updateRegister: vi.fn(),
  },
}))

const meta = (page = 1, pageSize = 20, totalCount = 61) => ({
  page, pageSize, totalCount, totalPages: Math.ceil(totalCount / pageSize),
  hasPreviousPage: page > 1, hasNextPage: page * pageSize < totalCount,
})

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  render(<QueryClientProvider client={client}><MemoryRouter><PosSessionsPage /></MemoryRouter></QueryClientProvider>)
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(posApi.registers).mockResolvedValue([])
  vi.mocked(posApi.sessions).mockImplementation(async (filters) => ({ data: [], meta: meta(filters.page, filters.pageSize) }))
  vi.mocked(posApi.zReports).mockImplementation(async (filters) => ({ data: [], meta: meta(filters.page, filters.pageSize) }))
})
afterEach(cleanup)

describe('POS history', () => {
  it('pages sessions and Z reports independently and resets the session page when filtering', async () => {
    mount()
    const sessions = within(screen.getByRole('region', { name: 'Session history' }))
    const reports = within(screen.getByRole('region', { name: 'Z reports' }))
    fireEvent.click(await sessions.findByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(posApi.sessions).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, status: undefined }))
    expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 1, pageSize: 20 })
    fireEvent.click(await reports.findByRole('button', { name: 'Next page' }))
    await waitFor(() => expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Session status' }), { target: { value: String(PosSessionStatus.Closed) } })
    await waitFor(() => expect(posApi.sessions).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, status: PosSessionStatus.Closed }))
    expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 2, pageSize: 20 })
    fireEvent.change(await reports.findByRole('combobox', { name: 'Rows per page:' }), { target: { value: '50' } })
    await waitFor(() => expect(posApi.zReports).toHaveBeenLastCalledWith({ page: 1, pageSize: 50 }))
  })

  it('shows loading and empty history states', async () => {
    mount()
    expect(screen.getByText('Loading sessions…')).toBeInTheDocument()
    expect(screen.getByText('Loading Z Reports…')).toBeInTheDocument()
    expect(await screen.findByText('No sessions found.')).toBeInTheDocument()
    expect(await screen.findByText('No Z Reports yet.')).toBeInTheDocument()
  })

  it('shows register and history request failures', async () => {
    vi.mocked(posApi.registers).mockRejectedValue(new Error('Registers unavailable'))
    vi.mocked(posApi.sessions).mockRejectedValue(new Error('Sessions unavailable'))
    vi.mocked(posApi.zReports).mockRejectedValue(new Error('Reports unavailable'))
    mount()
    expect(await screen.findByText('Registers unavailable')).toBeInTheDocument()
    expect(await screen.findByText('Sessions unavailable')).toBeInTheDocument()
    expect(await screen.findByText('Reports unavailable')).toBeInTheDocument()
  })

  it('validates register creation and refreshes registers after saving', async () => {
    vi.mocked(posApi.createRegister).mockResolvedValue({ id: 'register-1', code: 'DESK', name: 'Front desk', branchId: 'branch-1', isActive: true })
    mount()
    fireEvent.click(screen.getByRole('button', { name: 'Add Register' }))
    expect(await screen.findByText('Register code is required')).toBeInTheDocument()
    expect(posApi.createRegister).not.toHaveBeenCalled()
    fireEvent.change(screen.getByPlaceholderText('Code · RECEPTION'), { target: { value: 'DESK' } })
    fireEvent.change(screen.getByPlaceholderText('Register name · Reception POS'), { target: { value: 'Front desk' } })
    await waitFor(() => expect(posApi.registers).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: 'Add Register' }))
    await waitFor(() => expect(posApi.createRegister).toHaveBeenCalledWith({ code: 'DESK', name: 'Front desk' }, expect.anything()))
    await waitFor(() => expect(posApi.registers).toHaveBeenCalledTimes(2))
    expect(screen.getByPlaceholderText('Code · RECEPTION')).toHaveValue('')
  })
})
