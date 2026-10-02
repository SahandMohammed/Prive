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
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AccountingDashboard() {
  const { t } = useTranslation(['accounting', 'common'])

  return (
    <div className="flex h-full w-full flex-col space-y-6">
      {/* HEADER */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('accounting:dashboard.title')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('accounting:dashboard.description')}
          </p>
        </div>
        <Link to="/accounting/journal/new">
          <Button className="gap-1.5">
            <Plus className="size-4" />
            {t('accounting:dashboard.newJournal')}
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
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary rtl:-scale-x-100" />
              </div>
              <CardTitle className="mt-3 text-lg">{t('accounting:dashboard.trialBalanceCard.title')}</CardTitle>
              <CardDescription>
                {t('accounting:dashboard.trialBalanceCard.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              {t('accounting:dashboard.trialBalanceCard.action')}
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
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary rtl:-scale-x-100" />
              </div>
              <CardTitle className="mt-3 text-lg">{t('accounting:dashboard.generalLedgerCard.title')}</CardTitle>
              <CardDescription>
                {t('accounting:dashboard.generalLedgerCard.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              {t('accounting:dashboard.generalLedgerCard.action')}
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
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary rtl:-scale-x-100" />
              </div>
              <CardTitle className="mt-3 text-lg">{t('accounting:dashboard.journalEntriesCard.title')}</CardTitle>
              <CardDescription>
                {t('accounting:dashboard.journalEntriesCard.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              {t('accounting:dashboard.journalEntriesCard.action')}
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
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary rtl:-scale-x-100" />
              </div>
              <CardTitle className="mt-3 text-lg">{t('accounting:dashboard.chartOfAccountsCard.title')}</CardTitle>
              <CardDescription>
                {t('accounting:dashboard.chartOfAccountsCard.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              {t('accounting:dashboard.chartOfAccountsCard.action')}
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
                <ArrowUpRight className="size-5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary rtl:-scale-x-100" />
              </div>
              <CardTitle className="mt-3 text-lg">{t('accounting:dashboard.currenciesCard.title')}</CardTitle>
              <CardDescription>
                {t('accounting:dashboard.currenciesCard.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs font-medium text-primary">
              {t('accounting:dashboard.currenciesCard.action')}
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
