import { getSelectedBranchId } from '@/features/business'
import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  Eye,
  Landmark,
  Loader2,
  Pencil,
  Plus,
  Scale,
  ShieldCheck,
  Trash2,
  Wallet,
} from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link } from 'react-router-dom'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useCurrentUser } from '@/features/auth'
import { useBranches, useCurrencies } from '@/features/business'
import { useUsers } from '@/features/users'
import {
  useDeleteMoneyAccount,
  useMoneyAccountAccess,
  useMoneyAccounts,
  useOpeningBalance,
  useReplaceMoneyAccountAccess,
  useSaveMoneyAccount,
} from '../hooks/useFinance'
import { moneyAccountSchema } from '../schemas/finance.schema'
import {
  MoneyAccountAccessLevel,
  MoneyAccountType,
  type MoneyAccount,
  type MoneyAccountInput,
} from '../types/finance.types'

type FormValue = {
  code: string
  name: string
  type: 0 | 1
  branchId: string
  currencyId: string
  isActive: boolean
  notes: string
  bankName: string
  accountNumberOrIban: string
}

const emptyForm: FormValue = {
  code: '',
  name: '',
  type: 0,
  branchId: '',
  currencyId: '',
  isActive: true,
  notes: '',
  bankName: '',
  accountNumberOrIban: '',
}

