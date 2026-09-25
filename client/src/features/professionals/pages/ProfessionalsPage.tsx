import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { useAllBranches } from '@/features/business'
import {
  useDeleteProfessional,
  useProfessionalUserOptions,
  useProfessionals,
  useSaveProfessional,
  useSetProfessionalActive,
} from '../hooks/useProfessionals'
import { professionalSchema, type ProfessionalFormValues } from '../schemas/professionals.schemas'
import type { Professional, ProfessionalInput } from '../types/professionals.types'

const defaults: ProfessionalFormValues = {
  name: '',
  phoneNumber: '',
  email: '',
  notes: '',
  branchIds: [],
  linkedUserId: '',
  isActive: true,
}

export function ProfessionalsPage() {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [isActive, setIsActive] = useState<boolean | undefined>()
  const [branchId, setBranchId] = useState<string | undefined>()
  const [editing, setEditing] = useState<Professional | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const branches = useAllBranches()
  const professionalsQuery = useProfessionals(useMemo(() => ({
    page,
    pageSize,
    search: search.trim() || undefined,
    isActive,
    branchId,
  }), [branchId, isActive, page, pageSize, search]))
  const setActive = useSetProfessionalActive()
  const remove = useDeleteProfessional()
  const professionals = professionalsQuery.data?.data ?? []
  const total = professionalsQuery.data?.meta.totalCount ?? 0

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (professional: Professional) => {
    setEditing(professional)
    setFormOpen(true)
  }

  const deleteProfessional = (professional: Professional) => {
    if (!window.confirm(`Permanently delete ${professional.name}? This cannot be undone.`)) return
    remove.mutate(professional.id)
  }

  return <div className="flex h-full w-full flex-col space-y-6">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Professionals</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage the team members available for services and POS sales.</p>
      </div>
      <Button className="gap-1.5" onClick={openCreate}><Plus className="size-4" /> Add professional</Button>
    </div>

    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative w-full lg:w-96">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input aria-label="Search professionals" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search name, phone, or email" className="pl-9" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Professional status" className={selectClass} value={isActive === undefined ? 'all' : String(isActive)} onChange={(event) => { setIsActive(event.target.value === 'all' ? undefined : event.target.value === 'true'); setPage(1) }}>
          <option value="all">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <select aria-label="Professional branch" className={selectClass} value={branchId ?? 'all'} onChange={(event) => { setBranchId(event.target.value === 'all' ? undefined : event.target.value); setPage(1) }}>
          <option value="all">All branches</option>
          {(branches.data?.data ?? []).map((branch) => <option key={branch.id} value={branch.id}>{branch.code} — {branch.name}</option>)}
        </select>
        <span className="text-sm text-muted-foreground">{total} professional{total === 1 ? '' : 's'}</span>
      </div>
    </div>

    {(setActive.isError || remove.isError) && <p role="alert" className="text-sm text-destructive">{setActive.error?.message ?? remove.error?.message}</p>}

    <DataTableShell>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader><TableRow><TableHead>Professional</TableHead><TableHead>Contact</TableHead><TableHead>Branches</TableHead><TableHead>Linked account</TableHead><TableHead>Status</TableHead><TableHead className="w-36 text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {professionalsQuery.isLoading && <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="mx-auto size-5 animate-spin" /></TableCell></TableRow>}
            {professionalsQuery.isError && !professionalsQuery.isLoading && <TableRow><TableCell colSpan={6} className="h-32 text-center text-destructive">{professionalsQuery.error.message}</TableCell></TableRow>}
            {!professionalsQuery.isLoading && !professionalsQuery.isError && professionals.length === 0 && <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No professionals found.</TableCell></TableRow>}
            {!professionalsQuery.isLoading && !professionalsQuery.isError && professionals.map((professional) => <TableRow key={professional.id}>
              <TableCell><div><p className="font-medium">{professional.name}</p>{professional.notes && <p className="max-w-64 truncate text-xs text-muted-foreground">{professional.notes}</p>}</div></TableCell>
              <TableCell>{professional.phoneNumber ?? professional.email ?? '—'}</TableCell>
              <TableCell>{professional.branches.length === 0 ? 'Unassigned' : professional.branches.map((branch) => branch.code).join(', ')}</TableCell>
              <TableCell>{professional.linkedUser ? <span>{professional.linkedUser.username}{!professional.linkedUser.isActive && ' (inactive)'}</span> : '—'}</TableCell>
              <TableCell><StatusBadge active={professional.isActive} /></TableCell>
              <TableCell><div className="flex justify-end gap-1">
                <ActionButton label={`Edit ${professional.name}`} onClick={() => openEdit(professional)}><Pencil /></ActionButton>
                <ActionButton label={`${professional.isActive ? 'Deactivate' : 'Activate'} ${professional.name}`} onClick={() => setActive.mutate({ id: professional.id, isActive: !professional.isActive })} disabled={setActive.isPending}><Power /></ActionButton>
                <ActionButton label={`Delete ${professional.name}`} onClick={() => deleteProfessional(professional)} disabled={remove.isPending} destructive><Trash2 /></ActionButton>
              </div></TableCell>
            </TableRow>)}
          </TableBody>
        </Table>
      </div>
    </DataTableShell>

    <DataTablePagination page={page} pageSize={pageSize} totalItems={total} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1) }} />
    <ProfessionalFormDialog open={formOpen} professional={editing} branches={branches.data?.data ?? []} branchesLoading={branches.isLoading} onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }} />
  </div>
}

