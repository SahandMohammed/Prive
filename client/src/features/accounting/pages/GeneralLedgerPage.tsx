import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  Download,
  Printer,
  RotateCcw,
  Search,
  Wallet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTableShell } from '@/components/data-table/DataTableShell'
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
import { useAccountTree, useGeneralLedger } from '../hooks/useAccounting'
import {
  accountClassificationLabels,
  type AccountClassification,
} from '../types/accounting.types'

export function GeneralLedgerPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [accountId, setAccountId] = useState(searchParams.get('accountId') ?? '')
  const [fromDate, setFromDate] = useState(searchParams.get('fromDate') ?? '')
  const [toDate, setToDate] = useState(searchParams.get('toDate') ?? '')
  const [branchId, setBranchId] = useState('')
  const [lineSearch, setLineSearch] = useState('')

  const accountsQuery = useAccountTree({ postingAccountsOnly: true })
  const accounts = useMemo(() => accountsQuery.data ?? [], [accountsQuery.data])

  const branches = useBranches().data?.data.filter((branch) => branch.isActive) ?? []
  const business = useCurrentBusiness().data
  const currencyCode = business?.baseCurrencyCode ?? 'IQD'

  const selectedAccount = useMemo(
    () => accounts.find((a) => a.id === accountId),
    [accounts, accountId]
  )

  const queryParams = useMemo(
    () => ({
      accountId,
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      branchId: branchId || undefined,
    }),
    [accountId, fromDate, toDate, branchId]
  )

  const ledgerQuery = useGeneralLedger(queryParams, Boolean(accountId))
  const ledger = ledgerQuery.data

  const lines = useMemo(() => {
    if (!ledger?.lines) return []
    if (!lineSearch.trim()) return ledger.lines
    const term = lineSearch.toLowerCase()
    return ledger.lines.filter(
      (line) =>
        (line.reference && line.reference.toLowerCase().includes(term)) ||
        (line.journalDescription && line.journalDescription.toLowerCase().includes(term)) ||
        (line.lineDescription && line.lineDescription.toLowerCase().includes(term)) ||
        line.branchCode.toLowerCase().includes(term) ||
        line.currencyCode.toLowerCase().includes(term)
    )
  }, [ledger?.lines, lineSearch])

  // Summary Metrics calculations
  const totalDebits = useMemo(
    () => (ledger?.lines ?? []).reduce((sum, l) => sum + l.debitBaseAmount, 0),
    [ledger?.lines]
  )
  const totalCredits = useMemo(
    () => (ledger?.lines ?? []).reduce((sum, l) => sum + l.creditBaseAmount, 0),
    [ledger?.lines]
  )
  const openingBalance = ledger?.openingBalance ?? 0
  const endingBalance = useMemo(() => {
    if (!ledger?.lines || ledger.lines.length === 0) return openingBalance
    return ledger.lines[ledger.lines.length - 1]?.runningBalance ?? openingBalance
  }, [ledger?.lines, openingBalance])

  const applyPreset = (preset: 'today' | 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'allTime') => {
    const now = new Date()
    const y = now.getFullYear()
    const m = now.getMonth()

    if (preset === 'today') {
      const todayStr = now.toISOString().slice(0, 10)
      setFromDate(todayStr)
      setToDate(todayStr)
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(y, m, 1).toISOString().slice(0, 10)
      const lastDay = new Date(y, m + 1, 0).toISOString().slice(0, 10)
      setFromDate(firstDay)
      setToDate(lastDay)
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(y, m - 1, 1).toISOString().slice(0, 10)
      const lastDay = new Date(y, m, 0).toISOString().slice(0, 10)
      setFromDate(firstDay)
      setToDate(lastDay)
    } else if (preset === 'thisQuarter') {
      const qStartMonth = Math.floor(m / 3) * 3
      const firstDay = new Date(y, qStartMonth, 1).toISOString().slice(0, 10)
      const lastDay = new Date(y, qStartMonth + 3, 0).toISOString().slice(0, 10)
      setFromDate(firstDay)
      setToDate(lastDay)
    } else if (preset === 'thisYear') {
      setFromDate(`${y}-01-01`)
      setToDate(`${y}-12-31`)
    } else if (preset === 'allTime') {
      setFromDate('')
      setToDate('')
    }
  }

  const handleSelectAccount = (id: string) => {
    setAccountId(id)
    const newParams = new URLSearchParams(searchParams)
    newParams.set('accountId', id)
    setSearchParams(newParams)
  }

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
    setBranchId('')
    setLineSearch('')
  }

  const handleExportCsv = () => {
    if (!ledger) return
    const headers = [
      'Date',
      'Reference',
      'Journal Description',
      'Line Description',
      'Branch',
      'Currency',
      'Debit',
      'Credit',
      'Running Balance',
    ]
    const rows = lines.map((l) => [
      l.entryDate,
      l.reference ?? '',
      l.journalDescription,
      l.lineDescription ?? '',
      l.branchCode,
      l.currencyCode,
      l.debitBaseAmount.toFixed(4),
      l.creditBaseAmount.toFixed(4),
      l.runningBalance.toFixed(4),
    ])

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        .join('\n')

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute(
      'download',
      `General_Ledger_${ledger.accountCode}_${fromDate || 'Start'}_to_${toDate || 'Present'}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Quick pick accounts (e.g. first few active posting accounts from each major class)
  const quickAccounts = useMemo(() => {
    return accounts.slice(0, 6)
  }, [accounts])

  const hasActiveFilters = fromDate || toDate || branchId || lineSearch

  return (
    <div className="flex h-full w-full flex-col space-y-5">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              General Ledger
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              Detailed Account Activity
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Chronological audit trail of all posted journal vouchers and double-entry movements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shadow-xs"
            onClick={() => window.print()}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Statement
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shadow-xs"
            onClick={handleExportCsv}
            disabled={!ledger || lines.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* COMPACT ACCOUNT HERO STRIP */}
      {accountId && ledger && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-card px-4 py-3 text-xs shadow-xs dark:border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
              {ledger.accountCode}
            </span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {ledger.accountName}
            </span>
            {selectedAccount && (
              <ClassificationBadge classification={selectedAccount.classification} />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-5">
            <div>
              <span className="text-slate-500">Opening: </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(Math.abs(openingBalance))} {currencyCode}
                <span className="ml-1 text-[10px] font-normal text-slate-400">
                  ({openingBalance >= 0 ? 'Dr' : 'Cr'})
                </span>
              </span>
            </div>

            <div className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

            <div className="flex items-center gap-3 text-slate-500">
              <span>
                Dr: <strong className="font-mono font-semibold text-emerald-600">+{formatNumber(totalDebits)}</strong>
              </span>
              <span>
                Cr: <strong className="font-mono font-semibold text-blue-600">+{formatNumber(totalCredits)}</strong>
              </span>
            </div>

            <div className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 sm:block" />

            <div>
              <span className="text-slate-500">Ending: </span>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {formatNumber(Math.abs(endingBalance))} {currencyCode}
                <span className="ml-1 text-[10px] font-semibold text-emerald-600">
                  ({endingBalance >= 0 ? 'Dr' : 'Cr'})
                </span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FILTER & ACCOUNT PICKER TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 print:hidden">
        {/* Quick presets row */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-slate-500">Quick Period:</span>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs"
              onClick={() => applyPreset('thisMonth')}
            >
              This Month
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs"
              onClick={() => applyPreset('lastMonth')}
            >
              Last Month
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs"
              onClick={() => applyPreset('thisQuarter')}
            >
              This Quarter
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs"
              onClick={() => applyPreset('thisYear')}
            >
              This Year
            </Button>
            <Button
              variant="ghost"
              size="xs"
              className="h-7 px-2 text-xs"
              onClick={() => applyPreset('allTime')}
            >
              All Time
            </Button>
          </div>

          <Link to="/accounting/trial-balance" className="text-xs text-primary hover:underline">
            View Trial Balance Verification →
          </Link>
        </div>

        {/* Filters Controls Grid */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Account Selector */}
          <div className="lg:col-span-2">
            <select
              value={accountId}
              onChange={(e) => handleSelectAccount(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs font-medium"
            >
              <option value="">Select posting account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} — {account.name} (
                  {accountClassificationLabels[account.classification] ?? ''})
                </option>
              ))}
            </select>
          </div>

          {/* Branch Filter */}
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="">Current branch</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} — {b.name}
              </option>
            ))}
          </select>

          {/* Date Range Inputs */}
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-400">From:</span>
            <Input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center gap-1">
              <span className="text-xs text-slate-400">To:</span>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="icon-sm"
                title="Reset filters"
                onClick={handleClearFilters}
                className="h-9 w-9 shrink-0 text-slate-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Search within ledger entries */}
        {accountId && (
          <div className="relative pt-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={lineSearch}
              onChange={(e) => setLineSearch(e.target.value)}
              placeholder="Search reference, journal memo, description, or currency in this ledger..."
              className="h-8 pl-9 text-xs"
            />
          </div>
        )}
      </div>

      {/* UNSELECTED ONBOARDING STATE */}
      {!accountId ? (
        <Card className="border-dashed p-8 text-center shadow-xs">
          <div className="mx-auto flex max-w-lg flex-col items-center justify-center gap-3">
            <div className="rounded-full bg-primary/10 p-4 text-primary">
              <Wallet className="h-8 w-8" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Select an account to view its General Ledger
            </h2>
            <p className="text-xs text-slate-500">
              Choose an active posting account from the selector above or pick a standard account
              below to inspect its complete debit, credit, and running balance activity.
            </p>

            {quickAccounts.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {quickAccounts.map((acc) => (
                  <Button
                    key={acc.id}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs font-medium"
                    onClick={() => handleSelectAccount(acc.id)}
                  >
                    <span className="font-mono text-primary">{acc.code}</span>
                    <span>{acc.name}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        </Card>
      ) : (
        /* LEDGER TRANSACTIONS DATA TABLE */
        <DataTableShell>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-200 bg-[#e9ecef]/70 text-xs font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300">
                  <TableHead className="w-32 px-4 py-3">Date</TableHead>
                  <TableHead className="w-36 px-4 py-3">Reference</TableHead>
                  <TableHead className="min-w-64 px-4 py-3">Journal Memo / Description</TableHead>
                  <TableHead className="w-28 px-4 py-3">Branch</TableHead>
                  <TableHead className="w-24 px-4 py-3">Currency</TableHead>
                  <TableHead className="w-36 px-4 py-3 text-right text-emerald-700 dark:text-emerald-400">
                    Debit (Base)
                  </TableHead>
                  <TableHead className="w-36 px-4 py-3 text-right text-blue-700 dark:text-blue-400">
                    Credit (Base)
                  </TableHead>
                  <TableHead className="w-40 px-4 py-3 text-right">
                    Running Balance
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {ledgerQuery.isPending ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center text-sm text-slate-500">
                      Loading general ledger transactions...
                    </TableCell>
                  </TableRow>
                ) : ledgerQuery.isError ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center text-sm text-rose-500">
                      {ledgerQuery.error.message}
                    </TableCell>
                  </TableRow>
                ) : lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-48 text-center text-sm text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                        <p className="font-medium text-slate-700 dark:text-slate-300">
                          No posted activity found for the selected period
                        </p>
                        <p className="text-xs text-slate-400">
                          Opening balance for this period is{' '}
                          <span className="font-mono font-semibold">
                            {formatNumber(openingBalance)} {currencyCode}
                          </span>
                          .
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lines.map((line) => (
                    <TableRow
                      key={`${line.journalId}-${line.entryDate}-${line.runningBalance}`}
                      className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                    >
                      <TableCell className="px-4 py-3 text-xs text-slate-700 dark:text-slate-300">
                        {line.entryDate}
                      </TableCell>

                      <TableCell className="px-4 py-3 font-mono text-xs font-semibold">
                        <Link
                          to={`/accounting/journal?search=${encodeURIComponent(
                            line.reference || line.journalId
                          )}`}
                          className="inline-flex items-center gap-1 text-[#d85430] hover:underline"
                        >
                          {line.reference || 'Journal'}
                          <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      </TableCell>

                      <TableCell className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {line.journalDescription}
                        </p>
                        {line.lineDescription && (
                          <p className="text-xs text-muted-foreground">{line.lineDescription}</p>
                        )}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-xs text-slate-600 dark:text-slate-400">
                        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {line.branchCode}
                        </span>
                      </TableCell>

                      <TableCell className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {line.currencyCode}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                        {line.debitBaseAmount > 0 ? formatNumber(line.debitBaseAmount) : '—'}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                        {line.creditBaseAmount > 0 ? formatNumber(line.creditBaseAmount) : '—'}
                      </TableCell>

                      <TableCell className="px-4 py-3 text-right font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                        <span>{formatNumber(Math.abs(line.runningBalance))}</span>{' '}
                        <span className="text-[10px] text-slate-400">
                          {line.runningBalance >= 0 ? 'Dr' : 'Cr'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {/* TABLE SUMMARY TOTALS */}
              {ledger && lines.length > 0 && (
                <tfoot>
                  <TableRow className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                    <TableCell className="px-4 py-3 text-xs uppercase" colSpan={5}>
                      Total Period Activity & Closing
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs text-emerald-700 dark:text-emerald-400">
                      {formatNumber(totalDebits)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs text-blue-700 dark:text-blue-400">
                      {formatNumber(totalCredits)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-right font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      {formatNumber(Math.abs(endingBalance))}{' '}
                      <span className="text-[10px] text-slate-500">
                        {endingBalance >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </TableCell>
                  </TableRow>
                </tfoot>
              )}
            </Table>
          </div>
        </DataTableShell>
      )}
    </div>
  )
}

function ClassificationBadge({ classification }: { classification: AccountClassification }) {
  switch (classification) {
    case 0:
      return (
        <span className="inline-flex rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
          Asset
        </span>
      )
    case 1:
      return (
        <span className="inline-flex rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
          Liability
        </span>
      )
    case 2:
      return (
        <span className="inline-flex rounded bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
          Equity
        </span>
      )
    case 3:
      return (
        <span className="inline-flex rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
          Revenue
        </span>
      )
    case 4:
      return (
        <span className="inline-flex rounded bg-rose-50 px-2 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
          Expense
        </span>
      )
    case 5:
      return (
        <span className="inline-flex rounded bg-cyan-50 px-2 py-0.5 text-[10px] font-semibold text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-400">
          Contra Asset
        </span>
      )
    default:
      return (
        <span className="inline-flex rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
          {accountClassificationLabels[classification] ?? 'Other'}
        </span>
      )
  }
}

function formatNumber(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  })
}
