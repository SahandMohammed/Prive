import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertCircle, Building2, Loader2, Mail, MapPin, Pencil, Phone, Plus, Power, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { branchSchema, type BranchFormValues } from '../schemas/business.schemas'
import { useAllBranches, useDeactivateBranch, useSaveBranch } from '../hooks/useBusiness'
import type { Branch, BranchInput } from '../types/business.types'

const defaults: BranchFormValues = { code: '', name: '', phoneNumber: '', email: '', address: '', city: '', region: '', country: '', isMainBranch: false, isActive: true, catalogMode: 'Shared' }

export function BranchesPage() {
  const branchesQuery = useAllBranches()
  const [editing, setEditing] = useState<Branch | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

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

  const filteredBranches = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return branches
    return branches.filter((branch) =>
      branch.name.toLowerCase().includes(term) ||
      branch.code.toLowerCase().includes(term) ||
      (branch.city && branch.city.toLowerCase().includes(term)) ||
      (branch.region && branch.region.toLowerCase().includes(term)) ||
      (branch.phoneNumber && branch.phoneNumber.toLowerCase().includes(term)) ||
      (branch.email && branch.email.toLowerCase().includes(term))
    )
  }, [branches, search])

  const totalBranches = filteredBranches.length
  const paginatedBranches = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredBranches.slice(start, start + pageSize)
  }, [filteredBranches, page, pageSize])

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Branches</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the locations where business operations take place.</p>
        </div>
        <Button className="gap-1.5 bg-[#e05d38] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#c94f2d]" onClick={openCreateDialog}>
          <Plus className="h-4 w-4 stroke-[2.5]" />
          Add branch
        </Button>
      </div>

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            placeholder="Search branches"
            className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        <p className="text-sm text-slate-500">{totalBranches} branch{totalBranches === 1 ? '' : 'es'}</p>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Code</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Branch</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Location</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Contact</TableHead>
                <TableHead className="px-4 font-semibold text-slate-600 dark:text-slate-300">Status</TableHead>
                <TableHead className="w-24 px-4 text-right font-semibold text-slate-600 dark:text-slate-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {branchesQuery.isLoading && <LoadingRow />}
              {branchesQuery.isError && !branchesQuery.isLoading && <ErrorRow />}
              {!branchesQuery.isLoading && !branchesQuery.isError && paginatedBranches.length === 0 && <EmptyRow onAdd={openCreateDialog} />}
              {!branchesQuery.isLoading && !branchesQuery.isError && paginatedBranches.map((branch) => (
                <TableRow key={branch.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <TableCell className="px-4 py-3.5 font-mono text-sm font-medium text-slate-700 dark:text-slate-300">{branch.code}</TableCell>
                  <TableCell className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-800 dark:text-slate-200">{branch.name}</span>
                      {branch.isMainBranch && (
                        <span className="inline-flex items-center rounded bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-[#e05d38] dark:bg-orange-950/40">Main</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    {branch.city || branch.region ? (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        {[branch.city, branch.region].filter(Boolean).join(', ')}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">
                    <div className="space-y-0.5 text-xs">
                      {branch.phoneNumber && <p className="flex items-center gap-1"><Phone className="h-3 w-3 text-slate-400" />{branch.phoneNumber}</p>}
                      {branch.email && <p className="flex items-center gap-1"><Mail className="h-3 w-3 text-slate-400" />{branch.email}</p>}
                      {!branch.phoneNumber && !branch.email && '—'}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <span className={branch.isActive ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600' : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500'}>
                      {branch.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => openEditDialog(branch)} aria-label={`Edit ${branch.name}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {branch.isActive && !branch.isMainBranch && (
                        <Button variant="ghost" size="icon-sm" onClick={() => deactivateBranch.mutate(branch.id)} disabled={deactivateBranch.isPending} aria-label={`Deactivate ${branch.name}`}>
                          <Power className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalBranches}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      <Dialog open={isDialogOpen} onOpenChange={(open) => open ? setIsDialogOpen(true) : closeDialog()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${editing.code}` : 'Add branch'}</DialogTitle>
            <DialogDescription>Enter the branch details used by operational modules.</DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit((values) => saveBranch.mutate(values, { onSuccess: closeDialog }))} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Code" error={form.formState.errors.code?.message}><Input maxLength={20} className="uppercase" {...form.register('code')} /></Field><Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register('name')} /></Field></div>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone" error={form.formState.errors.phoneNumber?.message}><Input {...form.register('phoneNumber')} /></Field><Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field></div>
            <Field label="Address" error={form.formState.errors.address?.message}><Input {...form.register('address')} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="City" error={form.formState.errors.city?.message}><Input {...form.register('city')} /></Field><Field label="Region / governorate" error={form.formState.errors.region?.message}><Input {...form.register('region')} /></Field></div>
            <Field label="Country" error={form.formState.errors.country?.message}><Input {...form.register('country')} /></Field>
            <fieldset className="space-y-2 rounded-md border border-border p-4">
              <legend className="px-1 text-sm font-medium">Customers, suppliers, and item definitions</legend>
              {editing ? <p className="text-sm">{editing.catalogMode === 'Shared' ? 'Shared business catalog' : 'Separate branch catalog'}</p> : <>
              <label className="flex items-center gap-2 text-sm"><input type="radio" value="Shared" {...form.register('catalogMode')} /> Share the business catalog</label>
              <label className="flex items-center gap-2 text-sm"><input type="radio" value="Separate" {...form.register('catalogMode')} /> Separate catalog for this branch</label>
              </>}
              <p className="text-xs text-muted-foreground">Shared branches use the same contacts, products, services, categories, and units. Separate branches start with an empty catalog. This choice is fixed after creation.</p>
              <p className="text-xs text-muted-foreground">The chart of accounts and currencies are always shared. Transactions and balances belong to the selected branch.</p>
            </fieldset>
            <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isMainBranch')} /> Main branch</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" {...form.register('isActive')} /> Active</label></div>
            {saveBranch.isError && <p className="text-sm text-destructive">{saveBranch.error.message}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={closeDialog} disabled={saveBranch.isPending}>Cancel</Button>
              <Button type="submit" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" disabled={saveBranch.isPending}>{saveBranch.isPending && <Loader2 className="size-4 animate-spin" />}{editing ? 'Save changes' : 'Add branch'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label>
}

function LoadingRow() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-48 text-center text-sm text-slate-500">
        <div className="flex flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-[#e05d38]" />
          <span>Loading branches...</span>
        </div>
      </TableCell>
    </TableRow>
  )
}

function ErrorRow() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-48 text-center">
        <div className="flex flex-col items-center text-red-500">
          <AlertCircle className="mb-2 h-8 w-8" />
          <p className="text-sm font-medium">Failed to load branches</p>
        </div>
      </TableCell>
    </TableRow>
  )
}

function EmptyRow({ onAdd }: { onAdd: () => void }) {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-56 text-center">
        <div className="flex flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
            <Building2 className="h-6 w-6 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-slate-800 dark:text-slate-200">No branches found</p>
            <p className="mt-1 text-sm text-slate-500">Create your main branch to get started.</p>
          </div>
          <Button size="sm" className="bg-[#e05d38] text-white hover:bg-[#c94f2d]" onClick={onAdd}>
            <Plus className="h-4 w-4" /> Add branch
          </Button>
        </div>
      </TableCell>
    </TableRow>
  )
}
