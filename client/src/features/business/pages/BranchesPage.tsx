import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Building2, Loader2, Pencil, Plus, Power } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { branchSchema, type BranchFormValues } from '../schemas/business.schemas'
import { useBranches, useDeactivateBranch, useSaveBranch } from '../hooks/useBusiness'
import type { Branch, BranchInput } from '../types/business.types'

const defaults: BranchFormValues = { code: '', name: '', phoneNumber: '', email: '', address: '', city: '', region: '', country: '', isMainBranch: false, isActive: true }

export function BranchesPage() {
  const branchesQuery = useBranches()
  const [editing, setEditing] = useState<Branch | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const form = useForm<BranchFormValues, unknown, BranchInput>({ resolver: zodResolver(branchSchema), defaultValues: defaults })
  const saveBranch = useSaveBranch(editing?.id ?? null)
  const deactivateBranch = useDeactivateBranch()

  useEffect(() => { form.reset(editing ? { ...editing, phoneNumber: editing.phoneNumber ?? '', email: editing.email ?? '' } : defaults) }, [editing, form])

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditing(null)
  }

  const openCreateDialog = () => {
    setEditing(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (branch: Branch) => {
    setEditing(branch)
    setIsDialogOpen(true)
  }

  const branches = branchesQuery.data?.data ?? []
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Branches</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage the locations where future business operations will take place.</p>
        </div>
        <Button onClick={openCreateDialog}><Plus className="size-4" /> Add branch</Button>
      </div>

      <div className="overflow-hidden rounded-lg border bg-card">
        {branchesQuery.isLoading ? <Loading /> : <table className="w-full text-sm"><thead className="border-b bg-muted/40 text-left"><tr><th className="p-3">Code</th><th className="p-3">Branch</th><th className="p-3">Location</th><th className="p-3">Status</th><th className="p-3" /></tr></thead><tbody>{branches.length === 0 ? <tr><td colSpan={5} className="p-0"><div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 text-center"><div className="rounded-full bg-muted p-3"><Building2 className="size-6 text-muted-foreground" /></div><div><p className="font-medium">No branches yet</p><p className="mt-1 text-sm text-muted-foreground">Create your main branch to get started.</p></div><Button size="sm" onClick={openCreateDialog}><Plus className="size-4" /> Add branch</Button></div></td></tr> : branches.map((branch) => <tr key={branch.id} className="border-b last:border-0"><td className="p-3 font-mono font-medium">{branch.code}</td><td className="p-3">{branch.name}{branch.isMainBranch && <span className="ml-2 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">Main</span>}</td><td className="p-3">{branch.city}, {branch.region}</td><td className="p-3">{branch.isActive ? 'Active' : 'Inactive'}</td><td className="flex justify-end gap-1 p-3"><Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(branch)}><Pencil className="size-4" /><span className="sr-only">Edit {branch.name}</span></Button>{branch.isActive && !branch.isMainBranch && <Button variant="ghost" size="icon-sm" onClick={() => deactivateBranch.mutate(branch.id)} disabled={deactivateBranch.isPending}><Power className="size-4" /><span className="sr-only">Deactivate {branch.name}</span></Button>}</td></tr>)}</tbody></table>}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : 'Add branch'}</DialogTitle>
            <DialogDescription>Enter the branch details used by future operational modules.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => saveBranch.mutate(values, { onSuccess: closeDialog }))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Code" error={form.formState.errors.code?.message}><Input maxLength={20} className="uppercase" {...form.register('code')} /></Field><Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" error={form.formState.errors.phoneNumber?.message}><Input {...form.register('phoneNumber')} /></Field><Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field></div>
            <Field label="Address" error={form.formState.errors.address?.message}><Input {...form.register('address')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="City" error={form.formState.errors.city?.message}><Input {...form.register('city')} /></Field><Field label="Region / governorate" error={form.formState.errors.region?.message}><Input {...form.register('region')} /></Field></div>
            <Field label="Country" error={form.formState.errors.country?.message}><Input {...form.register('country')} /></Field>
            <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isMainBranch')} /> Main branch</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active</label></div>
            {saveBranch.isError && <p className="text-sm text-destructive">{saveBranch.error.message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saveBranch.isPending}>Cancel</Button>
              <Button type="submit" disabled={saveBranch.isPending}>{saveBranch.isPending && <Loader2 className="size-4 animate-spin" />}{editing ? 'Save changes' : 'Add branch'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label>
}

function Loading() { return <div className="flex min-h-48 items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div> }
