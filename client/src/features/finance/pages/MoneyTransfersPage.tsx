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
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Money Transfers
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Same-currency, same-branch movements. Posting creates dual Money Ledger entries and a
            balanced Accounting journal.
          </p>
        </div>
        <Button
          className="gap-1.5 bg-[#e05d38] text-white hover:bg-[#c94f2d]"
          onClick={openCreate}
        >
          <FilePlus2 className="size-4" />
          New Money Transfer
        </Button>
      </div>

      {/* Filter Card */}
      <div className="grid gap-3 rounded-lg border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 md:grid-cols-3 lg:grid-cols-6">
        <Input
          aria-label="Search Money Transfers"
          placeholder="Search document or notes"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            resetPage()
          }}
        />
        <Select
          aria-label="Money Account filter"
          value={moneyAccountId}
          onChange={(event) => {
            setMoneyAccountId(event.target.value)
            resetPage()
          }}
        >
          <option value="">All Money Accounts</option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} — {account.name}
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
          {currencies.map((currency) => (
            <option key={currency.id} value={currency.id}>
              {currency.code}
            </option>
          ))}
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
          <option value="0">Draft</option>
          <option value="1">Posted</option>
        </Select>
        <Input
          aria-label="From date"
          type="date"
          value={fromDate}
          onChange={(event) => {
            setFromDate(event.target.value)
            resetPage()
          }}
        />
        <Input
          aria-label="To date"
          type="date"
          value={toDate}
          onChange={(event) => {
            setToDate(event.target.value)
            resetPage()
          }}
        />
      </div>

      {/* Table Shell */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className={head}>
                <TableHead className="px-4">Document</TableHead>
                <TableHead className="px-4">Date</TableHead>
                <TableHead className="px-4">From Account</TableHead>
                <TableHead className="px-4">To Account</TableHead>
                <TableHead className="px-4">Currency</TableHead>
                <TableHead className="px-4 text-right">Amount</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Created by</TableHead>
                <TableHead className="w-32 px-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <MessageRow label="Loading Money Transfers…" />
              ) : query.isError ? (
                <MessageRow label={query.error.message} error />
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <p>No Money Transfers found.</p>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-[#e05d38] text-white hover:bg-[#c94f2d]"
                        onClick={openCreate}
                      >
                        <FilePlus2 className="size-4" /> Create Money Transfer
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
                    <TableCell className="px-4 py-3.5">
                      <button
                        type="button"
                        onClick={() => setDetailTransfer(transfer)}
                        className="text-left font-mono font-semibold text-[#d85430] hover:underline"
                      >
                        {transfer.documentNumber}
                      </button>
                      {transfer.notes && (
                        <p className="max-w-xs truncate text-xs text-muted-foreground">
                          {transfer.notes}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm">{transfer.transferDate}</TableCell>
                    <TableCell className="px-4 py-3.5">
                      <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {transfer.sourceMoneyAccountCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transfer.sourceMoneyAccountName}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <p className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {transfer.destinationMoneyAccountCode}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {transfer.destinationMoneyAccountName}
                      </p>
                    </TableCell>
                    <TableCell className="px-4 py-3.5 font-mono text-sm">
                      {transfer.currencyCode}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right font-mono text-sm font-semibold">
                      <span>{formatAmount(transfer.amount)}</span>{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        {transfer.currencyCode}
                      </span>
                    </TableCell>
                    <TableCell className="px-4 py-3.5">
                      <TransferStatusBadge status={transfer.status} />
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-sm">
                      {transfer.createdByUsername}
                    </TableCell>
                    <TableCell className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          title="View transfer details"
                          aria-label={`View transfer ${transfer.documentNumber}`}
                          onClick={() => setDetailTransfer(transfer)}
                        >
                          <Eye className="size-4" />
                        </Button>

                        {transfer.status === FinanceDocumentStatus.Draft && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Edit draft"
                              aria-label={`Edit draft ${transfer.documentNumber}`}
                              onClick={() => openEdit(transfer)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Post transfer"
                              aria-label={`Post transfer ${transfer.documentNumber}`}
                              className="text-[#e05d38] hover:bg-[#e05d38]/10 hover:text-[#c94f2d]"
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
                              <Send className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              title="Delete draft"
                              aria-label={`Delete draft ${transfer.documentNumber}`}
                              className="text-destructive hover:bg-destructive/10"
                              disabled={actions.remove.isPending}
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete Draft Money Transfer ${transfer.documentNumber}?`
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

      {/* Pagination */}
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

      {/* Create / Edit Form Modal */}
      <MoneyTransferFormDialog
        key={editingTransfer?.id ?? (isFormOpen ? 'open-new' : 'closed')}
        open={isFormOpen}
        transfer={editingTransfer}
        onOpenChange={(open) => {
          setIsFormOpen(open)
          if (!open) setEditingTransfer(null)
        }}
      />

      {/* Detail View Modal */}
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
            {transfer ? `Edit Draft ${transfer.documentNumber}` : 'New Money Transfer'}
          </DialogTitle>
          <DialogDescription>
            Transfer funds between two Money Accounts in the same branch and currency.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Transfer date" error={form.formState.errors.transferDate?.message}>
              <Input type="date" {...form.register('transferDate')} autoFocus />
            </Field>

            <Field
              label="Source Money Account"
              error={form.formState.errors.sourceMoneyAccountId?.message}
            >
              <Select
                {...form.register('sourceMoneyAccountId', {
                  onChange: () =>
                    form.setValue('destinationMoneyAccountId', '', { shouldDirty: true }),
                })}
              >
                <option value="">Select source account</option>
                {accounts.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name} ({formatAmount(item.balance)} {item.currencyCode})
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Destination Money Account"
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
                      : 'Select destination account'
                    : 'Select source account first'}
                </option>
                {matchingDestinations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} — {item.name} ({formatAmount(item.balance)} {item.currencyCode})
                  </option>
                ))}
              </Select>
            </Field>

            <Field
              label={`Transfer amount ${currencyCode ? `(${currencyCode})` : ''}`}
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

          {/* Real-time Balance Flow Preview Card */}
          {(sourceAccount || destinationAccount) && (
            <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Balance Impact Preview
              </p>
              <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                {/* Source Account box */}
                <div className="rounded-md border bg-card p-2.5 text-xs">
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {sourceAccount?.code ?? 'Source'}
                  </p>
                  <p className="text-muted-foreground truncate">{sourceAccount?.name ?? '—'}</p>
                  <div className="mt-1.5 flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="font-mono font-medium">
                      {formatAmount(sourceAccount?.balance ?? 0)} {currencyCode}
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
                        {formatAmount(sourceAccount.balance - transferAmount)} {currencyCode}
                      </span>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="flex size-7 items-center justify-center rounded-full bg-[#e05d38]/10 text-[#e05d38]">
                    <ArrowRight className="size-4" />
                  </div>
                  <p className="mt-0.5 font-mono text-xs font-bold text-[#d85430]">
                    {transferAmount > 0 ? formatAmount(transferAmount) : '—'}
                  </p>
                </div>

                {/* Destination Account box */}
                <div className="rounded-md border bg-card p-2.5 text-xs">
                  <p className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                    {destinationAccount?.code ?? 'Destination'}
                  </p>
                  <p className="text-muted-foreground truncate">{destinationAccount?.name ?? '—'}</p>
                  <div className="mt-1.5 flex justify-between border-t pt-1">
                    <span className="text-muted-foreground">Current:</span>
                    <span className="font-mono font-medium">
                      {formatAmount(destinationAccount?.balance ?? 0)} {currencyCode}
                    </span>
                  </div>
                  {transferAmount > 0 && destinationAccount && (
                    <div className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">After:</span>
                      <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                        {formatAmount(destinationAccount.balance + transferAmount)} {currencyCode}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <Field label="Notes (optional)" error={form.formState.errors.notes?.message}>
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
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#e05d38] text-white hover:bg-[#c94f2d]"
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
              {transfer ? 'Save changes' : 'Save draft'}
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
    if (window.confirm(`Delete Draft Money Transfer ${transfer.documentNumber}?`)) {
      actions.remove.mutate(transfer.id, {
        onSuccess: () => onOpenChange(false),
      })
    }
  }

  return (
    <Dialog open={transfer !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2 pr-6">
            <DialogTitle className="flex items-center gap-2 font-mono text-lg text-slate-900 dark:text-slate-100">
              {transfer.documentNumber}
            </DialogTitle>
            <TransferStatusBadge status={transfer.status} />
          </div>
          <DialogDescription>
            {posted
              ? `Posted on ${transfer.transferDate} · immutable financial movement`
              : `Draft created on ${transfer.transferDate} · no ledger or accounting effect`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* Transfer Visual Box */}
          <div className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              {/* From */}
              <div className="space-y-0.5">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">From Account</p>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100">
                  {transfer.sourceMoneyAccountCode}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {transfer.sourceMoneyAccountName}
                </p>
              </div>

              {/* Arrow + Amount */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-[#e05d38]/10 text-[#e05d38]">
                  <ArrowRight className="size-4" />
                </div>
                <p className="mt-1 font-mono text-sm font-bold text-[#d85430]">
                  {formatAmount(transfer.amount)} {transfer.currencyCode}
                </p>
              </div>

              {/* To */}
              <div className="space-y-0.5 text-right">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">To Account</p>
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
                  Base amount: {formatAmount(transfer.baseAmount)} {transfer.baseCurrencyCode}
                </span>
              </div>
            )}
          </div>

          {/* Notes if present */}
          {transfer.notes && (
            <div className="rounded-md border border-slate-100 bg-card p-3 dark:border-slate-800">
              <p className="text-xs font-semibold text-muted-foreground">Notes</p>
              <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">{transfer.notes}</p>
            </div>
          )}

          {/* Quick links for Posted transfer */}
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

          {/* Audit stamps */}
          <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-muted-foreground dark:border-slate-800">
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Created by:</span>{' '}
              {transfer.createdByUsername}
            </div>
            <div>
              <span className="font-medium text-slate-700 dark:text-slate-300">Created on:</span>{' '}
              {formatTimestamp(transfer.createdAtUtc)}
            </div>
            {transfer.postedAtUtc && (
              <div className="col-span-2">
                <span className="font-medium text-slate-700 dark:text-slate-300">Posted on:</span>{' '}
                {formatTimestamp(transfer.postedAtUtc)}
              </div>
            )}
          </div>
        </div>

        {/* Footer with actions */}
        <DialogFooter className="gap-2 sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
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
                <Trash2 className="mr-1.5 size-3.5" />
                Delete
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(transfer)}
              >
                <Pencil className="mr-1.5 size-3.5" />
                Edit
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-[#e05d38] text-white hover:bg-[#c94f2d]"
                disabled={actions.post.isPending}
                onClick={handlePost}
              >
                {actions.post.isPending ? (
                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                ) : (
                  <Send className="mr-1.5 size-3.5" />
                )}
                Post Transfer
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TransferStatusBadge({ status }: { status: FinanceDocumentStatus }) {
  const posted = status === FinanceDocumentStatus.Posted
  return (
    <span
      className={
        posted
          ? 'inline-flex rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'inline-flex rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
      }
    >
      {posted ? 'Posted' : 'Draft'}
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
        'h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-[#e05d38] focus:ring-1 focus:ring-[#e05d38] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900',
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

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
const formatTimestamp = (value: string) => new Date(value).toLocaleString()
const head =
  'border-b border-slate-200 bg-[#e9ecef]/60 text-xs uppercase tracking-wider hover:bg-[#e9ecef]/60 dark:border-slate-800 dark:bg-slate-800/60'
