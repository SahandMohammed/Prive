import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  Printer,
  RotateCcw,
  Scale,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useTrialBalance } from '../hooks/useAccounting'
import {
  accountClassificationLabels,
  type AccountClassification,
} from '../types/accounting.types'

export function TrialBalancePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [fromDate, setFromDate] = useState(searchParams.get('fromDate') ?? '')
  const [toDate, setToDate] = useState(searchParams.get('toDate') ?? '')
  const [branchId, setBranchId] = useState('')
  const [search, setSearch] = useState('')
  const [classificationFilter, setClassificationFilter] = useState<string>('all')
  const [hideZeroBalances, setHideZeroBalances] = useState(true)

  const branches = useBranches().data?.data.filter((branch) => branch.isActive) ?? []
  const business = useCurrentBusiness().data
  const currencyCode = business?.baseCurrencyCode ?? 'IQD'

  const queryParams = useMemo(
    () => ({
      fromDate: fromDate || undefined,
      toDate: toDate || undefined,
      branchId: branchId || undefined,
    }),
    [fromDate, toDate, branchId]
  )

  const trialQuery = useTrialBalance(queryParams)
  const data = trialQuery.data

  const lines = useMemo(() => {
    if (!data?.lines) return []
    return data.lines.filter((line) => {
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchCode = line.accountCode.toLowerCase().includes(term)
        const matchName = line.accountName.toLowerCase().includes(term)
        const matchClass = (accountClassificationLabels[line.classification] ?? '')
          .toLowerCase()
          .includes(term)
        if (!matchCode && !matchName && !matchClass) return false
      }
      if (classificationFilter !== 'all') {
        if (line.classification !== Number(classificationFilter)) return false
      }
      if (hideZeroBalances) {
        const isZero =
          line.openingDebit === 0 &&
          line.openingCredit === 0 &&
          line.debitMovement === 0 &&
          line.creditMovement === 0 &&
          line.closingDebit === 0 &&
          line.closingCredit === 0
        if (isZero) return false
      }
      return true
    })
  }, [data, search, classificationFilter, hideZeroBalances])

  const totalClosingDr = data?.totalClosingDebit ?? 0
  const totalClosingCr = data?.totalClosingCredit ?? 0
  const variance = Math.abs(totalClosingDr - totalClosingCr)
  const isBalanced = variance < 0.0001
  const activeAccountsCount = data?.lines.length ?? 0

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

  const handleClearFilters = () => {
    setFromDate('')
    setToDate('')
    setBranchId('')
    setSearch('')
    setClassificationFilter('all')
    setHideZeroBalances(true)
    setSearchParams({})
  }

  const handleExportCsv = () => {
    if (!data?.lines) return
    const headers = [
      'Account Code',
      'Account Name',
      'Classification',
      'Opening Debit',
      'Opening Credit',
      'Movement Debit',
      'Movement Credit',
      'Closing Debit',
      'Closing Credit',
    ]
    const rows = lines.map((l) => [
      l.accountCode,
      l.accountName,
      accountClassificationLabels[l.classification] ?? '',
      l.openingDebit.toFixed(4),
      l.openingCredit.toFixed(4),
      l.debitMovement.toFixed(4),
      l.creditMovement.toFixed(4),
      l.closingDebit.toFixed(4),
      l.closingCredit.toFixed(4),
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
      `Trial_Balance_${fromDate || 'Start'}_to_${toDate || 'Present'}.csv`
    )
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleDrillDown = (accountId: string) => {
    const params = new URLSearchParams()
    params.set('accountId', accountId)
    if (fromDate) params.set('fromDate', fromDate)
    if (toDate) params.set('toDate', toDate)
    if (branchId) params.set('branchId', branchId)
    navigate(`/accounting/ledger?${params.toString()}`)
  }

  const hasActiveFilters =
    fromDate || toDate || branchId || search || classificationFilter !== 'all' || !hideZeroBalances

  return (
    <div className="flex h-full w-full flex-col space-y-5">
      {/* HEADER & TOP ACTIONS */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Trial Balance
            </h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <Scale className="h-3.5 w-3.5 text-primary" />
              General Ledger Verification
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time balance verification across all asset, liability, equity, revenue, and expense accounts.
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
            Print Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs shadow-xs"
            onClick={handleExportCsv}
            disabled={!data || lines.length === 0}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* COMPACT SUMMARY & VERIFICATION STRIP */}
      {data && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-card px-4 py-3 text-xs shadow-xs dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-5">
            <div>
              <span className="text-slate-500">Closing Dr: </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(totalClosingDr)} {currencyCode}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Closing Cr: </span>
              <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                {formatNumber(totalClosingCr)} {currencyCode}
              </span>
            </div>
            <div className="hidden h-4 w-px bg-slate-200 dark:bg-slate-800 md:block" />
            <div className="hidden items-center gap-3 text-slate-500 md:flex">
              <span>
                Period Dr: <strong className="font-mono font-semibold text-emerald-600">+{formatNumber(data.totalDebitMovement)}</strong>
              </span>
              <span>
                Period Cr: <strong className="font-mono font-semibold text-blue-600">+{formatNumber(data.totalCreditMovement)}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isBalanced ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                <CheckCircle2 className="size-3.5" />
                Balanced
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                <AlertTriangle className="size-3.5" />
                Variance: Δ {formatNumber(variance)}
              </span>
            )}
            <span className="text-xs text-slate-400">
              {lines.length} of {activeAccountsCount} accounts
            </span>
          </div>
        </div>
      )}

      {/* FILTER CONTROLS & DATE PRESETS */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-card p-4 shadow-xs dark:border-slate-800 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="font-medium text-slate-500">Period:</span>
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

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setHideZeroBalances(!hideZeroBalances)}
              className="h-7 gap-1 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-300"
            >
              {hideZeroBalances ? (
                <>
                  <Eye className="h-3.5 w-3.5" />
                  Show Zero Balances
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5" />
                  Hide Zero Balances
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search code, name..."
              className="h-9 pl-9 text-xs"
            />
          </div>

          <select
            value={classificationFilter}
            onChange={(e) => setClassificationFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="all">All Classifications</option>
            <option value="0">Assets</option>
            <option value="1">Liabilities</option>
            <option value="2">Equity</option>
            <option value="3">Revenue</option>
            <option value="4">Expenses</option>
            <option value="5">Contra Assets</option>
          </select>

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
                title="Reset all filters"
                onClick={handleClearFilters}
                className="h-9 w-9 shrink-0 text-slate-500"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* REPORT DATA TABLE */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {/* Grouped Header */}
              <TableRow className="border-b border-slate-200 bg-slate-100 text-xs font-bold uppercase tracking-wider text-slate-700 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-300">
                <TableHead className="px-4 py-2.5" rowSpan={2}>
                  Account Name & Code
                </TableHead>
                <TableHead className="px-4 py-2.5" rowSpan={2}>
                  Class
                </TableHead>
                <TableHead className="border-l border-slate-200 px-4 py-1.5 text-center dark:border-slate-700" colSpan={2}>
                  Opening Balance
                </TableHead>
                <TableHead className="border-l border-slate-200 px-4 py-1.5 text-center dark:border-slate-700" colSpan={2}>
                  Period Movement
                </TableHead>
                <TableHead className="border-l border-slate-200 px-4 py-1.5 text-center dark:border-slate-700" colSpan={2}>
                  Closing Balance
                </TableHead>
                <TableHead className="w-20 px-3 py-2.5 text-right print:hidden" rowSpan={2}>
                  Ledger
                </TableHead>
              </TableRow>
              {/* Sub Columns */}
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-semibold uppercase text-slate-600 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                <TableHead className="border-l border-slate-200 px-3 text-right dark:border-slate-700">
                  Debit
                </TableHead>
                <TableHead className="px-3 text-right">Credit</TableHead>
                <TableHead className="border-l border-slate-200 px-3 text-right dark:border-slate-700">
                  Debit
                </TableHead>
                <TableHead className="px-3 text-right">Credit</TableHead>
                <TableHead className="border-l border-slate-200 px-3 text-right text-emerald-700 dark:border-slate-700 dark:text-emerald-400">
                  Debit
                </TableHead>
                <TableHead className="px-3 text-right text-blue-700 dark:text-blue-400">
                  Credit
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {trialQuery.isPending ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    Calculating trial balance figures...
                  </TableCell>
                </TableRow>
              ) : trialQuery.isError ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-rose-500">
                    {trialQuery.error.message}
                  </TableCell>
                </TableRow>
              ) : lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-48 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Scale className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      <p className="font-medium text-slate-700 dark:text-slate-300">
                        No accounts match the selected filters
                      </p>
                      <p className="text-xs text-slate-400">
                        Try clearing search terms or toggle "Show Zero Balances".
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow
                    key={line.accountId}
                    className="hover:bg-slate-50/80 transition-colors dark:hover:bg-slate-800/40"
                  >
                    <TableCell className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                          {line.accountCode}
                        </span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {line.accountName}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3">
                      <ClassificationBadge classification={line.classification} />
                    </TableCell>

                    {/* Opening */}
                    <TableCell className="border-l border-slate-100 px-3 py-3 text-right font-mono text-xs dark:border-slate-800">
                      {line.openingDebit > 0 ? formatNumber(line.openingDebit) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right font-mono text-xs text-slate-600 dark:text-slate-400">
                      {line.openingCredit > 0 ? formatNumber(line.openingCredit) : '—'}
                    </TableCell>

                    {/* Movements */}
                    <TableCell className="border-l border-slate-100 px-3 py-3 text-right font-mono text-xs font-semibold text-emerald-600 dark:border-slate-800 dark:text-emerald-400">
                      {line.debitMovement > 0 ? formatNumber(line.debitMovement) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right font-mono text-xs font-semibold text-blue-600 dark:text-blue-400">
                      {line.creditMovement > 0 ? formatNumber(line.creditMovement) : '—'}
                    </TableCell>

                    {/* Closing */}
                    <TableCell className="border-l border-slate-100 px-3 py-3 text-right font-mono text-xs font-bold text-emerald-700 dark:border-slate-800 dark:text-emerald-300">
                      {line.closingDebit > 0 ? formatNumber(line.closingDebit) : '—'}
                    </TableCell>
                    <TableCell className="px-3 py-3 text-right font-mono text-xs font-bold text-blue-700 dark:text-blue-300">
                      {line.closingCredit > 0 ? formatNumber(line.closingCredit) : '—'}
                    </TableCell>

                    {/* Drill down */}
                    <TableCell className="px-3 py-3 text-right print:hidden">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        title={`View General Ledger for ${line.accountCode}`}
                        onClick={() => handleDrillDown(line.accountId)}
                        className="text-slate-500 hover:text-primary"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>

            {/* TOTAL FOOTER ROW */}
            {data && lines.length > 0 && (
              <tfoot>
                <TableRow className="border-t-2 border-slate-300 bg-slate-100/90 font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                  <TableCell className="px-4 py-3 text-xs uppercase" colSpan={2}>
                    Total Report Balance
                  </TableCell>

                  <TableCell className="border-l border-slate-200 px-3 py-3 text-right font-mono text-xs dark:border-slate-700">
                    {formatNumber(data.totalOpeningDebit)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-mono text-xs">
                    {formatNumber(data.totalOpeningCredit)}
                  </TableCell>

                  <TableCell className="border-l border-slate-200 px-3 py-3 text-right font-mono text-xs text-emerald-700 dark:border-slate-700 dark:text-emerald-400">
                    {formatNumber(data.totalDebitMovement)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-mono text-xs text-blue-700 dark:text-blue-400">
                    {formatNumber(data.totalCreditMovement)}
                  </TableCell>

                  <TableCell className="border-l border-slate-200 px-3 py-3 text-right font-mono text-xs text-emerald-700 dark:border-slate-700 dark:text-emerald-400">
                    {formatNumber(data.totalClosingDebit)}
                  </TableCell>
                  <TableCell className="px-3 py-3 text-right font-mono text-xs text-blue-700 dark:text-blue-400">
                    {formatNumber(data.totalClosingCredit)}
                  </TableCell>

                  <TableCell className="print:hidden" />
                </TableRow>
              </tfoot>
            )}
          </Table>
        </div>
      </DataTableShell>
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
