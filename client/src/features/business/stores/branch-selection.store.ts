import { create } from 'zustand'
import { setBranchId } from '@/lib/apiClient'
import { queryClient } from '@/lib/queryClient'

interface BranchSelectionState {
  userId: string | null
  branchId: string | null
  switching: boolean
}

// Only selection is client state; branch records remain in TanStack Query.
export const useBranchSelectionStore = create<BranchSelectionState>(() => ({ userId: null, branchId: null, switching: false }))

export function rememberedBranch(userId: string): string | null {
  try { return sessionStorage.getItem(`prive.branch.${userId}`) } catch { return null }
}

let selectionVersion = 0

export async function selectBranch(userId: string, branchId: string | null) {
  const current = useBranchSelectionStore.getState()
  if (current.switching || (current.userId === userId && current.branchId === branchId)) return
  if (queryClient.isMutating() > 0) return
  const version = ++selectionVersion
  useBranchSelectionStore.setState({ switching: true })
  await queryClient.cancelQueries()
  if (version !== selectionVersion) return
  // Old queries cannot populate the newly mounted workspace after a switch.
  queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'branch-access' && !(query.queryKey[0] === 'users' && query.queryKey[1] === 'me') })
  queryClient.getMutationCache().clear()
  setBranchId(branchId)
  try {
    if (branchId) sessionStorage.setItem(`prive.branch.${userId}`, branchId)
    else sessionStorage.removeItem(`prive.branch.${userId}`)
  } catch { /* Selection still works when browser storage is unavailable. */ }
  useBranchSelectionStore.setState({ userId, branchId, switching: false })
}

export function getSelectedBranchId() {
  return useBranchSelectionStore.getState().branchId ?? ''
}

export function resetBranchSelection() {
  selectionVersion++
  setBranchId(null)
  useBranchSelectionStore.setState({ userId: null, branchId: null, switching: false })
}
