import { useIsMutating } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useCurrentUser } from '@/features/auth'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useBranchAccess } from '../hooks/useBranchAccess'
import { selectBranch, useBranchSelectionStore } from '../stores/branch-selection.store'

export function BranchSelector() {
  const { data: user } = useCurrentUser()
  const branches = useBranchAccess()
  const { userId, branchId, switching } = useBranchSelectionStore()
  const pendingMutations = useIsMutating()
  const selected = userId === user?.id ? branches.data?.find(branch => branch.id === branchId) : undefined

  return <div className="space-y-2">
    <label id="branch-selector-label" className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Building2 className="size-4" />Current branch</label>
    <Select value={selected?.id ?? null} onValueChange={value => { if (user && value) void selectBranch(user.id, value) }} disabled={branches.isPending || branches.isError || switching || pendingMutations > 0 || !branches.data?.length}>
      <SelectTrigger aria-labelledby="branch-selector-label" className="w-full"><SelectValue>{selected ? `${selected.code} — ${selected.name}` : branches.isPending ? 'Loading branches…' : 'Select a branch'}</SelectValue></SelectTrigger>
      <SelectContent>{branches.data?.map(branch => <SelectItem key={branch.id} value={branch.id}>{branch.code} — {branch.name}</SelectItem>)}</SelectContent>
    </Select>
    {branches.isError && <div role="alert" className="text-xs text-destructive">Could not load branch access. <Button variant="link" size="sm" onClick={() => void branches.refetch()}>Retry</Button></div>}
    {branches.data?.length === 0 && <p className="text-xs text-muted-foreground">No active branches assigned. Ask an administrator for access.</p>}
    {pendingMutations > 0 && <p className="text-xs text-muted-foreground">Finish saving before switching branches.</p>}
  </div>
}
