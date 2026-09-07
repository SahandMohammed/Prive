import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { businessApi } from '../api/business.api'

const schema = z.object({ branchIds: z.array(z.string().uuid()) })

export function BranchAccessDialog({ userId, username, onClose }: { userId: string; username: string; onClose: () => void }) {
  const queryClient = useQueryClient()
  const branches = useQuery({ queryKey: ['branch-access', 'assignable'], queryFn: businessApi.listAccessibleBranches })
  const access = useQuery({ queryKey: ['branch-access', 'assignments', userId], queryFn: () => businessApi.getUserBranchAccess(userId) })
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { branchIds: [] } })
  useEffect(() => {
    if (access.data && branches.data) form.reset({ branchIds: access.data.filter(id => branches.data.some(branch => branch.id === id)) })
  }, [access.data, branches.data, form])
  const save = useMutation({
    mutationFn: ({ branchIds }: z.infer<typeof schema>) => businessApi.setUserBranchAccess(userId, branchIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['branch-access'] })
      onClose()
    },
  })

  return <Dialog open onOpenChange={open => { if (!open && !save.isPending) onClose() }}>
    <DialogContent><DialogHeader><DialogTitle>Branch access — {username}</DialogTitle><DialogDescription>Choose the active branches this user can work in. No selections means no branch access.</DialogDescription></DialogHeader>
      {branches.isPending || access.isPending ? <p role="status">Loading branch access…</p> : branches.isError || access.isError ? <div role="alert"><p>Could not load branch access.</p><Button variant="outline" onClick={() => { void branches.refetch(); void access.refetch() }}>Retry</Button></div> :
        <form onSubmit={form.handleSubmit(values => save.mutate(values))} className="space-y-4">
          <div className="max-h-72 space-y-3 overflow-y-auto">{branches.data.map(branch => <label key={branch.id} className="flex items-center gap-3 text-sm"><input type="checkbox" value={branch.id} {...form.register('branchIds')} />{branch.code} — {branch.name}</label>)}{branches.data.length === 0 && <p className="text-sm text-muted-foreground">Create an active branch first.</p>}</div>
          {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending ? 'Saving…' : 'Save access'}</Button></DialogFooter>
        </form>}
    </DialogContent>
  </Dialog>
}
