import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  Building2,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  UserRound,
} from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
import { DataTableShell } from '@/components/data-table/DataTableShell'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  useContact,
  useContacts,
  useDeleteContact,
  useSaveContact,
  useSetContactActive,
} from '../hooks/useContacts'
import { contactSchema, type ContactFormValues } from '../schemas/contact.schemas'
import type { Contact, ContactInput, ContactKind, ContactRole } from '../types/contact.types'

const defaults: ContactFormValues = {
  name: '',
  kind: 0,
  isCustomer: true,
  isSupplier: false,
  primaryPhoneNumber: '',
  secondaryPhoneNumber: '',
  email: '',
  address: '',
  city: '',
  region: '',
  country: '',
  notes: '',
  isActive: true,
}

const roleValues: Record<string, ContactRole | undefined> = {
  all: undefined,
  customer: 0,
  supplier: 1,
  both: 2,
}

export function ContactsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [editing, setEditing] = useState<Contact | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const roleKey = searchParams.get('role') ?? 'all'
  const role = roleValues[roleKey]
  const activeParam = searchParams.get('active')
  const kindParam = searchParams.get('kind')

  const query = useMemo(() => ({
    page,
    pageSize,
    search: search.trim() || undefined,
    role,
    isActive: activeParam === 'active' ? true : activeParam === 'inactive' ? false : undefined,
    kind: kindParam === 'individual' ? 0 as ContactKind : kindParam === 'business' ? 1 as ContactKind : undefined,
  }), [activeParam, kindParam, page, pageSize, role, search])

  const contactsQuery = useContacts(query)
  const setActive = useSetContactActive()
  const deleteContact = useDeleteContact()
  const contacts = contactsQuery.data?.data ?? []
  const totalContacts = contactsQuery.data?.meta.totalCount ?? 0

  const setFilter = (key: 'role' | 'active' | 'kind', value: string) => {
    const next = new URLSearchParams(searchParams)
    if (value === 'all') next.delete(key)
    else next.set(key, value)
    setSearchParams(next, { replace: true })
    setPage(1)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (contact: Contact) => {
    setEditing(contact)
    setFormOpen(true)
  }

  const remove = (contact: Contact) => {
    if (!window.confirm(`Permanently delete ${contact.name}? This cannot be undone.`)) return
    deleteContact.mutate(contact.id)
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Contacts</h1>
          <p className="mt-1 text-sm text-slate-500">Manage the people and businesses used by sales and purchases.</p>
        </div>
        <Button className="gap-1.5 bg-primarytext-primary-foregroundhover:bg-primary/90" onClick={openCreate}>
          <Plus className="size-4" /> Add contact
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'customer', 'supplier', 'both'] as const).map((value) => (
          <Button
            key={value}
            size="sm"
            variant={roleKey === value ? 'default' : 'outline'}
            onClick={() => setFilter('role', value)}
          >
            {value === 'all' ? 'All' : value === 'customer' ? 'Customers' : value === 'supplier' ? 'Suppliers' : 'Both'}
          </Button>
        ))}
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1) }}
            placeholder="Search name, phone, or email"
            className="h-10 rounded-lg border-slate-200 bg-white pl-9 shadow-xs dark:border-slate-800 dark:bg-slate-900"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            label="Status"
            value={activeParam ?? 'all'}
            onChange={(value) => setFilter('active', value)}
            options={[['all', 'All statuses'], ['active', 'Active'], ['inactive', 'Inactive']]}
          />
          <FilterSelect
            label="Type"
            value={kindParam ?? 'all'}
            onChange={(value) => setFilter('kind', value)}
            options={[['all', 'All types'], ['individual', 'Individual'], ['business', 'Business']]}
          />
          <span className="ml-1 text-sm text-slate-500">{totalContacts} contact{totalContacts === 1 ? '' : 's'}</span>
        </div>
      </div>

      {(setActive.isError || deleteContact.isError) && (
        <p className="text-sm text-destructive">{setActive.error?.message ?? deleteContact.error?.message}</p>
      )}

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead className="px-4">Contact</TableHead>
                <TableHead className="px-4">Role</TableHead>
                <TableHead className="px-4">Phone</TableHead>
                <TableHead className="px-4">Email</TableHead>
                <TableHead className="px-4">City</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="w-44 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactsQuery.isLoading && <LoadingRow />}
              {contactsQuery.isError && !contactsQuery.isLoading && <ErrorRow />}
              {!contactsQuery.isLoading && !contactsQuery.isError && contacts.length === 0 && (
                <TableRow><TableCell colSpan={7} className="h-48 text-center text-sm text-slate-500">No contacts found.</TableCell></TableRow>
              )}
              {!contactsQuery.isLoading && !contactsQuery.isError && contacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                  <TableCell className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="rounded-full bg-slate-100 p-2 text-slate-500 dark:bg-slate-800">
                        {contact.kind === 0 ? <UserRound className="size-4" /> : <Building2 className="size-4" />}
                      </span>
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{contact.name}</p>
                        <p className="text-xs text-slate-500">{contact.kind === 0 ? 'Individual' : 'Business'}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3.5"><RoleBadge contact={contact} /></TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{contact.primaryPhoneNumber ?? '—'}</TableCell>
                  <TableCell className="max-w-56 truncate px-4 py-3.5 text-slate-600 dark:text-slate-300">{contact.email ?? '—'}</TableCell>
                  <TableCell className="px-4 py-3.5 text-slate-600 dark:text-slate-300">{contact.city ?? '—'}</TableCell>
                  <TableCell className="px-4 py-3.5"><StatusBadge active={contact.isActive} /></TableCell>
                  <TableCell className="px-4 py-3.5">
                    <div className="flex justify-end gap-1">
                      <ActionButton label={`View ${contact.name}`} onClick={() => setDetailId(contact.id)}><Eye /></ActionButton>
                      <ActionButton label={`Edit ${contact.name}`} onClick={() => openEdit(contact)}><Pencil /></ActionButton>
                      <ActionButton
                        label={`${contact.isActive ? 'Deactivate' : 'Activate'} ${contact.name}`}
                        onClick={() => setActive.mutate({ id: contact.id, isActive: !contact.isActive })}
                        disabled={setActive.isPending}
                      ><Power /></ActionButton>
                      <ActionButton label={`Delete ${contact.name}`} onClick={() => remove(contact)} disabled={deleteContact.isPending} destructive><Trash2 /></ActionButton>
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
        totalItems={totalContacts}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1) }}
      />

      <ContactFormDialog
        open={formOpen}
        contact={editing}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditing(null) }}
      />
      <ContactDetailDialog id={detailId} onOpenChange={(open) => { if (!open) setDetailId(null) }} />
    </div>
  )
}

