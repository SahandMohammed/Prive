import { getSelectedBranchId } from '@/features/business'
import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle2,
  FilePlus2,
  Plus,
  Save,
  Trash2,
  BookOpen,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBranches, useCurrentBusiness } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useMoneyAccounts } from '@/features/finance'
import {
  useExpense,
  useExpenseCategoryOptions,
  useSaveExpense,
  usePostExpense,
  useDeleteExpense,
} from '../hooks/useExpenses'
import { expenseDraftSchema } from '../schemas/expenses.schemas'
import { ExpenseDocumentStatus, type ExpenseDraftInput } from '../types/expenses.types'
import { StatusBadge } from './ExpensesPage'

export function ExpenseDetailPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = !id || id === 'new'
  const navigate = useNavigate()

  const expenseQuery = useExpense(isNew ? undefined : id)
  const expense = expenseQuery.data
  const isPosted = expense?.status === ExpenseDocumentStatus.Posted

  const business = useCurrentBusiness().data
  const branches = useBranches().data?.data ?? []
  const allMoneyAccounts =
    useMoneyAccounts({ page: 1, pageSize: 100, isActive: true }).data?.data ?? []
  const categories = useExpenseCategoryOptions().data ?? []
  const contacts = useContacts({ page: 1, pageSize: 100, isActive: true }).data?.data ?? []

  const saveExpense = useSaveExpense(isNew ? undefined : id)
  const postExpense = usePostExpense()
  const deleteExpense = useDeleteExpense()

  const form = useForm<ExpenseDraftInput>({
    resolver: zodResolver(expenseDraftSchema),
    defaultValues: {
      branchId: getSelectedBranchId(),
      expenseDate: new Date().toISOString().slice(0, 10),
      moneyAccountId: '',
      exchangeRate: null,
      contactId: null,
      payeeName: '',
      reference: '',
      notes: '',
      lines: [{ expenseCategoryId: '', description: '', amount: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lines',
  })

  // Watch form values for dynamic calculations
  const watchedBranchId = useWatch({ control: form.control, name: 'branchId' })
  const watchedMoneyAccountId = useWatch({ control: form.control, name: 'moneyAccountId' })
  const watchedLines = useWatch({ control: form.control, name: 'lines' }) || []
  const watchedExchangeRate = useWatch({ control: form.control, name: 'exchangeRate' })

  // Find selected money account & currency
  const selectedMoneyAccount = allMoneyAccounts.find((a) => a.id === watchedMoneyAccountId)
  const isForeign =
    Boolean(selectedMoneyAccount && business && selectedMoneyAccount.currencyId !== business.baseCurrencyId)

  // Filter money accounts by selected branch and Operate permission (currentUserAccess === 1 or admin)
  const availableAccounts = watchedBranchId
    ? allMoneyAccounts.filter(
        (a) =>
          a.branchId === watchedBranchId &&
          (a.currentUserAccess === 1 || a.currentUserAccess === undefined)
      )
    : []

  // Initialize form with existing expense
  useEffect(() => {
    if (expense && !isNew) {
      form.reset({
        branchId: expense.branchId,
        expenseDate: expense.expenseDate,
        moneyAccountId: expense.moneyAccountId,
        exchangeRate: expense.exchangeRate,
        contactId: expense.contactId || null,
        payeeName: expense.payeeName || '',
        reference: expense.reference || '',
        notes: expense.notes || '',
        lines: expense.lines.map((l) => ({
          expenseCategoryId: l.expenseCategoryId,
          description: l.description || '',
          amount: l.amount,
        })),
      })
    }
  }, [expense, isNew, form])

  // Compute live totals
  const totalAmount = watchedLines.reduce(
    (sum, line) => sum + (Number(line?.amount) || 0),
    0
  )
  const rate = Number(watchedExchangeRate) || 1
  const baseTotalAmount = isForeign ? totalAmount * rate : totalAmount

  const onSubmit = form.handleSubmit((data) => {
    const payload: ExpenseDraftInput = {
      ...data,
      contactId: data.contactId || null,
      payeeName: data.payeeName?.trim() || null,
      reference: data.reference?.trim() || null,
      notes: data.notes?.trim() || null,
      exchangeRate: isForeign ? (Number(data.exchangeRate) || 1) : 1,
      lines: data.lines.map((l) => ({
        expenseCategoryId: l.expenseCategoryId,
        description: l.description?.trim() || null,
        amount: Number(l.amount) || 0,
      })),
    }

    saveExpense.mutate(payload, {
      onSuccess: (saved) => {
        if (isNew) {
          navigate(`/expenses/${saved.id}`, { replace: true })
        }
      },
    })
  })

  const handlePost = () => {
    if (!id || isNew) return
    if (
      window.confirm(
        `Post this expense document? Posting is final and will atomically record the Money Ledger outflow and Accounting Journal entry.`
      )
    ) {
      postExpense.mutate(id)
    }
  }

  const handleDelete = () => {
    if (!id || isNew) return
    if (window.confirm(`Are you sure you want to delete this draft expense?`)) {
      deleteExpense.mutate(id, {
        onSuccess: () => navigate('/expenses'),
      })
    }
  }

  if (!isNew && expenseQuery.isPending) {
    return (
      <div className="flex h-40 items-center justify-center text-muted-foreground">
        Loading expense details…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link to="/expenses">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {isNew ? 'New Expense Draft' : expense?.documentNumber}
              </h1>
              {!isNew && expense && <StatusBadge status={expense.status} />}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isNew
                ? 'Create a direct-paid operating expense draft.'
                : `Created by ${expense?.createdByUsername} on ${expense?.createdAtUtc.slice(0, 10)}`}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {!isPosted && (
            <>
              <Button
                variant="outline"
                onClick={onSubmit}
                disabled={saveExpense.isPending}
              >
                <Save className="size-4 mr-1.5" />
                {saveExpense.isPending ? 'Saving…' : 'Save Draft'}
              </Button>

              {!isNew && (
                <>
                  <Button
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handlePost}
                    disabled={postExpense.isPending}
                  >
                    <CheckCircle2 className="size-4 mr-1.5" />
                    {postExpense.isPending ? 'Posting…' : 'Post Expense'}
                  </Button>

                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={handleDelete}
                    disabled={deleteExpense.isPending}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </>
              )}
            </>
          )}

          {isPosted && (
            <Link to="/expenses/new">
              <Button className="bg-primarytext-primary-foregroundhover:bg-primary/90">
                <FilePlus2 className="size-4 mr-1.5" />
                New Expense
              </Button>
            </Link>
          )}
        </div>
      </div>

      {(saveExpense.error || postExpense.error || deleteExpense.error) && (
        <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive font-medium">
          {(saveExpense.error || postExpense.error || deleteExpense.error)?.message}
        </div>
      )}

      {/* Main Document Details Card */}
      <form onSubmit={onSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {/* Branch */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Branch <span className="text-destructive">*</span>
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">{expense?.branchName}</p>
                ) : (
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    {...form.register('branchId', {
                      onChange: () => form.setValue('moneyAccountId', ''),
                    })}
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.code} — {b.name}
                      </option>
                    ))}
                  </select>
                )}
                {form.formState.errors.branchId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.branchId.message}
                  </p>
                )}
              </div>

              {/* Expense Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Expense Date <span className="text-destructive">*</span>
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">{expense?.expenseDate}</p>
                ) : (
                  <Input type="date" {...form.register('expenseDate')} />
                )}
                {form.formState.errors.expenseDate && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.expenseDate.message}
                  </p>
                )}
              </div>

              {/* Money Account */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Paid From <span className="text-destructive">*</span>
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">
                    {expense?.moneyAccountCode} — {expense?.moneyAccountName}
                  </p>
                ) : (
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={!watchedBranchId}
                    {...form.register('moneyAccountId')}
                  >
                    <option value="">
                      {!watchedBranchId ? 'Select branch first' : 'Select Money Account'}
                    </option>
                    {availableAccounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.code} — {a.name} ({a.currencyCode})
                      </option>
                    ))}
                  </select>
                )}
                {form.formState.errors.moneyAccountId && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.moneyAccountId.message}
                  </p>
                )}
              </div>

              {/* Exchange Rate (if foreign) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Currency & Exchange Rate
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">
                    {expense?.currencyCode}
                    {expense?.currencyId !== expense?.baseCurrencyId &&
                      ` @ ${expense?.exchangeRate} (Base: ${expense?.baseCurrencyCode})`}
                  </p>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      disabled
                      value={selectedMoneyAccount?.currencyCode || '—'}
                      className="w-24 bg-muted"
                    />
                    {isForeign && (
                      <Input
                        type="number"
                        step="0.000001"
                        placeholder="Rate to Base"
                        {...form.register('exchangeRate', { valueAsNumber: true })}
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Contact */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Contact (Optional)
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">{expense?.contactName || '—'}</p>
                ) : (
                  <select
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    {...form.register('contactId')}
                  >
                    <option value="">No Contact</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Payee Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Payee / Vendor Text (Optional)
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">{expense?.payeeName || '—'}</p>
                ) : (
                  <Input
                    placeholder="e.g. Asiacell, Landlord, Cleaner"
                    {...form.register('payeeName')}
                  />
                )}
              </div>

              {/* Reference */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Reference (Optional)
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">{expense?.reference || '—'}</p>
                ) : (
                  <Input
                    placeholder="e.g. Receipt #123, Bill #456"
                    {...form.register('reference')}
                  />
                )}
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-muted-foreground uppercase">
                  Notes (Optional)
                </label>
                {isPosted ? (
                  <p className="text-sm font-medium">{expense?.notes || '—'}</p>
                ) : (
                  <Input placeholder="Additional notes..." {...form.register('notes')} />
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense Lines Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle>Expense Lines</CardTitle>
            {!isPosted && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => append({ expenseCategoryId: '', description: '', amount: 0 })}
              >
                <Plus className="size-4 mr-1" />
                Add Line
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60">
                    <TableHead className="w-[30%]">Expense Category</TableHead>
                    {isPosted && <TableHead className="w-[20%]">GL Account</TableHead>}
                    <TableHead className="w-[35%]">Description</TableHead>
                    <TableHead className="text-right w-[20%]">
                      Amount ({selectedMoneyAccount?.currencyCode || expense?.currencyCode || '—'})
                    </TableHead>
                    {isForeign && <TableHead className="text-right w-[15%]">Base Amount</TableHead>}
                    {!isPosted && <TableHead className="w-[5%]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isPosted
                    ? expense?.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">
                            {line.expenseCategoryCode} — {line.expenseCategoryName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {line.expenseAccountingAccountCode} {line.expenseAccountingAccountName}
                          </TableCell>
                          <TableCell>{line.description || '—'}</TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {formatAmount(line.amount)}
                          </TableCell>
                          {isForeign && (
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatAmount(line.baseAmount)}
                            </TableCell>
                          )}
                        </TableRow>
                      ))
                    : fields.map((field, index) => {
                        const lineAmount = Number(watchedLines[index]?.amount) || 0
                        const lineBase = lineAmount * rate

                        return (
                          <TableRow key={field.id}>
                            <TableCell>
                              <select
                                className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                {...form.register(`lines.${index}.expenseCategoryId` as const)}
                              >
                                <option value="">Select Category</option>
                                {categories.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.code} — {c.name}
                                  </option>
                                ))}
                              </select>
                              {form.formState.errors.lines?.[index]?.expenseCategoryId && (
                                <p className="text-xs text-destructive mt-1">
                                  {form.formState.errors.lines[index]?.expenseCategoryId?.message}
                                </p>
                              )}
                            </TableCell>
                            <TableCell>
                              <Input
                                placeholder="Line description..."
                                {...form.register(`lines.${index}.description` as const)}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.0001"
                                min="0.0001"
                                className="text-right font-mono"
                                {...form.register(`lines.${index}.amount` as const, {
                                  valueAsNumber: true,
                                })}
                              />
                              {form.formState.errors.lines?.[index]?.amount && (
                                <p className="text-xs text-destructive mt-1">
                                  {form.formState.errors.lines[index]?.amount?.message}
                                </p>
                              )}
                            </TableCell>
                            {isForeign && (
                              <TableCell className="text-right font-mono text-xs text-muted-foreground pt-3">
                                {formatAmount(lineBase)}
                              </TableCell>
                            )}
                            <TableCell>
                              {fields.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                  onClick={() => remove(index)}
                                >
                                  <Trash2 className="size-4" />
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                </TableBody>
              </Table>
            </div>

            {/* Totals Summary */}
            <div className="flex flex-col items-end gap-1 mt-6 border-t pt-4">
              <div className="flex gap-8 text-base">
                <span className="font-semibold">Total Amount:</span>
                <span className="font-mono font-bold">
                  {formatAmount(isPosted ? expense?.totalAmount ?? 0 : totalAmount)}{' '}
                  {selectedMoneyAccount?.currencyCode || expense?.currencyCode}
                </span>
              </div>
              {isForeign && (
                <div className="flex gap-8 text-sm text-muted-foreground">
                  <span>Base Total:</span>
                  <span className="font-mono">
                    {formatAmount(isPosted ? expense?.baseTotalAmount ?? 0 : baseTotalAmount)}{' '}
                    {expense?.baseCurrencyCode || 'IQD'}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Traceability Section (When Posted) */}
      {isPosted && expense && (
        <Card className="border-emerald-200 bg-emerald-50/30 dark:border-emerald-900 dark:bg-emerald-950/20">
          <CardHeader>
            <CardTitle className="text-base text-emerald-800 dark:text-emerald-300">
              Financial Effects & Traceability
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="size-4 text-primary" />
                Accounting Journal
              </div>
              <p className="text-xs text-muted-foreground">
                Dr Operating Expense GL accounts, Cr dedicated Money Account GL account.
              </p>
              {expense.journalEntryId ? (
                <Link
                  to={`/accounting/journal?search=${expense.documentNumber}`}
                  className="text-xs font-mono text-primary underline hover:opacity-80 block pt-1"
                >
                  Journal ID: {expense.journalEntryId}
                </Link>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">Not linked</p>
              )}
            </div>

            <div className="rounded-lg border bg-card p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Wallet className="size-4 text-primary" />
                Money Ledger Outflow
              </div>
              <p className="text-xs text-muted-foreground">
                Outflow of{' '}
                <span className="font-mono font-medium text-destructive">
                  -{formatAmount(expense.totalAmount)} {expense.currencyCode}
                </span>{' '}
                from {expense.moneyAccountCode}.
              </p>
              {expense.moneyLedgerEntryId ? (
                <p className="text-xs font-mono text-muted-foreground pt-1">
                  Movement ID: {expense.moneyLedgerEntryId}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground font-mono">Recorded</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
