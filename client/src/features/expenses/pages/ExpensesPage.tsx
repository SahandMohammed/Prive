import { useState } from 'react'
import { FilePlus2, Search, Settings, ArrowRight, CheckCircle2, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTablePagination } from '@/components/data-table/DataTablePagination'
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
import { useBranches } from '@/features/business'
import { useContacts } from '@/features/contacts'
import { useMoneyAccounts } from '@/features/finance'
import {
  useExpenses,
  useExpensesSummary,
  useExpenseCategoryOptions,
  usePostExpense,
  useDeleteExpense,
} from '../hooks/useExpenses'
import { ExpenseDocumentStatus } from '../types/expenses.types'

export function ExpensesPage() {
  const [search, setSearch] = useState('')
  const [branchId, setBranchId] = useState('')
  const [moneyAccountId, setMoneyAccountId] = useState('')
  const [expenseCategoryId, setExpenseCategoryId] = useState('')
  const [contactId, setContactId] = useState('')
  const [status, setStatus] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const filters = {
    page,
    pageSize,
    search: search.trim() || undefined,
    branchId: branchId || undefined,
    moneyAccountId: moneyAccountId || undefined,
    expenseCategoryId: expenseCategoryId || undefined,
    contactId: contactId || undefined,
    status: status !== '' ? (Number(status) as ExpenseDocumentStatus) : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }

  const query = useExpenses(filters)
  const summaryQuery = useExpensesSummary(filters)
  const branches = useBranches().data?.data ?? []
  const moneyAccounts = useMoneyAccounts({ page: 1, pageSize: 100, isActive: true }).data?.data ?? []
  const categories = useExpenseCategoryOptions().data ?? []
  const contacts = useContacts({ page: 1, pageSize: 100, isActive: true }).data?.data ?? []

  const postExpense = usePostExpense()
  const deleteExpense = useDeleteExpense()

  const rows = query.data?.data ?? []
  const summary = summaryQuery.data

  const resetPage = () => setPage(1)

  const filteredAccounts = branchId
    ? moneyAccounts.filter((a) => a.branchId === branchId)
    : moneyAccounts

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Direct-paid operating expenses immediately settled from Money Accounts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/expenses/categories">
            <Button variant="outline">
              <Settings className="size-4 mr-1.5" />
              Categories
            </Button>
          </Link>
          <Link to="/expenses/new">
            <Button className="bg-primarytext-primary-foregroundhover:bg-primary/90">
              <FilePlus2 className="size-4 mr-1.5" />
              New Expense
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {formatAmount(summary?.totalExpenses ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">For currently filtered period</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Base Currency Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-primary">
              {formatAmount(summary?.baseTotalExpenses ?? 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Converted at effective exchange rates</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expense Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">
              {summary?.count ?? 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Total recorded documents</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="grid gap-3 md:grid-cols-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              resetPage()
            }}
            placeholder="Document #, Payee, Ref..."
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            resetPage()
          }}
        >
          <option value="">All Statuses</option>
          <option value="0">Draft</option>
          <option value="1">Posted</option>
        </Select>
        <Select
          value={branchId}
          onChange={(e) => {
            setBranchId(e.target.value)
            setMoneyAccountId('')
            resetPage()
          }}
        >
          <option value="">Current branch</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.code} — {b.name}
            </option>
          ))}
        </Select>
        <Select
          value={moneyAccountId}
          onChange={(e) => {
            setMoneyAccountId(e.target.value)
            resetPage()
          }}
        >
          <option value="">All Money Accounts</option>
          {filteredAccounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.code} ({a.currencyCode})
            </option>
          ))}
        </Select>
        <Select
          value={expenseCategoryId}
          onChange={(e) => {
            setExpenseCategoryId(e.target.value)
            resetPage()
          }}
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={contactId}
          onChange={(e) => {
            setContactId(e.target.value)
            resetPage()
          }}
        >
          <option value="">All Contacts</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="From Date"
          value={dateFrom}
          onChange={(e) => {
            setDateFrom(e.target.value)
            resetPage()
          }}
        />
        <Input
          type="date"
          aria-label="To Date"
          value={dateTo}
          onChange={(e) => {
            setDateTo(e.target.value)
            resetPage()
          }}
        />
      </div>

      {/* Table */}
      <DataTableShell>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wider dark:border-slate-800 dark:bg-slate-800/60">
                <TableHead>Document</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Payee / Contact</TableHead>
                <TableHead>Branch / Account</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {query.isPending ? (
                <MessageRow label="Loading expenses…" />
              ) : query.isError ? (
                <MessageRow label={query.error.message} error />
              ) : rows.length === 0 ? (
                <MessageRow label="No expenses found." />
              ) : (
                rows.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Link
                        className="font-mono font-semibold text-primary hover:underline"
                        to={`/expenses/${expense.id}`}
                      >
                        {expense.documentNumber}
                      </Link>
                      {expense.reference && (
                        <p className="text-xs text-muted-foreground">{expense.reference}</p>
                      )}
                    </TableCell>
                    <TableCell>{expense.expenseDate}</TableCell>
                    <TableCell>
                      <p className="font-medium">{expense.payeeName || expense.contactName || '—'}</p>
                      {expense.contactName && expense.payeeName && (
                        <p className="text-xs text-muted-foreground">{expense.contactName}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <p>{expense.branchName}</p>
                      <p className="text-xs text-muted-foreground">{expense.moneyAccountCode}</p>
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {formatAmount(expense.totalAmount)} {expense.currencyCode}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={expense.status} />
                    </TableCell>
                    <TableCell>{expense.createdByUsername}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {expense.status === ExpenseDocumentStatus.Draft ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                              disabled={postExpense.isPending}
                              onClick={() => {
                                if (window.confirm(`Post expense ${expense.documentNumber}? This will create a Money Ledger outflow and an Accounting Journal entry.`)) {
                                  postExpense.mutate(expense.id)
                                }
                              }}
                            >
                              <CheckCircle2 className="size-3.5 mr-1" />
                              Post
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 text-destructive hover:bg-destructive/10"
                              disabled={deleteExpense.isPending}
                              onClick={() => {
                                if (window.confirm(`Delete draft expense ${expense.documentNumber}?`)) {
                                  deleteExpense.mutate(expense.id)
                                }
                              }}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </>
                        ) : (
                          <Link to={`/expenses/${expense.id}`}>
                            <Button size="sm" variant="ghost" className="h-8">
                              <ArrowRight className="size-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
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
          resetPage()
        }}
      />
    </div>
  )
}

function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      {...props}
    />
  )
}

function MessageRow({ label, error = false }: { label: string; error?: boolean }) {
  return (
    <TableRow>
      <TableCell colSpan={8} className={`h-40 text-center ${error ? 'text-destructive' : 'text-muted-foreground'}`}>
        {label}
      </TableCell>
    </TableRow>
  )
}

export function StatusBadge({ status }: { status: ExpenseDocumentStatus }) {
  return (
    <span
      className={
        status === ExpenseDocumentStatus.Posted
          ? 'rounded bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
          : 'rounded bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      }
    >
      {status === ExpenseDocumentStatus.Posted ? 'Posted' : 'Draft'}
    </span>
  )
}

const formatAmount = (value: number) =>
  value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 4 })