function ContactFormDialog({ open, contact, onOpenChange }: { open: boolean; contact: Contact | null; onOpenChange: (open: boolean) => void }) {
  const form = useForm<ContactFormValues>({ resolver: zodResolver(contactSchema), defaultValues: defaults })
  const save = useSaveContact(contact?.id ?? null)

  useEffect(() => {
    form.reset(contact ? toFormValues(contact) : defaults)
  }, [contact, form, open])

  const submit = (values: ContactFormValues) => {
    const input: ContactInput = {
      ...values,
      primaryPhoneNumber: emptyToNull(values.primaryPhoneNumber),
      secondaryPhoneNumber: emptyToNull(values.secondaryPhoneNumber),
      email: emptyToNull(values.email),
      address: emptyToNull(values.address),
      city: emptyToNull(values.city),
      region: emptyToNull(values.region),
      country: emptyToNull(values.country),
      notes: emptyToNull(values.notes),
    }
    save.mutate(input, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contact ? `Edit ${contact.name}` : 'Add contact'}</DialogTitle>
          <DialogDescription>Keep the record practical; only the name and at least one role are required.</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(submit)} className="space-y-6">
          <FormSection title="Basic information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name" error={form.formState.errors.name?.message}><Input {...form.register('name')} autoFocus /></Field>
              <Field label="Type" error={form.formState.errors.kind?.message}>
                <select className={selectClass} {...form.register('kind', { valueAsNumber: true })}>
                  <option value={0}>Individual</option>
                  <option value={1}>Business</option>
                </select>
              </Field>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">Roles</p>
              <div className="flex flex-wrap gap-5">
                <Checkbox label="Customer" {...form.register('isCustomer')} />
                <Checkbox label="Supplier" {...form.register('isSupplier')} />
              </div>
              {form.formState.errors.isCustomer?.message && <p className="mt-1 text-xs text-destructive">{form.formState.errors.isCustomer.message}</p>}
            </div>
          </FormSection>

          <FormSection title="Contact information">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Primary phone"><Input type="tel" {...form.register('primaryPhoneNumber')} /></Field>
              <Field label="Secondary phone"><Input type="tel" {...form.register('secondaryPhoneNumber')} /></Field>
            </div>
            <Field label="Email" error={form.formState.errors.email?.message}><Input type="email" {...form.register('email')} /></Field>
          </FormSection>

          <FormSection title="Address">
            <Field label="Address"><Textarea rows={2} {...form.register('address')} /></Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City"><Input {...form.register('city')} /></Field>
              <Field label="Region / governorate"><Input {...form.register('region')} /></Field>
              <Field label="Country"><Input {...form.register('country')} /></Field>
            </div>
          </FormSection>

          <FormSection title="Additional">
            <Field label="Notes"><Textarea rows={3} {...form.register('notes')} /></Field>
            <Checkbox label="Active" {...form.register('isActive')} />
          </FormSection>

          {save.isError && <p className="text-sm text-destructive">{save.error.message}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={save.isPending}>Cancel</Button>
            <Button type="submit" disabled={save.isPending}>
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {contact ? 'Save changes' : 'Add contact'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ContactDetailDialog({ id, onOpenChange }: { id: string | null; onOpenChange: (open: boolean) => void }) {
  const contactQuery = useContact(id)
  const contact = contactQuery.data

  return (
    <Dialog open={id !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{contact?.name ?? 'Contact details'}</DialogTitle>
          <DialogDescription>Commercial identity and contact information.</DialogDescription>
        </DialogHeader>
        {contactQuery.isLoading && <div className="py-12 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 size-6 animate-spin" />Loading contact…</div>}
        {contactQuery.isError && <p className="py-8 text-center text-sm text-destructive">{contactQuery.error.message}</p>}
        {contact && (
          <div className="space-y-5 text-sm">
            <div className="flex flex-wrap items-center gap-2"><RoleBadge contact={contact} /><StatusBadge active={contact.isActive} /><span className="text-slate-500">{contact.kind === 0 ? 'Individual' : 'Business'}</span></div>
            <DetailSection title="Contact information" rows={[
              ['Primary phone', contact.primaryPhoneNumber],
              ['Secondary phone', contact.secondaryPhoneNumber],
              ['Email', contact.email],
            ]} />
            <DetailSection title="Address" rows={[
              ['Address', contact.address],
              ['City', contact.city],
              ['Region / governorate', contact.region],
              ['Country', contact.country],
            ]} />
            <div>
              <h3 className="mb-1 font-semibold text-slate-800 dark:text-slate-200">Notes</h3>
              <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-300">{contact.notes ?? '—'}</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailSection({ title, rows }: { title: string; rows: Array<[string, string | null]> }) {
  return <div><h3 className="mb-2 font-semibold text-slate-800 dark:text-slate-200">{title}</h3><dl className="grid grid-cols-[9rem_1fr] gap-x-4 gap-y-2">{rows.map(([label, value]) => <div className="contents" key={label}><dt className="text-slate-500">{label}</dt><dd className="text-slate-700 dark:text-slate-300">{value ?? '—'}</dd></div>)}</dl></div>
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string, string]> }) {
  return <label className="flex items-center gap-2 text-xs text-slate-500">{label}<select className={selectClass} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([optionValue, text]) => <option key={optionValue} value={optionValue}>{text}</option>)}</select></label>
}

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="space-y-4"><h3 className="border-b pb-2 text-sm font-semibold text-slate-800 dark:text-slate-200">{title}</h3>{children}</section>
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">{label}{children}{error && <span className="text-xs font-normal text-destructive">{error}</span>}</label>
}

function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300"><input type="checkbox" className="size-4 rounded border-slate-300 accent-primary" {...props} />{label}</label>
}

function RoleBadge({ contact }: { contact: Contact }) {
  const label = contact.isCustomer && contact.isSupplier ? 'Customer · Supplier' : contact.isCustomer ? 'Customer' : 'Supplier'
  return <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700 dark:bg-blue-950 dark:text-blue-300">{label}</span>
}

function StatusBadge({ active }: { active: boolean }) {
  return <span className={active ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600' : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500'}>{active ? 'Active' : 'Inactive'}</span>
}

function ActionButton({ label, destructive, children, ...props }: React.ComponentProps<typeof Button> & { label: string; destructive?: boolean }) {
  return <Button variant={destructive ? 'destructive' : 'ghost'} size="icon-sm" aria-label={label} title={label} {...props}>{children}</Button>
}

function LoadingRow() {
  return <TableRow><TableCell colSpan={7} className="h-48 text-center text-sm text-slate-500"><Loader2 className="mx-auto mb-2 size-6 animate-spin text-primary" />Loading contacts…</TableCell></TableRow>
}

function ErrorRow() {
  return <TableRow><TableCell colSpan={7} className="h-48 text-center"><AlertCircle className="mx-auto mb-2 size-7 text-destructive" /><p className="text-sm text-destructive">Failed to load contacts.</p></TableCell></TableRow>
}

function toFormValues(contact: Contact): ContactFormValues {
  return {
    name: contact.name,
    kind: contact.kind,
    isCustomer: contact.isCustomer,
    isSupplier: contact.isSupplier,
    primaryPhoneNumber: contact.primaryPhoneNumber ?? '',
    secondaryPhoneNumber: contact.secondaryPhoneNumber ?? '',
    email: contact.email ?? '',
    address: contact.address ?? '',
    city: contact.city ?? '',
    region: contact.region ?? '',
    country: contact.country ?? '',
    notes: contact.notes ?? '',
    isActive: contact.isActive,
  }
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed.length === 0 ? null : trimmed
}

const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'
