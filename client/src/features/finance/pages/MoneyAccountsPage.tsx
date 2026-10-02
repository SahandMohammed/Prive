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
import { useTranslation } from 'react-i18next'
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
import { formatNumber } from '@/lib/i18n'
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
  const { t } = useTranslation(['finance', 'common'])
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
            {t('finance:moneyAccountsPage.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('finance:moneyAccountsPage.description')}
          </p>
        </div>
        <Button className="gap-1.5" onClick={openCreate}>
          <Plus className="size-4" />
          {t('finance:moneyAccountsPage.newAccount')}
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 md:grid-cols-5">
        <Input
          aria-label={t('finance:moneyAccountsPage.searchPlaceholder')}
          placeholder={t('finance:moneyAccountsPage.searchPlaceholder')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetPage()
          }}
        />
        <Select
          aria-label={t('finance:moneyAccountsPage.currentBranch')}
          value={branchId}
          onChange={(event) => {
            setBranchId(event.target.value)
            resetPage()
          }}
        >
          <option value="">{t('finance:moneyAccountsPage.currentBranch')}</option>
          {branches.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('finance:moneyAccountsPage.allCurrencies')}
          value={currencyId}
          onChange={(event) => {
            setCurrencyId(event.target.value)
            resetPage()
          }}
        >
          <option value="">{t('finance:moneyAccountsPage.allCurrencies')}</option>
          {currencies.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('finance:moneyAccountsPage.allTypes')}
          value={type}
          onChange={(event) => {
            setType(event.target.value)
            resetPage()
          }}
        >
          <option value="">{t('finance:moneyAccountsPage.allTypes')}</option>
          <option value="0">{t('finance:moneyAccountsPage.cashbox')}</option>
          <option value="1">{t('finance:moneyAccountsPage.bank')}</option>
        </Select>
        <Select
          aria-label={t('finance:moneyAccountsPage.allStatuses')}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
        >
          <option value="">{t('finance:moneyAccountsPage.allStatuses')}</option>
          <option value="true">{t('finance:moneyAccountsPage.active')}</option>
          <option value="false">{t('finance:moneyAccountsPage.inactive')}</option>
        </Select>
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.account')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.type')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.branch')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.currency')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.linkedGl')}</TableHead>
                <TableHead className="px-4 text-end">{t('finance:moneyAccountsPage.th.balance')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.access')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.status')}</TableHead>
                <TableHead className="w-36 px-4 text-end">{t('finance:moneyAccountsPage.th.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <MessageRow label={t('finance:moneyAccountsPage.loading')} />
              ) : query.isError ? (
                <MessageRow label={query.error.message} error />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p>{t('finance:moneyAccountsPage.empty')}</p>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={openCreate}
                      >
                        <Plus className="size-4" /> {t('finance:moneyAccountsPage.newAccount')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((account) => (
                  <TableRow key={account.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <TableCell className="px-4 py-3.5 text-start">
                      <button
                        type="button"
                        onClick={() => setDetailAccount(account)}
                        className="text-start font-mono font-semibold text-primary hover:underline"
                      >
                        {account.code}
                      </button>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{account.name}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <AccountTypeBadge type={account.type} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p className="text-sm text-slate-700 dark:text-slate-300">{account.branchName}</p>
                      <p className="text-xs text-muted-foreground">{account.branchCode}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <span className="font-mono text-sm font-medium">{account.currencyCode}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p className="font-mono text-xs font-medium text-slate-700 dark:text-slate-300">
                        {account.accountingAccountCode}
                      </p>
                      <p className="text-xs text-muted-foreground">{account.accountingAccountName}</p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono text-sm font-semibold">
                      <span className={account.balance < 0 ? 'text-rose-600' : 'text-slate-900 dark:text-slate-100'}>
                        {formatNumber(account.balance, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}
                      </span>{' '}
                      <span className="text-xs font-normal text-muted-foreground">{account.currencyCode}</span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <AccessLevelBadge access={account.currentUserAccess} isManagement={isManagement} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <StatusBadge isActive={account.isActive} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDetailAccount(account)}
                          aria-label={`${t('common:actions.view')} ${account.name}`}
                          title={t('common:actions.view')}
                        >
                          <Eye className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => openEdit(account)}
                          aria-label={`${t('common:actions.edit')} ${account.name}`}
                          title={t('common:actions.edit')}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setAccessAccount(account)}
                          aria-label={`${t('finance:moneyAccountsPage.accessDialog.title', { code: account.code })}`}
                          title={t('finance:moneyAccountsPage.accessDialog.title', { code: account.code })}
                        >
                          <ShieldCheck className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setOpeningAccount(account)}
                          aria-label={`${t('finance:moneyAccountsPage.openingDialog.title', { code: account.code })}`}
                          title={t('finance:moneyAccountsPage.openingDialog.title', { code: account.code })}
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
                                  t('finance:moneyAccountsPage.deleteConfirm', {
                                    code: account.code,
                                    name: account.name,
                                  })
                                )
                              ) {
                                deleteAccount.mutate(account.id, {
                                  onError: (err) => alert(err.message),
                                })
                              }
                            }}
                            aria-label={`${t('common:actions.delete')} ${account.name}`}
                            title={t('common:actions.delete')}
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
  const { t } = useTranslation(['finance', 'common'])
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
          <DialogTitle>
            {account
              ? t('finance:moneyAccountsPage.form.editTitle', { code: account.code })
              : t('finance:moneyAccountsPage.form.newTitle')}
          </DialogTitle>
          <DialogDescription>
            {account
              ? t('finance:moneyAccountsPage.form.editDescription')
              : t('finance:moneyAccountsPage.form.newDescription')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('finance:moneyAccountsPage.form.code')} error={form.formState.errors.code?.message}>
              <Input
                placeholder={t('finance:moneyAccountsPage.form.codePlaceholder')}
                className="font-mono uppercase"
                {...form.register('code')}
                autoFocus
              />
            </Field>
            <Field label={t('finance:moneyAccountsPage.form.name')} error={form.formState.errors.name?.message}>
              <Input placeholder={t('finance:moneyAccountsPage.form.namePlaceholder')} {...form.register('name')} />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('finance:moneyAccountsPage.form.type')} error={form.formState.errors.type?.message}>
              <Select {...form.register('type', { valueAsNumber: true })}>
                <option value="0">{t('finance:moneyAccountsPage.cashbox')}</option>
                <option value="1">{t('finance:moneyAccountsPage.bank')}</option>
              </Select>
            </Field>

            <Field label={t('finance:moneyAccountsPage.form.branch')} error={form.formState.errors.branchId?.message}>
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
            <Field label={t('finance:moneyAccountsPage.form.currency')} error={form.formState.errors.currencyId?.message}>
              <Select {...form.register('currencyId')}>
                <option value="">{t('finance:moneyAccountsPage.form.selectCurrency')}</option>
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
              <Field label={t('finance:moneyAccountsPage.form.glAccount')}>
                <div className="flex h-10 items-center rounded-md border border-slate-200 bg-slate-50 px-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <span className="font-mono text-sm font-medium text-slate-700 dark:text-slate-300">
                    {account.accountingAccountCode}
                  </span>
                  <span className="ms-2 truncate text-xs text-muted-foreground">
                    {account.accountingAccountName}
                  </span>
                </div>
              </Field>
            ) : (
              <Field label={t('finance:moneyAccountsPage.th.linkedGl')}>
                <div className="flex h-10 items-center rounded-md border border-dashed border-slate-300 bg-slate-50/60 px-3 text-xs text-muted-foreground dark:border-slate-700 dark:bg-slate-900/40">
                  {t('finance:moneyAccountsPage.form.glAccountPending')}
                </div>
              </Field>
            )}
          </div>

          {selectedType === 1 && (
            <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {t('finance:moneyAccountsPage.form.bankingDetails')}
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t('finance:moneyAccountsPage.form.bankName')} error={form.formState.errors.bankName?.message}>
                  <Input placeholder={t('finance:moneyAccountsPage.form.bankNamePlaceholder')} {...form.register('bankName')} />
                </Field>
                <Field label={t('finance:moneyAccountsPage.form.accountIban')} error={form.formState.errors.accountNumberOrIban?.message}>
                  <Input placeholder={t('finance:moneyAccountsPage.form.accountIbanPlaceholder')} {...form.register('accountNumberOrIban')} />
                </Field>
              </div>
            </div>
          )}

          <Field label={t('finance:moneyAccountsPage.form.notes')} error={form.formState.errors.notes?.message}>
            <Textarea rows={2} placeholder={t('finance:moneyAccountsPage.form.notesPlaceholder')} {...form.register('notes')} />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 accent-primary"
              {...form.register('isActive')}
            />
            <span>{t('finance:moneyAccountsPage.form.activeForPostings')}</span>
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
                      t('finance:moneyAccountsPage.deleteConfirm', {
                        code: account.code,
                        name: account.name,
                      })
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
                <Trash2 className="me-1.5 size-4" />
                {t('common:actions.delete')}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={closeDialog} disabled={save.isPending}>
                {t('common:actions.cancel')}
              </Button>
              <Button type="submit" disabled={save.isPending}>
                {save.isPending && <Loader2 className="me-1.5 size-4 animate-spin" />}
                {account ? t('common:actions.save') : t('finance:moneyAccountsPage.form.addAccount')}
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
  const { t } = useTranslation(['finance', 'common'])
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
          <DialogTitle>{t('finance:moneyAccountsPage.accessDialog.title', { code: account?.code })}</DialogTitle>
          <DialogDescription>
            {t('finance:moneyAccountsPage.accessDialog.description', { name: account?.name })}
          </DialogDescription>
        </DialogHeader>

        {accessQuery.isPending || usersQuery.isPending ? (
          <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-6 animate-spin text-primary" />
            <span>{t('finance:moneyAccountsPage.accessDialog.loading')}</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-card dark:divide-slate-800 dark:border-slate-800">
              {users.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">{t('finance:moneyAccountsPage.accessDialog.noUsers')}</p>
              ) : (
                users.map((user) => {
                  const existing = assignments.find((item) => item.userId === user.id)
                  return (
                    <div
                      key={user.id}
                      className="flex items-center justify-between gap-3 p-3 text-sm hover:bg-muted/40"
                    >
                      <div className="text-start">
                        <p className="font-medium text-slate-800 dark:text-slate-200">{user.username}</p>
                        <p className="text-xs text-muted-foreground">{user.role}</p>
                      </div>
                      <Select
                        name={user.id}
                        defaultValue={existing ? String(existing.accessLevel) : ''}
                        className="w-36"
                      >
                        <option value="">{t('finance:moneyAccountsPage.accessDialog.noAccess')}</option>
                        <option value={MoneyAccountAccessLevel.View}>{t('finance:moneyAccountsPage.accessDialog.viewOnly')}</option>
                        <option value={MoneyAccountAccessLevel.Operate}>{t('finance:moneyAccountsPage.accessDialog.operate')}</option>
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
                {t('common:actions.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={replaceAccess.isPending}
              >
                {replaceAccess.isPending && <Loader2 className="me-1.5 size-4 animate-spin" />}
                {t('finance:moneyAccountsPage.accessDialog.saveAccess')}
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
  const { t } = useTranslation(['finance', 'common'])
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
          <DialogTitle>{t('finance:moneyAccountsPage.openingDialog.title', { code: account?.code })}</DialogTitle>
          <DialogDescription>
            {t('finance:moneyAccountsPage.openingDialog.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label={t('finance:moneyAccountsPage.openingDialog.movementDate')}>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>

          <Field label={t('finance:moneyAccountsPage.openingDialog.openingAmount', { currency: account?.currencyCode ?? '' })}>
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

          <Field label={t('finance:moneyAccountsPage.openingDialog.exchangeRate')}>
            <Input
              type="number"
              min="0.000001"
              step="0.000001"
              placeholder={t('finance:moneyAccountsPage.openingDialog.exchangeRatePlaceholder')}
              value={exchangeRate}
              onChange={(e) => setExchangeRate(e.target.value)}
            />
          </Field>

          <Field label={t('finance:moneyAccountsPage.openingDialog.notes')}>
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
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={opening.isPending}
            >
              {opening.isPending && <Loader2 className="me-1.5 size-4 animate-spin" />}
              {t('finance:moneyAccountsPage.openingDialog.postOpening')}
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
  const { t } = useTranslation(['finance', 'common'])
  const deleteAccount = useDeleteMoneyAccount()

  return (
    <Dialog open={account !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pe-6">
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
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('finance:moneyAccountsPage.detailDialog.currentBalance')}</p>
              <p className="mt-1 font-mono text-2xl font-bold text-slate-900 dark:text-slate-100">
                {formatNumber(account.balance, { minimumFractionDigits: 0, maximumFractionDigits: 4 })}{' '}
                <span className="text-base font-normal text-muted-foreground">{account.currencyCode}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-start">
              <DetailItem label={t('finance:moneyAccountsPage.detailDialog.branch')} value={`${account.branchName} (${account.branchCode})`} />
              <DetailItem label={t('finance:moneyAccountsPage.detailDialog.currency')} value={account.currencyCode} />
              <DetailItem
                label={t('finance:moneyAccountsPage.detailDialog.linkedGl')}
                value={`${account.accountingAccountCode} — ${account.accountingAccountName}`}
              />
              <DetailItem
                label={t('finance:moneyAccountsPage.detailDialog.status')}
                value={account.isActive ? t('finance:moneyAccountsPage.detailDialog.activeStatus') : t('finance:moneyAccountsPage.detailDialog.inactiveStatus')}
              />
            </div>

            {account.type === MoneyAccountType.Bank && (
              <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="mb-2 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('finance:moneyAccountsPage.detailDialog.bankingDetails')}
                </p>
                <div className="grid grid-cols-2 gap-2 text-start text-xs">
                  <div>
                    <span className="text-muted-foreground">{t('finance:moneyAccountsPage.detailDialog.bankName')}</span>{' '}
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      {account.bankName ?? '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{t('finance:moneyAccountsPage.detailDialog.accountIban')}</span>{' '}
                    <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                      {account.accountNumberOrIban ?? '—'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {account.notes && (
              <div className="text-start">
                <p className="text-xs font-medium text-muted-foreground">{t('finance:moneyAccountsPage.detailDialog.notes')}</p>
                <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{account.notes}</p>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link
                to={`/finance/money-ledger?moneyAccountId=${account.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {t('finance:moneyAccountsPage.detailDialog.viewMovements')}
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                  onClick={() => {
                    if (
                      window.confirm(
                        t('finance:moneyAccountsPage.deleteConfirm', {
                          code: account.code,
                          name: account.name,
                        })
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
                  <Trash2 className="me-1.5 size-3.5" />
                  {t('common:actions.delete')}
                </Button>
                <Button variant="outline" size="sm" onClick={() => onEdit(account)}>
                  <Pencil className="me-1.5 size-3.5" />
                  {t('finance:moneyAccountsPage.detailDialog.editAccount')}
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
    <div className="text-start">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{value}</p>
    </div>
  )
}

function AccountTypeBadge({ type }: { type: MoneyAccountType }) {
  const { t } = useTranslation('finance')
  return type === MoneyAccountType.Bank ? (
    <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
      <Landmark className="size-3" />
      {t('finance:moneyAccountsPage.bank')}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
      <Wallet className="size-3" />
      {t('finance:moneyAccountsPage.cashbox')}
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
  const { t } = useTranslation('finance')
  if (access === MoneyAccountAccessLevel.Operate) {
    return (
      <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        {t('finance:moneyAccountsPage.accessLevels.operate')}
      </span>
    )
  }
  if (access === MoneyAccountAccessLevel.View) {
    return (
      <span className="inline-flex rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
        {t('finance:moneyAccountsPage.accessLevels.view')}
      </span>
    )
  }
  if (isManagement) {
    return (
      <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
        {t('finance:moneyAccountsPage.accessLevels.management')}
      </span>
    )
  }
  return <span className="text-xs text-muted-foreground">—</span>
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  const { t } = useTranslation('finance')
  return (
    <span
      className={
        isActive
          ? 'inline-flex rounded bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'inline-flex rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400'
      }
    >
      {isActive ? t('finance:moneyAccountsPage.active') : t('finance:moneyAccountsPage.inactive')}
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
    <div className="grid gap-1.5 text-start text-sm font-medium text-slate-700 dark:text-slate-300">
      <label className="text-start text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
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
const today = () => new Date().toISOString().slice(0, 10)
const head =
  'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
