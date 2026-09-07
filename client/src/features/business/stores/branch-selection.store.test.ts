import { beforeEach, describe, expect, it, vi } from 'vitest'
import { queryClient } from '@/lib/queryClient'
import { setBranchId } from '@/lib/apiClient'
import { rememberedBranch, resetBranchSelection, selectBranch, useBranchSelectionStore } from './branch-selection.store'

vi.mock('@/lib/apiClient', () => ({ setBranchId: vi.fn() }))

beforeEach(() => {
  queryClient.clear()
  sessionStorage.clear()
  resetBranchSelection()
  vi.clearAllMocks()
})

describe('branch workspace selection', () => {
  it('clears prior branch records and keeps only access and current-user queries', async () => {
    queryClient.setQueryData(['sales', 'invoices'], [{ id: 'old-invoice' }])
    queryClient.setQueryData(['users', 'me'], { id: 'user-a' })
    queryClient.setQueryData(['branch-access', 'user-a'], [{ id: 'branch-a' }])
    await selectBranch('user-a', 'branch-a')
    expect(setBranchId).toHaveBeenCalledWith('branch-a')
    expect(queryClient.getQueryData(['sales', 'invoices'])).toBeUndefined()
    expect(queryClient.getQueryData(['users', 'me'])).toEqual({ id: 'user-a' })
    expect(useBranchSelectionStore.getState()).toMatchObject({ userId: 'user-a', branchId: 'branch-a', switching: false })
  })

  it('does not restore old data when a previous request completes after switching', async () => {
    let finish!: (data: string[]) => void
    const request = queryClient.fetchQuery({ queryKey: ['stock'], queryFn: () => new Promise<string[]>(resolve => { finish = resolve }) }).catch(() => undefined)
    await selectBranch('user-a', 'branch-b')
    finish(['old-branch-stock'])
    await request
    expect(queryClient.getQueryData(['stock'])).toBeUndefined()
  })

  it('prevents switching while a save is in progress', async () => {
    await selectBranch('user-a', 'branch-a')
    let finish!: () => void
    const mutation = queryClient.getMutationCache().build(queryClient, { mutationFn: () => new Promise<void>(resolve => { finish = resolve }) })
    const pending = mutation.execute(undefined)
    await Promise.resolve()
    await selectBranch('user-a', 'branch-b')
    expect(useBranchSelectionStore.getState().branchId).toBe('branch-a')
    finish()
    await pending
    await selectBranch('user-a', 'branch-b')
    expect(useBranchSelectionStore.getState().branchId).toBe('branch-b')
  })

  it('remembers the selection per user and resets request scope on logout', async () => {
    await selectBranch('user-a', 'branch-a')
    await selectBranch('user-b', 'branch-b')
    expect(rememberedBranch('user-a')).toBe('branch-a')
    expect(rememberedBranch('user-b')).toBe('branch-b')
    resetBranchSelection()
    expect(useBranchSelectionStore.getState().branchId).toBeNull()
    expect(setBranchId).toHaveBeenLastCalledWith(null)
  })
})
