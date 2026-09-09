import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/queryClient'
import { BranchSelector } from './BranchSelector'
import { BranchWorkspace } from './BranchWorkspace'
import {
  resetBranchSelection,
  selectBranch,
  useBranchSelectionStore,
} from '../stores/branch-selection.store'

const state = vi.hoisted(() => ({
  user: { id: 'user-a', username: 'Owner', role: 'Owner' },
  branches: [
    { id: 'a', code: 'MAIN', name: 'Main salon', isMainBranch: true },
    { id: 'b', code: 'WEST', name: 'West salon', isMainBranch: false },
  ],
  isPending: false,
  isError: false,
  refetch: vi.fn(),
}))
vi.mock('@/features/auth', () => ({ useCurrentUser: () => ({ data: state.user }) }))
vi.mock('../hooks/useBranchAccess', () => ({
  useBranchAccess: () => ({
    data: state.isPending ? undefined : state.branches,
    isPending: state.isPending,
    isError: state.isError,
    refetch: state.refetch,
  }),
}))
vi.mock('@/lib/apiClient', () => ({ setBranchId: vi.fn(), registerBranchAccessHandler: vi.fn() }))

beforeEach(() => {
  queryClient.clear()
  sessionStorage.clear()
  resetBranchSelection()
  state.isPending = false
  state.isError = false
  state.refetch.mockClear()
  state.branches = [
    { id: 'a', code: 'MAIN', name: 'Main salon', isMainBranch: true },
    { id: 'b', code: 'WEST', name: 'West salon', isMainBranch: false },
  ]
})
afterEach(cleanup)

function show(path = '/pos') {
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}>
    <BranchSelector />
    <BranchWorkspace><input aria-label="Draft notes" defaultValue="" /></BranchWorkspace>
  </MemoryRouter></QueryClientProvider>)
}

function showWorkspaceOnly(path = '/pos') {
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={[path]}>
    <BranchWorkspace><input aria-label="Draft notes" defaultValue="" /></BranchWorkspace>
  </MemoryRouter></QueryClientProvider>)
}

it('selects the accessible main branch on app load without mounting the selector', async () => {
  state.branches = [
    { id: 'b', code: 'WEST', name: 'West salon', isMainBranch: false },
    { id: 'a', code: 'MAIN', name: 'Main salon', isMainBranch: true },
  ]

  showWorkspaceOnly()

  await screen.findByRole('textbox', { name: 'Draft notes' })
  expect(useBranchSelectionStore.getState()).toMatchObject({
    userId: 'user-a',
    branchId: 'a',
    switching: false,
  })
})

it('preserves an accessible branch remembered for the current browser session', async () => {
  sessionStorage.setItem('prive.branch.user-a', 'b')

  showWorkspaceOnly()

  await screen.findByRole('textbox', { name: 'Draft notes' })
  expect(useBranchSelectionStore.getState().branchId).toBe('b')
})

it('replaces an inaccessible remembered branch with the accessible main branch', async () => {
  sessionStorage.setItem('prive.branch.user-a', 'revoked-branch')

  showWorkspaceOnly()

  await screen.findByRole('textbox', { name: 'Draft notes' })
  expect(useBranchSelectionStore.getState().branchId).toBe('a')
})

it('automatically selects the only accessible branch when there is no main branch access', async () => {
  state.branches = [
    { id: 'b', code: 'WEST', name: 'West salon', isMainBranch: false },
  ]

  showWorkspaceOnly()

  await screen.findByRole('textbox', { name: 'Draft notes' })
  expect(useBranchSelectionStore.getState().branchId).toBe('b')
})

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
