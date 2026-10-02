import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  Eye,
  FilePlus2,
  Landmark,
  Loader2,
  Pencil,
  Send,
  Trash2,
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
import { formatDate, formatDateTime, formatNumber } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useCurrencies, useCurrentBusiness } from '@/features/business'
import {
  useMoneyAccounts,
  useMoneyTransfers,
  useTransferActions,
} from '../hooks/useFinance'
import { moneyTransferSchema } from '../schemas/finance.schema'
import {
  FinanceDocumentStatus,
  MoneyAccountAccessLevel,
  type MoneyTransfer,
  type MoneyTransferInput,
} from '../types/finance.types'

type FormValue = Omit<MoneyTransferInput, 'notes'> & { notes: string }

const today = () => new Date().toISOString().slice(0, 10)

const emptyForm: FormValue = {
  transferDate: today(),
  sourceMoneyAccountId: '',
  destinationMoneyAccountId: '',
  amount: 0,
  notes: '',
}

export function MoneyTransfersPage() {
  const { t } = useTranslation(['finance', 'common'])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [moneyAccountId, setMoneyAccountId] = useState('')
  const [currencyId, setCurrencyId] = useState('')
  const [status, setStatus] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<MoneyTransfer | null>(null)
  const [detailTransfer, setDetailTransfer] = useState<MoneyTransfer | null>(null)

  const currencies = useCurrencies().data?.data ?? []
  const accounts = useMoneyAccounts({ page: 1, pageSize: 100 }).data?.data ?? []
  const actions = useTransferActions()

  const query = useMoneyTransfers({
    page,
    pageSize,
    search: search.trim() || undefined,
    moneyAccountId: moneyAccountId || undefined,
    currencyId: currencyId || undefined,
    status: status !== '' ? (Number(status) as FinanceDocumentStatus) : undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
  })

  const resetPage = () => setPage(1)
  const rows = query.data?.data ?? []

  const openCreate = () => {
    setEditingTransfer(null)
    setIsFormOpen(true)
  }

  const openEdit = (transfer: MoneyTransfer) => {
    setDetailTransfer(null)
    setEditingTransfer(transfer)
    setIsFormOpen(true)
  }

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('finance:transfersPage.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('finance:transfersPage.description')}
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={openCreate}
        >
          <FilePlus2 className="size-4" />
          {t('finance:transfersPage.newTransfer')}
        </Button>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 md:grid-cols-3 lg:grid-cols-6">
        <Input
          aria-label={t('finance:transfersPage.searchPlaceholder')}
          placeholder={t('finance:transfersPage.searchPlaceholder')}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetPage()
          }}
        />
        <Select
          aria-label={t('finance:transfersPage.allAccounts')}
          value={moneyAccountId}
          onChange={(event) => {
            setMoneyAccountId(event.target.value)
            resetPage()
          }}
        >
          <option value="">{t('finance:transfersPage.allAccounts')}</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} — {account.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('finance:transfersPage.allCurrencies')}
          value={currencyId}
          onChange={(event) => {
            setCurrencyId(event.target.value)
            resetPage()
          }}
        >
          <option value="">{t('finance:transfersPage.allCurrencies')}</option>
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code}
            </option>
          ))}
        </Select>
        <Select
          aria-label={t('finance:transfersPage.allStatuses')}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            resetPage()
          }}
        >
          <option value="">{t('finance:transfersPage.allStatuses')}</option>
          <option value="0">{t('finance:transfersPage.draft')}</option>
          <option value="1">{t('finance:transfersPage.posted')}</option>
        </Select>
        <Input
          aria-label={t('finance:transfersPage.fromDate')}
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.target.value)
            resetPage()
          }}
        />
        <Input
          aria-label={t('finance:transfersPage.toDate')}
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.target.value)
            resetPage()
          }}
        />
      </div>

      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead className="px-4 text-start">{t('finance:transfersPage.th.document')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:transfersPage.th.date')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:transfersPage.th.sourceAccount')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:transfersPage.th.destinationAccount')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:moneyAccountsPage.th.currency')}</TableHead>
                <TableHead className="px-4 text-end">{t('finance:transfersPage.th.amount')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:transfersPage.th.status')}</TableHead>
                <TableHead className="px-4 text-start">{t('finance:exchangeRatesPage.th.createdBy')}</TableHead>
                <TableHead className="w-32 px-4 text-end">{t('finance:transfersPage.th.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <MessageRow label={t('finance:transfersPage.loading')} />
              ) : query.isError ? (
                <MessageRow label={query.error.message} error />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p>{t('finance:transfersPage.empty')}</p>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={openCreate}
                      >
                        <FilePlus2 className="size-4" /> {t('finance:transfersPage.newTransfer')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((transfer) => (
                  <TableRow
                    key={transfer.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30"
                  >
                    <TableCell className="px-4 py-3.5 text-start">
                      <button
                        type="button"
                        onClick={() => setDetailTransfer(transfer)}
                        className="text-start font-mono font-semibold text-primary hover:underline"
                      >
                        {transfer.documentNumber}
                      </button>
                      {transfer.notes && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {transfer.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start text-sm">{formatDate(transfer.transferDate)}</TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {transfer.sourceMoneyAccountCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transfer.sourceMoneyAccountName}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {transfer.destinationMoneyAccountCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transfer.destinationMoneyAccountName}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start font-mono text-sm">
                      {transfer.currencyCode}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end font-mono text-sm font-semibold">
                      <span>{formatNumber(transfer.amount, { maximumFractionDigits: 4 })}</span>{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        {transfer.currencyCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start">
                      <TransferStatusBadge status={transfer.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-start text-sm">
                      {transfer.createdByUsername}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-end">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title={t('common:actions.view')}
                          aria-label={`${t('common:actions.view')} ${transfer.documentNumber}`}
                          onClick={() => setDetailTransfer(transfer)}
                        >
                          <Eye className="size-4" />
                        </Button>

                        {transfer.status === FinanceDocumentStatus.Draft && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={t('common:actions.edit')}
                              aria-label={`${t('common:actions.edit')} ${transfer.documentNumber}`}
                              onClick={() => openEdit(transfer)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={t('finance:transfersPage.form.postTransfer')}
                              aria-label={`${t('finance:transfersPage.form.postTransfer')} ${transfer.documentNumber}`}
                              className="text-primary hover:bg-primary/10 hover:text-primary"
                              disabled={actions.post.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Post Money Transfer ${transfer.documentNumber}? Posting creates permanent Money Ledger and Accounting journal entries.`
                                  )
                                ) {
                                  actions.post.mutate(transfer.id)
                                }
                              }}
                            >
                              <Send className="size-4 rtl:rotate-180" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title={t('common:actions.delete')}
                              aria-label={`${t('common:actions.delete')} ${transfer.documentNumber}`}
                              className="text-destructive hover:bg-destructive/10"
                              disabled={actions.remove.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    t('finance:transfersPage.deleteConfirm')
                                  )
                                ) {
                                  actions.remove.mutate(transfer.id)
                                }
                              }}
                            >
                              <Trash2 className="size-4" />
                            </Button>
                          </>
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

      <MoneyTransferFormDialog
        key={editingTransfer?.id ?? (isFormOpen ? 'open-new' : 'closed')}
        open={isFormOpen}
        transfer={editingTransfer}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingTransfer(null)
        }}
      />

      <MoneyTransferDetailDialog
        key={detailTransfer?.id}
        transfer={detailTransfer}
        onOpenChange={(open) => {
          if (!open) setDetailTransfer(null)
        }}
        onEdit={(item) => {
          openEdit(item)
        }}
      />
    </div>
  )
}

function MoneyTransferFormDialog({
  open,
  transfer,
  onOpenChange,
}: {
  open: boolean
  transfer: MoneyTransfer | null
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation(['finance', 'common'])
  const actions = useTransferActions()
  const accountsQuery = useMoneyAccounts({ page: 1, pageSize: 100, isActive: true })

  const accounts = (accountsQuery.data?.data ?? []).filter(
    (account) => account.currentUserAccess === MoneyAccountAccessLevel.Operate
  )

  const form = useForm<FormValue>({
    resolver: zodResolver(moneyTransferSchema),
    defaultValues: transfer
      ? {
          transferDate: transfer.transferDate,
          sourceMoneyAccountId: transfer.sourceMoneyAccountId,
          destinationMoneyAccountId: transfer.destinationMoneyAccountId,
          amount: transfer.amount,
          notes: transfer.notes ?? '',
        }
      : emptyForm,
  })

  const closeDialog = () => {
    form.reset(emptyForm)
    onOpenChange(false)
  }

  const values = useWatch({ control: form.control })

  const sourceAccount = accounts.find((item) => item.id === values.sourceMoneyAccountId)

  const matchingDestinations = accounts.filter(
    (item) =>
      item.id !== sourceAccount?.id &&
      item.currencyId === sourceAccount?.currencyId &&
      (!sourceAccount?.branchId || item.branchId === sourceAccount.branchId)
  )

  const destinationAccount = accounts.find(
    (item) => item.id === values.destinationMoneyAccountId
  )

  const currencyCode = sourceAccount?.currencyCode ?? ''
  const transferAmount = Number(values.amount) || 0

  const submit = form.handleSubmit((value) => {
    const body: MoneyTransferInput = {
      transferDate: value.transferDate,
      sourceMoneyAccountId: value.sourceMoneyAccountId,
      destinationMoneyAccountId: value.destinationMoneyAccountId,
      amount: value.amount,
      notes: value.notes.trim() || null,
    }

    if (transfer) {
      actions.update.mutate(
        { id: transfer.id, body },
        {
          onSuccess: closeDialog,
        }
      )
    } else {
      actions.create.mutate(body, {
        onSuccess: closeDialog,
      })
    }
  })

  const isPending = actions.create.isPending || actions.update.isPending
  const error = actions.create.error ?? actions.update.error

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : closeDialog())}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {transfer ? t('finance:transfersPage.form.editTitle') : t('finance:transfersPage.form.newTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('finance:transfersPage.form.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('finance:transfersPage.form.date')} error={form.formState.errors.transferDate?.message}>
              <Input type="date" {...form.register('transferDate')} autoFocus />
            </Field>

            <Field
              label={t('finance:transfersPage.form.sourceAccount')}
              error={form.formState.errors.sourceMoneyAccountId?.message}
            >
              <Select
                {...form.register('sourceMoneyAccountId', {
                  onChange: () =>
                    form.setValue('destinationMoneyAccountId', '', { shouldDirty: true }),
                })}
              >
                <option value="">{t('finance:transfersPage.form.selectSource')}</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name} ({formatNumber(item.balance, { maximumFractionDigits: 4 })} {item.currencyCode})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label={t('finance:transfersPage.form.destinationAccount')}
              error={form.formState.errors.destinationMoneyAccountId?.message}
            >
              <Select
                {...form.register('destinationMoneyAccountId')}
                disabled={!sourceAccount}
              >
                <option value="">
                  {sourceAccount
                    ? matchingDestinations.length === 0
                      ? 'No other matching account in this branch/currency'
                      : t('finance:transfersPage.form.selectDestination')
                    : 'Select source account first'}
                </option>
                {matchingDestinations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name} ({formatNumber(item.balance, { maximumFractionDigits: 4 })} {item.currencyCode})
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={`${t('finance:transfersPage.form.amount')} ${currencyCode ? `(${currencyCode})` : ''}`}
              error={form.formState.errors.amount?.message}
            >
              <Input
                type="number"
                min="0.0001"
                step="0.0001"
                placeholder="0.00"
                {...form.register('amount', { valueAsNumber: true })}
              />
            </Field>
          </div>

          {(sourceAccount || destinationAccount) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="mb-2 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Balance Impact Preview
              </p>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-md border bg-card p-2.5 text-xs text-start">
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {sourceAccount?.code ?? 'Source'}
                  </p>
                  <p className="text-muted-foreground truncate">{sourceAccount?.name ?? '—'}</p>
                  <div className="mt-1.5 flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-mono font-medium">
                      {formatNumber(sourceAccount?.balance ?? 0, { maximumFractionDigits: 4 })} {currencyCode}
                    </span>
                  </div>
                  {transferAmount > 0 && sourceAccount && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">After:</span>
                      <span
                        className={`font-mono font-semibold ${
                          sourceAccount.balance - transferAmount < 0
                            ? 'text-rose-600'
                            : 'text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {formatNumber(sourceAccount.balance - transferAmount, { maximumFractionDigits: 4 })} {currencyCode}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ArrowRight className="size-4 rtl:rotate-180" />
                  </div>
                  <p className="mt-0.5 font-mono text-xs font-bold text-primary">
                    {transferAmount > 0 ? formatNumber(transferAmount, { maximumFractionDigits: 4 }) : '—'}
                  </p>
                </div>

                <div className="rounded-md border bg-card p-2.5 text-xs text-start">
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {destinationAccount?.code ?? 'Destination'}
                  </p>
                  <p className="text-muted-foreground truncate">{destinationAccount?.name ?? '—'}</p>
                  <div className="mt-1.5 flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-mono font-medium">
                      {formatNumber(destinationAccount?.balance ?? 0, { maximumFractionDigits: 4 })} {currencyCode}
                    </span>
                  </div>
                  {transferAmount > 0 && destinationAccount && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">After:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatNumber(destinationAccount.balance + transferAmount, { maximumFractionDigits: 4 })} {currencyCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Field label={t('finance:transfersPage.form.notes')} error={form.formState.errors.notes?.message}>
            <Textarea
              rows={2}
              placeholder="Reason or operational note"
              {...form.register('notes')}
            />
          </Field>

          {error && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="size-4 shrink-0" />
              <span>{error.message}</span>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={closeDialog} disabled={isPending}>
              {t('common:actions.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
            >
              {isPending && <Loader2 className="me-1.5 size-4 animate-spin" />}
              {transfer ? t('common:actions.save') : t('finance:transfersPage.form.saveDraft')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MoneyTransferDetailDialog({
  transfer,
  onOpenChange,
  onEdit,
}: {
  transfer: MoneyTransfer | null
  onOpenChange: (open: boolean) => void
  onEdit: (transfer: MoneyTransfer) => void
}) {
  const { t } = useTranslation(['finance', 'common'])
  const actions = useTransferActions()
  const business = useCurrentBusiness().data

  if (!transfer) return null

  const posted = transfer.status === FinanceDocumentStatus.Posted
  const isForeign = Boolean(
    transfer.currencyId &&
      business?.baseCurrencyId &&
      transfer.currencyId !== business.baseCurrencyId
  )

  const handlePost = () => {
    if (
      window.confirm(
        `Post Money Transfer ${transfer.documentNumber}? Two Money Ledger entries and one balanced journal will be permanently posted.`
      )
    ) {
      actions.post.mutate(transfer.id, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  const handleDelete = () => {
    if (window.confirm(t('finance:transfersPage.deleteConfirm'))) {
      actions.remove.mutate(transfer.id, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  return (
    <Dialog open={transfer !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pe-6">
            <DialogTitle className="flex items-center gap-2 font-mono text-lg text-slate-900 dark:text-slate-100">
              {transfer.documentNumber}
            </DialogTitle>
            <TransferStatusBadge status={transfer.status} />
          </div>
          <DialogDescription>
            {posted
              ? `Posted on ${formatDate(transfer.transferDate)} · immutable financial movement`
              : `Draft created on ${formatDate(transfer.transferDate)} · no ledger or accounting effect`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div className="space-y-0.5 text-start">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('finance:transfersPage.th.sourceAccount')}</p>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {transfer.sourceMoneyAccountCode}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {transfer.sourceMoneyAccountName}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ArrowRight className="size-4 rtl:rotate-180" />
                </div>
                <p className="mt-1 font-mono text-sm font-bold text-primary">
                  {formatNumber(transfer.amount, { maximumFractionDigits: 4 })} {transfer.currencyCode}
                </p>
              </div>

              <div className="space-y-0.5 text-end">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{t('finance:transfersPage.th.destinationAccount')}</p>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {transfer.destinationMoneyAccountCode}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {transfer.destinationMoneyAccountName}
                </p>
              </div>
            </div>

            {isForeign && (
              <div className="mt-3 flex items-center justify-between border-t border-slate-200/80 pt-2 text-xs text-muted-foreground dark:border-slate-800">
                <span>
                  Rate: 1 {transfer.currencyCode} = {transfer.exchangeRate} {transfer.baseCurrencyCode}
                </span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  Base amount: {formatNumber(transfer.baseAmount, { maximumFractionDigits: 4 })} {transfer.baseCurrencyCode}
                </span>
              </div>
            )}
          </div>

          {transfer.notes && (
            <div className="rounded-md border border-slate-100 bg-card p-3 text-start dark:border-slate-800">
              <p className="text-xs font-semibold text-muted-foreground">{t('finance:transfersPage.form.notes')}</p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{transfer.notes}</p>
            </div>
          )}

          {posted && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Link
                to={`/finance/money-ledger?documentNumber=${encodeURIComponent(transfer.documentNumber)}`}
              >
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Landmark className="size-3.5" />
                  View in Money Ledger
                </Button>
              </Link>
              {transfer.journalEntryId && (
                <Link
                  to={`/accounting/journal?search=${encodeURIComponent(transfer.documentNumber)}`}
                >
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                    <BookOpen className="size-3.5" />
                    View Accounting Journal
                  </Button>
                </Link>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-muted-foreground dark:border-slate-800 text-start">
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">{t('finance:exchangeRatesPage.th.createdBy')}:</span>{' '}
              {transfer.createdByUsername}
            </div>
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Created on:</span>{' '}
              {formatDateTime(transfer.createdAtUtc)}
            </div>
            {transfer.postedAtUtc && (
              <div className="col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Posted on:</span>{' '}
                {formatDateTime(transfer.postedAtUtc)}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common:actions.close')}
          </Button>

          {!posted && (
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={actions.remove.isPending}
                onClick={handleDelete}
              >
                <Trash2 className="me-1.5 size-3.5" />
                {t('common:actions.delete')}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(transfer)}
              >
                <Pencil className="me-1.5 size-3.5" />
                {t('common:actions.edit')}
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={actions.post.isPending}
                onClick={handlePost}
              >
                {actions.post.isPending ? (
                  <Loader2 className="me-1.5 size-3.5 animate-spin" />
                ) : (
                  <Send className="me-1.5 size-3.5 rtl:rotate-180" />
                )}
                {t('finance:transfersPage.form.postTransfer')}
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TransferStatusBadge({ status }: { status: FinanceDocumentStatus }) {
  const { t } = useTranslation('finance')
  const posted = status === FinanceDocumentStatus.Posted
  return (
    <span
      className={
        posted
          ? 'inline-flex rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'inline-flex rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      }
    >
      {posted ? t('finance:transfersPage.posted') : t('finance:transfersPage.draft')}
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

const head =
  'border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60'
