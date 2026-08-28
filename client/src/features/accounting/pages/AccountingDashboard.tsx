import { Link } from 'react-router-dom'
import {
  ArrowUpRight,
  BookOpen,
  Coins,
  FileSpreadsheet,
  ListTree,
  Plus,
  Scale,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AccountingDashboard() {
  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Accounting & Financial Reports
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            IFRS general ledger, chart of accounts, trial balance verification, and posted journals.
          </p>
        </div>
        <Link to="/accounting/journal/new">
          <Button className="gap-1.5 bg-[#e05d38] text-white hover:bg-[#c94f2d]">
            <Plus className="size-4" />
            New Journal Entry
          </Button>
        </Link>
      </div>

      {/* CORE REPORT & NAVIGATION CARDS */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Trial Balance */}
        <Link to="/accounting/trial-balance" className="group">
          <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                  <Scale className="size-6" />
                </div>
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
              <CardTitle className="mt-3 text-lg">Trial Balance</CardTitle>
              <CardDescription>
                Verify closing debit and credit balance integrity across all financial accounts.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              Run trial balance report →
            </CardContent>
          </Card>
        </Link>

        {/* General Ledger */}
        <Link to="/accounting/ledger" className="group">
          <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-sky-50 p-2.5 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
                  <BookOpen className="size-6" />
                </div>
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
              <CardTitle className="mt-3 text-lg">General Ledger</CardTitle>
              <CardDescription>
                Inspect detailed transaction movements, debits, credits, and running account balances.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              View account statements →
            </CardContent>
          </Card>
        </Link>

        {/* Journal Entries */}
        <Link to="/accounting/journal" className="group">
          <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                  <FileSpreadsheet className="size-6" />
                </div>
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
              <CardTitle className="mt-3 text-lg">Journal Entries</CardTitle>
              <CardDescription>
                Review posted double-entry journal vouchers, draft entries, and reversal history.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              Manage journal vouchers →
            </CardContent>
          </Card>
        </Link>

        {/* Chart of Accounts */}
        <Link to="/accounting/chart" className="group">
          <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400">
                  <ListTree className="size-6" />
                </div>
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
              <CardTitle className="mt-3 text-lg">Chart of Accounts</CardTitle>
              <CardDescription>
                Manage the hierarchical structure of Assets, Liabilities, Equity, Revenue, and Expenses.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              Explore account hierarchy →
            </CardContent>
          </Card>
        </Link>

        {/* Currencies & Rates */}
        <Link to="/accounting/currencies" className="group">
          <Card className="h-full transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                  <Coins className="size-6" />
                </div>
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
              </div>
              <CardTitle className="mt-3 text-lg">Currencies</CardTitle>
              <CardDescription>
                Configure transactional currencies and track operational exchange rates.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              Manage currencies & rates →
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