export function MoneyAccountsPage() {
  const current = useCurrentUser().data
  const isManagement = Boolean(
    !current ||
      current.role === 'SuperAdmin' ||
      current.role === 'Owner' ||
      current.role === 'Manager' ||
      (current.role as unknown) === 1 ||
      (current.role as unknown) === 2 ||
      (current.role as unknown) === 3
  )

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [branchId, setBranchId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [type, setType] = useState('')
  const [status, setStatus] = useState('')

  const [editingAccount, setEditingAccount] = useState<MoneyAccount | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [accessAccount, setAccessAccount] = useState<MoneyAccount | null>(null)
  const [openingAccount, setOpeningAccount] = useState<MoneyAccount | null>(null)
  const [detailAccount, setDetailAccount] = useState<MoneyAccount | null>(null)

  const deleteAccount = useDeleteMoneyAccount()
  const branches = useBranches().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []

  const query = useMoneyAccounts(
    {
      page,
      pageSize,
      search: search.trim() || undefined,
      branchId: branchId || undefined,
      currencyId: currencyId || undefined,
      type: type !== '' ? (Number(type) as MoneyAccountType) : undefined,
      isActive: status === 'true' ? true : status === 'false' ? false : undefined,
    },
    isManagement
  )

  const rows = query.data?.data ?? []
  const resetPage = () => setPage(1)

  const openCreate = () => {
    setEditingAccount(null)
    setIsFormOpen(true)
  }

  const openEdit = (account: MoneyAccount) => {
    setEditingAccount(account)
    setIsFormOpen(true)
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Money Accounts
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            One cashbox or bank account per currency. Balances come only from posted Money Ledger movements.
          </p>
        </div>
        <Button className="gap-1.5 bg-primarytext-primary-foregroundhover:bg-primary/90" onClick={openCreate}>
          <Plus className="size-4" />
          New Money Account
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 md:grid-cols-5">
        <Input
          aria-label="Search Money Accounts"
          placeholder="Search code or name"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetPage()
          }}
        />
        <Select
          aria-label="Branch filter"
          value={branchId}
          onChange={(event) => {
            setBranchId(event.target.value)
            resetPage()
          }}
        >
          <option value="">Current branch</option>
          {branches.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Currency filter"
          value={currencyId}
          onChange={(event) => {
            setCurrencyId(event.target.value)
            resetPage()
          }}
        >
          <option value="">All currencies</option>
          {currencies.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Type filter"
          value={type}
          onChange={(event) => {
            setType(event.target.value)
            resetPage()
          }}
        >
          <option value="">All types</option>
          <option value="0">Cashbox</option>
          <option value="1">Bank</option>
        </Select>
        <Select
          aria-label="Status filter"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
        >
          <option value="">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead className="px-4">Account</TableHead>
                <TableHead className="px-4">Type</TableHead>
                <TableHead className="px-4">Branch</TableHead>
                <TableHead className="px-4">Currency</TableHead>
                <TableHead className="px-4">Linked GL</TableHead>
                <TableHead className="px-4 text-right">Balance</TableHead>
                <TableHead className="px-4">Access</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="w-36 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <MessageRow label="Loading Money Accounts…" />
              ) : query.isError ? (
                <MessageRow label={query.error.message} error />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p>No Money Accounts found.</p>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-primarytext-primary-foregroundhover:bg-primary/90"
                        onClick={openCreate}
                      >
                        <Plus className="size-4" /> Add Money Account
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((account) => (
                  <TableRow key={account.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <TableCell className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setDetailAccount(account)}
                        className="text-left font-mono font-semibold text-primary hover:underline"
                      >
                        {account.code}
                      </button>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{account.name}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <AccountTypeBadge type={account.type} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{account.branchName}</p>
                      <p className="text-xs text-muted-foreground">{account.branchCode}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <span className="font-mono text-sm font-medium">{account.currencyCode}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <p className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                        {account.accountingAccountCode}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.accountingAccountName}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-mono text-sm font-semibold">
                      <span className={account.balance < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}>
                        {formatAmount(account.balance)}
                      </span>{' '}
                      <span className="text-xs font-normal text-muted-foreground">{account.currencyCode}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <AccessLevelBadge access={account.currentUserAccess} isManagement={isManagement} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <StatusBadge isActive={account.isActive} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDetailAccount(account)}
                          aria-label={`View ${account.name}`}
                          title="View details"
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(account)}
                          aria-label={`Edit ${account.name}`}
                          title="Edit account"
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setAccessAccount(account)}
                          aria-label={`User access for ${account.name}`}
                          title="Manage user access"
                        >
                          <ShieldCheck className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setOpeningAccount(account)}
                          aria-label={`Opening balance for ${account.name}`}
                          title="Post opening balance"
                        >
                          <Scale className="size-4" />
                        </Button>
                        {isManagement && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete ${account.code} (${account.name}) and its dedicated GL account? This is only permitted if no financial movements exist.`
                                )
                              ) {
                                deleteAccount.mutate(account.id, {
                                  onError: (err) => alert(err.message),
                                })
                              }
                            }}
                            aria-label={`Delete ${account.name}`}
                            title="Delete money account"
                            className="text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                            disabled={deleteAccount.isPending}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </DataTableShell>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        totalItems={query.data?.meta.totalCount ?? 0}
        onPageChange={setPage}
        onPageSizeChange={(value) => {
          setPageSize(value)
          setPage(1)
        }}
      />

      <MoneyAccountFormDialog
        key={editingAccount?.id ?? (isFormOpen ? 'open-new' : 'closed')}
        open={isFormOpen}
        account={editingAccount}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingAccount(null)
        }}
      />

      <AccountAccessDialog
        key={accessAccount?.id}
        account={accessAccount}
        onOpenChange={(open) => {
          if (!open) setAccessAccount(null)
        }}
      />

      <OpeningBalanceDialog
        key={openingAccount?.id}
        account={openingAccount}
        onOpenChange={(open) => {
          if (!open) setOpeningAccount(null)
        }}
      />

      <AccountDetailDialog
        key={detailAccount?.id}
        account={detailAccount}
        onOpenChange={(open) => {
          if (!open) setDetailAccount(null)
        }}
        onEdit={(account) => {
          setDetailAccount(null)
          openEdit(account)
        }}
      />
    </div>
  )
}

function MoneyAccountFormDialog({
  open,
  account,
  onOpenChange,
}: {
  open: boolean
  account: MoneyAccount | null
  onOpenChange: (open: boolean) => void
}) {
  const branches = useBranches().data?.data ?? []
  const currencies = useCurrencies().data?.data ?? []
  const save = useSaveMoneyAccount(account?.id)
  const deleteAccount = useDeleteMoneyAccount()

  const form = useForm<FormValue>({
    resolver: zodResolver(moneyAccountSchema),
    defaultValues: account
      ? {
          code: account.code,
          name: account.name,
          type: account.type,
          branchId: account.branchId,
          currencyId: account.currencyId,
          isActive: account.isActive,
          notes: account.notes ?? '',
          bankName: account.bankName ?? '',
          accountNumberOrIban: account.accountNumberOrIban ?? '',
        }
      : { ...emptyForm, branchId: getSelectedBranchId() },
  })

  const closeDialog = () => {
    save.reset()
    form.reset({ ...emptyForm, branchId: getSelectedBranchId() })
    onOpenChange(false)
  }

  const selectedType = useWatch({ control: form.control, name: 'type' })

  const submit = form.handleSubmit((values) => {
    const input: MoneyAccountInput = {
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      type: values.type,
      branchId: values.branchId,
      currencyId: values.currencyId,
      isActive: values.isActive,
      notes: clean(values.notes),
      bankName: values.type === MoneyAccountType.Bank ? clean(values.bankName) : null,
      accountNumberOrIban:
        values.type === MoneyAccountType.Bank ? clean(values.accountNumberOrIban) : null,
    }

    save.mutate(input, {
      onSuccess: closeDialog,
    })
  })

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{account ? `Edit ${account.code}` : 'New Money Account'}</DialogTitle>
          <DialogDescription>
            {account
              ? 'Update operational settings or descriptive details for this money account.'
              : 'Register a new cashbox or bank account. A dedicated GL account will be automatically assigned from the Iraqi Unified Accounting System.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Operational code" error={form.formState.errors.code?.message}>
              <Input
                placeholder="e.g. CASH-MAIN-IQD"
                className="font-mono uppercase"
                {...form.register('code')}
                autoFocus
              />
            </Field>
            <Field label="Account name" error={form.formState.errors.name?.message}>
              <Input placeholder="e.g. Main Cashbox IQD" {...form.register('name')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Account type" error={form.formState.errors.type?.message}>
              <Select {...form.register('type', { valueAsNumber: true })}>
                <option value="0">Cashbox</option>
                <option value="1">Bank</option>
              </Select>
            </Field>

            <Field label="Branch" error={form.formState.errors.branchId?.message}>
              <Select {...form.register('branchId')}>

                {branches
                  .filter((item) => item.isActive || item.id === account?.branchId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} — {item.name}
                    </option>
                  ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Currency" error={form.formState.errors.currencyId?.message}>
              <Select {...form.register('currencyId')}>
                <option value="">Select currency</option>
                {currencies
                  .filter((item) => item.isActive || item.id === account?.currencyId)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code}
                    </option>
                  ))}
              </Select>
            </Field>

            {account ? (
              <Field label="GL Account (auto-assigned)">
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                    {account.accountingAccountCode}
                  </span>
                  <span className="ml-2 truncate text-xs text-muted-foreground">
                    {account.accountingAccountName}
                  </span>
                </div>
              </Field>
            ) : (
              <Field label="GL Account">
                <div className="flex h-10 items-center rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/40">
                  Auto-assigned on creation
                </div>
              </Field>
            )}
          </div>

          {selectedType === 1 && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Banking Details
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Bank name" error={form.formState.errors.bankName?.message}>
                  <Input placeholder="e.g. Trade Bank of Iraq" {...form.register('bankName')} />
                </Field>
                <Field label="Account / IBAN" error={form.formState.errors.accountNumberOrIban?.message}>
                  <Input placeholder="e.g. IQ00TBI0000000000" {...form.register('accountNumberOrIban')} />
                </Field>
              </div>
            </div>
          )}

          <Field label="Notes (optional)" error={form.formState.errors.notes?.message}>
            <Textarea rows={2} placeholder="Additional operational notes" {...form.register('notes')} />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 accent-primary"
              {...form.register('isActive')}
            />
            <span>Active for new postings</span>
          </label>

          {save.isError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{save.error.message}</span>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between gap-2 pt-2 sm:justify-between">
            {account ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete ${account.code} (${account.name}) and its dedicated GL account? This is only permitted if no financial movements exist.`
                    )
                  ) {
                    deleteAccount.mutate(account.id, {
                      onSuccess: closeDialog,
                      onError: (err) => alert(err.message),
                    })
                  }
                }}
                disabled={deleteAccount.isPending || save.isPending}
              >
                <Trash2 className="mr-1.5 size-4" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={save.isPending}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primarytext-primary-foregroundhover:bg-primary/90" disabled={save.isPending}>
                {save.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                {account ? 'Save changes' : 'Add account'}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AccountAccessDialog({
  account,
  onOpenChange,
}: {
  account: MoneyAccount | null
  onOpenChange: (open: boolean) => void
}) {
  const accessQuery = useMoneyAccountAccess(account?.id)
  const usersQuery = useUsers(1, 100)
  const replaceAccess = useReplaceMoneyAccountAccess(account?.id ?? '')

  const users = usersQuery.data?.data.filter((u) => u.isActive) ?? []
  const assignments = accessQuery.data ?? []

  const close = () => {
    replaceAccess.reset()
    onOpenChange(false)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!account) return

    const data = new FormData(event.currentTarget)
    const nextAssignments = users.flatMap((user) => {
      const value = data.get(user.id)
      return value === '' || value === null
        ? []
        : [{ userId: user.id, accessLevel: Number(value) as 0 | 1 }]
    })

    replaceAccess.mutate(nextAssignments, {
      onSuccess: close,
    })
  }

  return (
    <Dialog open={account !== null} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>User Access: {account?.code}</DialogTitle>
          <DialogDescription>
            Grant View or Operate permissions to users for {account?.name}.
          </DialogDescription>
        </DialogHeader>

        {accessQuery.isPending || usersQuery.isPending ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>Loading user permissions…</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-card dark:divide-slate-800 dark:border-slate-800">
              {users.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">No active users found.</p>
              ) : (
                users.map((user) => {
                  const existing = assignments.find((item) => item.userId === user.id)
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/40"
                    >
                      <div>
                        <p className="font-medium text-slate-800 dark:text-slate-200">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                      <Select
                        name={user.id}
                        defaultValue={existing ? String(existing.accessLevel) : ''}
                        className="w-36"
                      >
                        <option value="">No access</option>
                        <option value={MoneyAccountAccessLevel.View}>View only</option>
                        <option value={MoneyAccountAccessLevel.Operate}>Operate</option>
                      </Select>
                    </div>
                  )
                })
              )}
            </div>

            {replaceAccess.isError && (
              <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <span>{replaceAccess.error.message}</span>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={close}
                disabled={replaceAccess.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-primarytext-primary-foregroundhover:bg-primary/90"
                disabled={replaceAccess.isPending}
              >
                {replaceAccess.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
                Save access
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

function OpeningBalanceDialog({
  account,
  onOpenChange,
}: {
  account: MoneyAccount | null
  onOpenChange: (open: boolean) => void
}) {
  const opening = useOpeningBalance(account?.id ?? '')
  const [date, setDate] = useState(() => today())
  const [amount, setAmount] = useState('')
  const [exchangeRate, setExchangeRate] = useState('')
  const [notes, setNotes] = useState(() => (account ? `Opening balance for ${account.name}` : ''))

  const close = () => {
    opening.reset()
    onOpenChange(false)
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!account) return

    opening.mutate(
      {
        date,
        amount: Number(amount),
        exchangeRate: exchangeRate ? Number(exchangeRate) : null,
        notes: clean(notes),
      },
      {
        onSuccess: close,
      }
    )
  }

  return (
    <Dialog open={account !== null} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Post Opening Balance: {account?.code}</DialogTitle>
          <DialogDescription>
            Posts an initial auditable opening movement and balanced Accounting journal before ledger transactions begin.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Movement date">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>

          <Field label={`Opening amount (${account?.currencyCode ?? ''})`}>
            <Input
              type="number"
              min="0.0001"
              step="0.0001"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </Field>

          <Field label="Exchange rate (optional for foreign currency)">
            <Input
              type="number"
              min="0.000001"
              step="0.000001"
              placeholder="Leave blank for 1:1 base rate"
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
          </Field>

          <Field label="Notes">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          {opening.isError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{opening.error.message}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={opening.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-primarytext-primary-foregroundhover:bg-primary/90"
              disabled={opening.isPending}
            >
              {opening.isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              Post opening balance
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function AccountDetailDialog({
  account,
  onOpenChange,
  onEdit,
}: {
  account: MoneyAccount | null
  onOpenChange: (open: boolean) => void
  onEdit: (account: MoneyAccount) => void
}) {
  const deleteAccount = useDeleteMoneyAccount()

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 font-mono text-lg text-slate-900 dark:text-slate-100">
              {account?.code}
            </DialogTitle>
            {account && <AccountTypeBadge type={account.type} />}
          </div>
          <DialogDescription>{account?.name}</DialogDescription>
        </DialogHeader>

        {account && (
          <div className="space-y-4 text-sm">
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Current Balance</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatAmount(account.balance)}{' '}
                <span className="text-base font-normal text-muted-foreground">{account.currencyCode}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Branch" value={`${account.branchName} (${account.branchCode})`} />
              <DetailItem label="Currency" value={account.currencyCode} />
              <DetailItem
                label="Linked GL Account"
                value={`${account.accountingAccountCode} — ${account.accountingAccountName}`}
              />
              <DetailItem
                label="Status"
                value={account.isActive ? 'Active for postings' : 'Inactive'}
              />
            </div>

            {account.type === MoneyAccountType.Bank && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Banking Details
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Bank name:</span>{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {account.bankName ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Account / IBAN:</span>{' '}
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {account.accountNumberOrIban ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {account.notes && (
              <div>
                <p className="text-xs font-medium text-muted-foreground">Notes</p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{account.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link
                to={`/finance/money-ledger?moneyAccountId=${account.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                View related Money Ledger movements →
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${account.code} (${account.name}) and its dedicated GL account? This is only permitted if no financial movements exist.`
                      )
                    ) {
                      deleteAccount.mutate(account.id, {
                        onSuccess: () => onOpenChange(false),
                        onError: (err) => alert(err.message),
                      })
                    }
                  }}
                  disabled={deleteAccount.isPending}
                >
                  <Trash2 className="mr-1.5 size-3.5" />
                  Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(account)}>
                  <Pencil className="mr-1.5 size-3.5" />
                  Edit Account
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  )
}

function AccountTypeBadge({ type }: { type: MoneyAccountType }) {
  return type === MoneyAccountType.Bank ? (
    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
      <Landmark className="size-3" />
      Bank
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <Wallet className="size-3" />
      Cashbox
    </span>
  )
}

function AccessLevelBadge({
  access,
  isManagement,
}: {
  access: MoneyAccountAccessLevel | null
  isManagement: boolean
}) {
  if (access === MoneyAccountAccessLevel.Operate) {
    return (
      <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        Operate
      </span>
    )
  }
  if (access === MoneyAccountAccessLevel.View) {
    return (
      <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        View
      </span>
    )
  }
  if (isManagement) {
    return (
      <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        Management
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={
        isActive
          ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }
    >
      {isActive ? 'Active' : 'Inactive'}
    </span>
  )
}

function Field({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
      {children}
      {error && <span className="text-xs font-normal text-destructive">{error}</span>}
    </div>
  )
}

function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-primary focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900',
        className
      )}
      {...props}
    />
  )
}

function MessageRow({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <TableRow>
      <TableCell
        colSpan={9}
        className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}
      >
        {label}
      </TableCell>
    </TableRow>
  )
}

const clean = (value: string) => value.trim() || null
const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const today = () => new Date().toISOString().slice(0, 10)
const head =
  'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'

