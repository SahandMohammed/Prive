import { getSelectedBranchId } from '@/features/business'
import { useEffect, useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Info,
  Loader2,
  Plus,
  Save,
  Scale,
  Send,
  Trash2,
} from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useBranches, useCurrencies, useCurrentBusiness } from '@/features/business'
import { financeApi } from '@/features/finance'
import { AccountCombobox } from '../components/AccountCombobox'
import {
  useAccountTree,
  useJournal,
  useJournalActions,
  useSaveJournal,
} from '../hooks/useAccounting'
import { journalSchema } from '../schemas/accounting.schemas'
import type { JournalInput } from '../types/accounting.types'

const today = new Date().toISOString().slice(0, 10)

const blankLine = (defaultCurrencyId: string = '') => ({
  accountId: '',
  description: null as string | null,
  currencyId: defaultCurrencyId,
  originalDebitAmount: 0,
  originalCreditAmount: 0,
  exchangeRate: 1,
})

export function CreateJournalEntryPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const editId = searchParams.get('id')

  const accountsQuery = useAccountTree({ postingAccountsOnly: true })
  const branchesQuery = useBranches()
  const currenciesQuery = useCurrencies()
  const businessQuery = useCurrentBusiness()
  const journalQuery = useJournal(editId)

  const saveJournal = useSaveJournal(editId)
  const actions = useJournalActions()
  const [isPostingDirectly, setIsPostingDirectly] = useState(false)

  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])
  const branches = useMemo(
    () => branchesQuery.data?.data.filter((b) => b.isActive) ?? [],
    [branchesQuery.data]
  )
  const currencies = useMemo(
    () => currenciesQuery.data?.data.filter((c) => c.isActive) ?? [],
    [currenciesQuery.data]
  )
  const baseCurrencyId = businessQuery.data?.baseCurrencyId ?? ''
  const currencyCode = businessQuery.data?.baseCurrencyCode ?? 'IQD'

  const defaultValues: JournalInput = useMemo(
    () => ({
      entryDate: today,
      reference: null,
      description: '',
      branchId: getSelectedBranchId(),
      type: 0,
      lines: [blankLine(baseCurrencyId)],
    }),
    [baseCurrencyId]
  )

  const form = useForm<JournalInput>({
    resolver: zodResolver(journalSchema),
    defaultValues,
  })

  const lines = useFieldArray({ control: form.control, name: 'lines' })
  const watchedLines = useWatch({ control: form.control, name: 'lines' }) ?? []
  const branchId = useWatch({ control: form.control, name: 'branchId' })
  const entryDate = useWatch({ control: form.control, name: 'entryDate' })

  // Auto-fill default branch & currencies when creating new
  useEffect(() => {
    if (!editId && branches.length > 0 && !branchId) {
      const mainBranch = branches.find((b) => b.isMainBranch) ?? branches[0]
      form.setValue('branchId', mainBranch.id)
    }
  }, [branches, branchId, editId, form])

  // Update initial line currency when baseCurrencyId loads
  useEffect(() => {
    if (!editId && baseCurrencyId && watchedLines.length === 1 && !watchedLines[0].currencyId) {
      form.setValue('lines.0.currencyId', baseCurrencyId)
      form.setValue('lines.0.exchangeRate', 1)
    }
  }, [baseCurrencyId, editId, form, watchedLines])

  // When entryDate changes, refresh exchange rates for any foreign currency lines
  useEffect(() => {
    if (!entryDate) return
    watchedLines.forEach(async (line, index) => {
      if (line.currencyId && line.currencyId !== baseCurrencyId) {
        try {
          const effectiveRate = await financeApi.effectiveExchangeRate(line.currencyId, entryDate)
          if (effectiveRate?.rate) {
            form.setValue(`lines.${index}.exchangeRate`, effectiveRate.rate, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        } catch {
          // Ignore if exchange rate lookup fails
        }
      }
    })
  }, [entryDate, baseCurrencyId, form])

  // Populate when editing existing draft
  useEffect(() => {
    if (journalQuery.data && editId) {
      const entry = journalQuery.data
      form.reset({
        entryDate: entry.entryDate,
        reference: entry.reference,
        description: entry.description,
        branchId: entry.branchId,
        type: entry.type === 1 ? 1 : 0,
        lines: entry.lines.map((l) => ({
          accountId: l.accountId,
          description: l.description,
          currencyId: l.currencyId,
          originalDebitAmount: l.originalDebitAmount,
          originalCreditAmount: l.originalCreditAmount,
          exchangeRate: l.exchangeRate,
        })),
      })
    }
  }, [journalQuery.data, editId, form])

  const calculateBase = (amount: number, currId: string, rate: number) => {
    const isBase = currId === baseCurrencyId || !currId
    return isBase ? amount : amount * (rate || 1)
  }

  const debitTotal = useMemo(() => {
    return watchedLines.reduce((total, line) => {
      const amt = Number(line?.originalDebitAmount) || 0
      return total + calculateBase(amt, line?.currencyId, Number(line?.exchangeRate) || 1)
    }, 0)
  }, [watchedLines, baseCurrencyId])

  const creditTotal = useMemo(() => {
    return watchedLines.reduce((total, line) => {
      const amt = Number(line?.originalCreditAmount) || 0
      return total + calculateBase(amt, line?.currencyId, Number(line?.exchangeRate) || 1)
    }, 0)
  }, [watchedLines, baseCurrencyId])

  const difference = Math.abs(debitTotal - creditTotal)
  const isBalanced =
    watchedLines.length >= 2 &&
    debitTotal > 0 &&
    difference < 0.0001
  const isPending = saveJournal.isPending || actions.post.isPending

  const handleCurrencyChange = async (index: number, newCurrencyId: string) => {
    form.setValue(`lines.${index}.currencyId`, newCurrencyId, { shouldValidate: true })

    if (newCurrencyId === baseCurrencyId || !newCurrencyId) {
      form.setValue(`lines.${index}.exchangeRate`, 1, { shouldValidate: true, shouldDirty: true })
    } else {
      try {
        const currentDate = form.getValues('entryDate') || today
        const effectiveRate = await financeApi.effectiveExchangeRate(newCurrencyId, currentDate)
        if (effectiveRate?.rate) {
          form.setValue(`lines.${index}.exchangeRate`, effectiveRate.rate, {
            shouldValidate: true,
            shouldDirty: true,
          })
        }
      } catch {
        // Keep current rate or 1 if no configured rate
      }
    }
  }

  const handleDebitChange = (index: number, value: number) => {
    form.setValue(`lines.${index}.originalDebitAmount`, value)
    if (value > 0) {
      form.setValue(`lines.${index}.originalCreditAmount`, 0)
    }
  }

  const handleCreditChange = (index: number, value: number) => {
    form.setValue(`lines.${index}.originalCreditAmount`, value)
    if (value > 0) {
      form.setValue(`lines.${index}.originalDebitAmount`, 0)
    }
  }

  const handleAutoBalance = () => {
    if (difference < 0.0001) return

    const diff = Number(difference.toFixed(4))
    const lastIndex = watchedLines.length - 1
    const lastLine = watchedLines[lastIndex]

    // If last line has no debit and no credit and no account, populate it
    if (
      lastLine &&
      !lastLine.accountId &&
      lastLine.originalDebitAmount === 0 &&
      lastLine.originalCreditAmount === 0
    ) {
      const rate = Number(lastLine.exchangeRate) || 1
      const isBase = lastLine.currencyId === baseCurrencyId || !lastLine.currencyId
      const txAmount = isBase ? diff : Number((diff / rate).toFixed(4))

      if (debitTotal > creditTotal) {
        form.setValue(`lines.${lastIndex}.originalCreditAmount`, txAmount)
      } else {
        form.setValue(`lines.${lastIndex}.originalDebitAmount`, txAmount)
      }
    } else {
      // Append a new balancing line
      if (debitTotal > creditTotal) {
        lines.append({
          ...blankLine(baseCurrencyId),
          originalCreditAmount: diff,
          originalDebitAmount: 0,
        })
      } else {
        lines.append({
          ...blankLine(baseCurrencyId),
          originalDebitAmount: diff,
          originalCreditAmount: 0,
        })
      }
    }
  }

  const handleDuplicateLine = (index: number) => {
    const lineToCopy = watchedLines[index]
    if (!lineToCopy) return
    lines.append({
      accountId: lineToCopy.accountId,
      description: lineToCopy.description,
      currencyId: lineToCopy.currencyId || baseCurrencyId,
      originalDebitAmount: 0,
      originalCreditAmount: 0,
      exchangeRate: lineToCopy.exchangeRate || 1,
    })
  }

  const handleSave = (shouldPost = false) => {
    setIsPostingDirectly(shouldPost)
    form.handleSubmit(
      (values) => {
        const payload: JournalInput = {
          ...values,
          reference: values.reference?.trim() || null,
          lines: values.lines.map((l) => ({
            ...l,
            description: l.description?.trim() || null,
            originalDebitAmount: Number(l.originalDebitAmount) || 0,
            originalCreditAmount: Number(l.originalCreditAmount) || 0,
            exchangeRate: Number(l.exchangeRate) || 1,
          })),
        }

        saveJournal.mutate(payload, {
          onSuccess: (savedEntry) => {
            if (shouldPost && savedEntry?.id) {
              actions.post.mutate(savedEntry.id, {
                onSuccess: () => navigate('/accounting/journal'),
              })
            } else {
              navigate('/accounting/journal')
            }
          },
        })
      },
      (errors) => {
        console.error('Validation errors:', errors)
      }
    )()
  }

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* TOP HEADER & ACTIONS */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Link to="/accounting/journal">
            <Button variant="outline" size="icon-sm" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Journal entries</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {editId ? 'Edit Journal Entry' : 'Create Journal Entry'}
            </h1>
            <p className="text-xs text-slate-500">
              Double-entry financial voucher with automated base currency exchange rate validation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/accounting/journal">
            <Button variant="outline" size="sm" className="h-9" disabled={isPending}>
              Cancel
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="h-9 gap-1.5 font-medium"
            disabled={isPending}
            onClick={() => handleSave(false)}
          >
            {isPending && !isPostingDirectly ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save Draft
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 bg-primary font-medium text-white shadow-sm hover:bg-primary/90"
            disabled={isPending || !isBalanced}
            onClick={() => handleSave(true)}
            title={
              !isBalanced
                ? 'Journal must have at least 2 balanced lines before posting'
                : 'Save and post to general ledger'
            }
          >
            {isPending && isPostingDirectly ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Post Journal
          </Button>
        </div>
      </div>

      {/* DOCUMENT METADATA CARD */}
      <Card className="border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Entry Details
          </CardTitle>
          <CardDescription>
            Specify the posting date, branch ledger, and business justification for this transaction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FormField label="Entry Date" error={form.formState.errors.entryDate?.message}>
              <Input type="date" className="h-9 text-sm" {...form.register('entryDate')} />
            </FormField>

            <FormField label="Branch" error={form.formState.errors.branchId?.message}>
              <select
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                {...form.register('branchId')}
              >
                <option value="">Select Branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.code} — {branch.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Reference / Voucher #" error={form.formState.errors.reference?.message}>
              <Input
                placeholder="e.g. JV-2026-001"
                className="h-9 text-sm font-mono uppercase"
                {...form.register('reference')}
              />
            </FormField>

            <FormField label="Journal Type">
              <select
                className="h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                {...form.register('type', { valueAsNumber: true })}
              >
                <option value={0}>Standard Journal</option>
                <option value={1}>Opening Balance</option>
              </select>
            </FormField>
          </div>

          <FormField label="Description / Memo" error={form.formState.errors.description?.message}>
            <Input
              placeholder="e.g. Monthly salon rent payment or revenue recognition"
              className="h-9 text-sm"
              {...form.register('description')}
            />
          </FormField>
        </CardContent>
      </Card>

      {/* LINE ITEMS TABLE CARD */}
      <Card className="border-slate-200 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Journal Lines
            </CardTitle>
            <CardDescription>
              Double-entry posting: Total debits must equal total credits in base currency ({currencyCode}).
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {difference > 0.0001 && (debitTotal > 0 || creditTotal > 0) && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/5"
                onClick={handleAutoBalance}
              >
                <Scale className="size-3.5" />
                Auto-Balance ({difference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })})
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1 text-xs"
              onClick={() => lines.append(blankLine(baseCurrencyId))}
            >
              <Plus className="size-3.5" />
              Add Line
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/60">
                  <TableHead className="w-10 px-2 text-center">#</TableHead>
                  <TableHead className="min-w-64 px-3 font-semibold text-slate-600 dark:text-slate-300">
                    Account (ComboBox)
                  </TableHead>
                  <TableHead className="min-w-44 px-3 font-semibold text-slate-600 dark:text-slate-300">
                    Description / Note
                  </TableHead>
                  <TableHead className="w-32 px-3 font-semibold text-slate-600 dark:text-slate-300">
                    Currency
                  </TableHead>
                  <TableHead className="w-36 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Rate (1 Curr in {currencyCode})
                  </TableHead>
                  <TableHead className="w-32 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Debit (Tx)
                  </TableHead>
                  <TableHead className="w-32 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Credit (Tx)
                  </TableHead>
                  <TableHead className="w-32 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Debit ({currencyCode})
                  </TableHead>
                  <TableHead className="w-32 px-3 text-right font-semibold text-slate-600 dark:text-slate-300">
                    Credit ({currencyCode})
                  </TableHead>
                  <TableHead className="w-16 px-2 text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {lines.fields.map((field, index) => {
                  const line = watchedLines[index] ?? {}
                  const isForeign = line.currencyId && line.currencyId !== baseCurrencyId
                  const debitTx = Number(line.originalDebitAmount) || 0
                  const creditTx = Number(line.originalCreditAmount) || 0
                  const exRate = Number(line.exchangeRate) || 1
                  const baseDebit = calculateBase(debitTx, line.currencyId, exRate)
                  const baseCredit = calculateBase(creditTx, line.currencyId, exRate)
                  const currObj = currencies.find((c) => c.id === line.currencyId)

                  return (
                    <TableRow key={field.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <TableCell className="px-2 py-2 text-center text-xs font-mono text-slate-400">
                        {index + 1}
                      </TableCell>

                      {/* Account Searchable ComboBox */}
                      <TableCell className="px-3 py-2">
                        <AccountCombobox
                          accounts={accounts}
                          value={line.accountId || ''}
                          onChange={(val) =>
                            form.setValue(`lines.${index}.accountId`, val, { shouldValidate: true })
                          }
                          placeholder="Select posting account..."
                        />
                      </TableCell>

                      {/* Line Memo */}
                      <TableCell className="px-3 py-2">
                        <Input
                          placeholder="Line description"
                          className="h-9 text-xs"
                          {...form.register(`lines.${index}.description`)}
                        />
                      </TableCell>

                      {/* Currency */}
                      <TableCell className="px-3 py-2">
                        <select
                          className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-xs shadow-xs outline-none focus:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
                          value={line.currencyId || baseCurrencyId}
                          onChange={(e) => handleCurrencyChange(index, e.target.value)}
                        >
                          {currencies.map((curr) => (
                            <option key={curr.id} value={curr.id}>
                              {curr.code} ({curr.symbol})
                            </option>
                          ))}
                        </select>
                      </TableCell>

                      {/* Exchange Rate */}
                      <TableCell className="px-3 py-2">
                        {isForeign ? (
                          <div className="space-y-0.5">
                            <Input
                              type="number"
                              min="0.000001"
                              step="0.000001"
                              className="h-9 text-right font-mono text-xs"
                              {...form.register(`lines.${index}.exchangeRate`, {
                                valueAsNumber: true,
                              })}
                            />
                            {currObj && (
                              <p className="text-[10px] text-right font-mono text-slate-400">
                                1 {currObj.code} = {exRate.toLocaleString()} {currencyCode}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-9 items-center justify-end rounded-md border border-slate-100 bg-slate-50/80 px-2.5 font-mono text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-800/40">
                            1.000000 <span className="ml-1 text-[10px] text-slate-400">(Base)</span>
                          </div>
                        )}
                      </TableCell>

                      {/* Debit Tx */}
                      <TableCell className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="0.00"
                          className="h-9 text-right font-mono text-xs font-medium text-slate-900 dark:text-slate-100"
                          value={line.originalDebitAmount ?? 0}
                          onChange={(e) => handleDebitChange(index, Number(e.target.value))}
                        />
                      </TableCell>

                      {/* Credit Tx */}
                      <TableCell className="px-3 py-2">
                        <Input
                          type="number"
                          step="0.0001"
                          min="0"
                          placeholder="0.00"
                          className="h-9 text-right font-mono text-xs font-medium text-slate-900 dark:text-slate-100"
                          value={line.originalCreditAmount ?? 0}
                          onChange={(e) => handleCreditChange(index, Number(e.target.value))}
                        />
                      </TableCell>

                      {/* Debit Base */}
                      <TableCell className="px-3 py-2 text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {baseDebit > 0
                          ? baseDebit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })
                          : '—'}
                      </TableCell>

                      {/* Credit Base */}
                      <TableCell className="px-3 py-2 text-right font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {baseCredit > 0
                          ? baseCredit.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 4,
                            })
                          : '—'}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="px-2 py-2 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-slate-400 hover:text-slate-600"
                            title="Duplicate line"
                            onClick={() => handleDuplicateLine(index)}
                          >
                            <Copy className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            className="text-slate-400 hover:text-red-600"
                            title="Delete line"
                            onClick={() => lines.remove(index)}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>

          {form.formState.errors.lines?.message && (
            <div className="border-t border-red-200 bg-red-50 p-3 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30">
              {form.formState.errors.lines.message}
            </div>
          )}

          {/* BALANCE & TOTALS SUMMARY BAR */}
          <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-800/40">
            <div className="flex items-center gap-3">
              {isBalanced ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                  <CheckCircle2 className="size-4 text-emerald-600" />
                  Journal Balanced ({watchedLines.length} lines)
                </div>
              ) : debitTotal === 0 && creditTotal === 0 ? (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                  <Info className="size-4" />
                  Enter debit and credit amounts (minimum 2 lines required)
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                  <AlertCircle className="size-4 text-rose-600" />
                  Out of Balance: Difference{' '}
                  {difference.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}{' '}
                  {currencyCode}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-6 text-sm">
              <div className="text-right">
                <p className="text-xs text-slate-500">Total Debit ({currencyCode})</p>
                <p className="font-mono text-base font-bold text-emerald-600 dark:text-emerald-400">
                  {debitTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </p>
              </div>

              <div className="text-right">
                <p className="text-xs text-slate-500">Total Credit ({currencyCode})</p>
                <p className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">
                  {creditTotal.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </p>
              </div>

              <div className="border-l border-slate-200 pl-6 text-right dark:border-slate-700">
                <p className="text-xs text-slate-500">Difference</p>
                <p
                  className={`font-mono text-base font-bold ${
                    difference === 0
                      ? 'text-slate-600 dark:text-slate-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`}
                >
                  {difference.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 4,
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {saveJournal.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30">
          <p className="font-semibold">Failed to save journal entry:</p>
          <p className="mt-0.5">{saveJournal.error.message}</p>
        </div>
      )}
    </div>
  )
}

function FormField({
  label,
  error,
  children,
}: {
  label: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-1.5 text-sm font-medium text-slate-700 dark:text-slate-300">
      <span>{label}</span>
      {children}
      {error && <span className="text-xs font-normal text-red-600">{error}</span>}
    </label>
  )
}