function ProfessionalFormDialog({ open, professional, branches, branchesLoading, onOpenChange }: {
  open: boolean
  professional: Professional | null
  branches: { id: string; code: string; name: string; isActive: boolean }[]
  branchesLoading: boolean
  onOpenChange: (open: boolean) => void
}) {
  const form = useForm<ProfessionalFormValues>({ resolver: zodResolver(professionalSchema), defaultValues: defaults })
  const options = useProfessionalUserOptions(professional?.id ?? null, open)
  const save = useSaveProfessional(professional?.id ?? null)

  useEffect(() => {
    form.reset(professional ? {
      name: professional.name,
      phoneNumber: professional.phoneNumber ?? '',
      email: professional.email ?? '',
      notes: professional.notes ?? '',
      branchIds: professional.branches.map((branch) => branch.id),
      linkedUserId: professional.linkedUser?.id ?? '',
      isActive: professional.isActive,
    } : defaults)
  }, [form, open, professional])

  const submit = (values: ProfessionalFormValues) => {
    const input: ProfessionalInput = {
      name: values.name,
      phoneNumber: emptyToNull(values.phoneNumber),
      email: emptyToNull(values.email),
      notes: emptyToNull(values.notes),
      branchIds: values.branchIds,
      linkedUserId: values.linkedUserId || null,
      isActive: values.isActive,
    }
    save.mutate(input, { onSuccess: () => onOpenChange(false) })
  }

  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
      <DialogHeader><DialogTitle>{professional ? `Edit ${professional.name}` : 'Add professional'}</DialogTitle><DialogDescription>Profiles control service availability. Login account access is managed separately.</DialogDescription></DialogHeader>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" error={form.formState.errors.name?.message}><Input autoFocus {...form.register('name')} /></Field>
          <Field label="Phone" error={form.formState.errors.phoneNumber?.message}><Input type="tel" {...form.register('phoneNumber')} /></Field>
        </div>
        <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field>
        <Field label="Notes" error={form.formState.errors.notes?.message}><Textarea rows={3} {...form.register('notes')} /></Field>
        <Field label="Linked login account" error={form.formState.errors.linkedUserId?.message}>
          <select className={selectClass} {...form.register('linkedUserId')} disabled={options.isLoading}>
            <option value="">No linked account</option>
            {(options.data?.data ?? []).map((user) => <option key={user.id} value={user.id}>{user.username}{!user.isActive ? ' (inactive)' : ''}</option>)}
          </select>
        </Field>
        <div>
          <p className="mb-2 text-sm font-medium">POS branches</p>
          {branchesLoading ? <p className="text-sm text-muted-foreground">Loading branches…</p> : <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
            {branches.filter((branch) => branch.isActive).map((branch) => <label key={branch.id} className="flex items-center gap-2 text-sm"><input type="checkbox" value={branch.id} {...form.register('branchIds')} />{branch.code} — {branch.name}</label>)}
            {branches.filter((branch) => branch.isActive).length === 0 && <p className="text-sm text-muted-foreground">No active branches are available.</p>}
          </div>}
          {form.formState.errors.branchIds?.message && <p className="mt-1 text-xs text-destructive">{form.formState.errors.branchIds.message}</p>}
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active and available in POS</label>
        {save.isError && <p role="alert" className="text-sm text-destructive">{save.error.message}</p>}
        <DialogFooter><Button type="button" variant="outline" disabled={save.isPending} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" disabled={save.isPending}>{save.isPending && <Loader2 className="size-4 animate-spin" />}{professional ? 'Save changes' : 'Add professional'}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return <label className="block text-sm font-medium"><span className="mb-1.5 block">{label}</span>{children}{error && <span className="mt-1 block text-xs font-normal text-destructive">{error}</span>}</label>
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={active ? 'rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700' : 'rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600'}>{active ? 'Active' : 'Inactive'}</span>
}

function ActionButton({ label, children, onClick, disabled, destructive = false }: { label: string; children: ReactNode; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return <Button type="button" variant="ghost" size="icon" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={destructive ? 'text-destructive hover:text-destructive' : undefined}>{children}</Button>
}

function emptyToNull(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs'
