import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/queryClient'
import { BranchSelector } from './BranchSelector'
import { BranchWorkspace } from './BranchWorkspace'
import { resetBranchSelection, selectBranch } from '../stores/branch-selection.store'

const state = vi.hoisted(() => ({
  user: { id: 'user-a', username: 'Owner', role: 'Owner' },
  branches: [{ id: 'a', code: 'MAIN', name: 'Main salon' }, { id: 'b', code: 'WEST', name: 'West salon' }],
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}))
vi.mock('@/features/auth', () => ({ useCurrentUser: () => ({ data: state.user }) }))
vi.mock('../hooks/useBranchAccess', () => ({ useBranchAccess: () => ({ data: state.isPending ? undefined : state.branches, isPending: state.isPending, isError: state.isError, refetch: state.refetch }) }))
vi.mock('@/lib/apiClient', () => ({ setBranchId: vi.fn(), registerBranchAccessHandler: vi.fn() }))

beforeEach(() => {
  queryClient.clear()
  sessionStorage.clear()
  resetBranchSelection()
  state.isPending = false
  state.isError = false
  state.branches = [{ id: 'a', code: 'MAIN', name: 'Main salon' }, { id: 'b', code: 'WEST', name: 'West salon' }]
})
afterEach(cleanup)

function show(path = '/pos') {
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}>
    <BranchSelector />
    <BranchWorkspace><input aria-label="Draft notes" defaultValue="" /></BranchWorkspace>
  </MemoryRouter></QueryClientProvider>)
}

it('shows the accessible branch and discards old form state when switching', async () => {
  show()
  const notes = await screen.findByRole('textbox', { name: 'Draft notes' })
  fireEvent.change(notes, { target: { value: 'Main branch draft' } })
  expect(notes).toHaveValue('Main branch draft')
  expect(screen.getByRole('combobox', { name: 'Current branch' })).toHaveTextContent('MAIN — Main salon')
  await act(() => selectBranch('user-a', 'b'))
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Current branch' })).toHaveTextContent('WEST — West salon'))
  expect(screen.getByRole('textbox', { name: 'Draft notes' })).toHaveValue('')
})

it('blocks operational content while branch access is loading', () => {
  state.isPending = true
  show()
  expect(screen.queryByRole('textbox', { name: 'Draft notes' })).not.toBeInTheDocument()
  expect(screen.getByRole('combobox')).toBeDisabled()
  expect(screen.getByRole('status')).toHaveTextContent('Loading branch workspace')
})

it('shows no-access guidance while keeping branch setup reachable', () => {
  state.branches = []
  show('/settings/branches')
  expect(screen.getByText(/No active branches assigned/)).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Draft notes' })).toBeInTheDocument()
  expect(screen.getByRole('combobox')).toBeDisabled()
})

it('offers a retry when branch access fails', () => {
  state.isError = true
  state.branches = []
  show()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(state.refetch).toHaveBeenCalled()
})
